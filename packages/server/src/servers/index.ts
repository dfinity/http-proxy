import {
  Certificate,
  CertificateFactory,
  EventMessage,
  IPCClient,
  IPCServer,
  logger,
  wait,
} from '@dfinity/http-proxy-core';
import { MissingCertificateError, MissingRequirementsError } from '~src/errors';
import { DaemonProcess } from '~src/servers/daemon';
import {
  IsRunningMessageResponse,
  IsStartedMessageResponse,
  MessageResponse,
  MessageType,
  ProxyServersOptions,
  StopMessageResponse,
} from '~src/servers/typings';
import { ICPServer } from './icp';
import { NetProxy } from './net';
import { ProxyConfigurationServer } from '~src/servers/config';

export * from './typings';

export class ProxyServers {
  private icpServer!: ICPServer;
  private netServer!: NetProxy;
  private ipcServer!: IPCServer;
  private proxyConfigServer!: ProxyConfigurationServer;
  private isEnabled = false;
  private shuttingDown = false;
  private inflighMessages = new Map<string, Promise<unknown>>();
  private static rootCARenewJobIntervalMs = 1000 * 60 * 30; // 30min

  private certificates: {
    ca?: Certificate;
    proxy?: Certificate;
  } = {};

  private constructor(
    private readonly configs: ProxyServersOptions,
    private readonly certificateFactory: CertificateFactory,
    private readonly daemon: DaemonProcess
  ) {}

  public async start(): Promise<void> {
    await this.ipcServer.start();
    await this.icpServer.start();
    await this.netServer.start();
    await this.proxyConfigServer.start();

    if (this.configs?.autoEnable) {
      await this.enableSecureEnvironment();
    }
  }

  private async registerRenewRootCAJob(): Promise<void> {
    await wait(ProxyServers.rootCARenewJobIntervalMs);

    if (!this.certificates.ca?.shouldRenew) {
      this.registerRenewRootCAJob();
      return;
    }

    this.certificates.ca = await this.certificateFactory.create(
      { type: 'ca' },
      true
    );

    if (this.isEnabled) {
      await this.enableSecureEnvironment(true).catch((e) => {
        logger.error(`failed to enable proxy with renewed root ca with(${e})`);

        this.isEnabled = false;
      });
    }

    this.registerRenewRootCAJob();
  }

  private async enableSecureEnvironment(force?: boolean): Promise<void> {
    if (this.isEnabled && !force) {
      return;
    }

    // the daemon process is started with admin privileges to
    // update the required system configurations such as adding/removing
    // http(s) proxy servers and trusted certificate store
    await this.daemon.start();

    if (!this.certificates.ca) {
      throw new MissingCertificateError('ca');
    }

    const rootCAId = this.certificates.ca.id;
    const caCertPath = this.certificateFactory.store.certificatePath(rootCAId);
    const enabledProxyResult = await this.daemon.enableProxy({
      certificate: {
        commonName: this.configs.certificate.rootca.commonName,
        path: caCertPath,
      },
      proxy: {
        host: this.configs.netServer.host,
        port: this.configs.netServer.port,
      },
      pac: {
        host: this.configs.proxyConfigServer.host,
        port: this.configs.proxyConfigServer.port,
      },
    });

    if (!enabledProxyResult.processed) {
      throw new MissingRequirementsError(
        `Failed to enable proxy(${enabledProxyResult.err})`
      );
    }

    this.isEnabled = true;
  }

  public async shutdown(): Promise<void> {
    this.shuttingDown = true;

    logger.info('Proxy is shutting down.');

    await this.daemon.shutdown();
    await this.proxyConfigServer.shutdown();
    await this.netServer.shutdown();
    await this.icpServer.shutdown();
    await this.ipcServer.shutdown();

    this.isEnabled = false;

    logger.info('Proxy has exited.');

    process.exit(0);
  }

  private async setupRequirements(): Promise<boolean> {
    this.certificates.ca = await this.certificateFactory.create({ type: 'ca' });
    this.certificates.proxy = await this.certificateFactory.create({
      type: 'domain',
      hostname: 'localhost',
      ca: this.certificates.ca,
    });

    this.registerRenewRootCAJob();

    return true;
  }

  public static async create(
    configs: ProxyServersOptions
  ): Promise<ProxyServers> {
    const certificateFactory = await CertificateFactory.build(
      configs.certificate
    );
    const daemonIpcClient = new IPCClient({ path: configs.ipcChannels.daemon });
    const servers = new ProxyServers(
      configs,
      certificateFactory,
      new DaemonProcess(daemonIpcClient)
    );

    const requirementsReady = await servers.setupRequirements();
    if (!requirementsReady) {
      throw new MissingRequirementsError();
    }

    await servers.initServers();

    return servers;
  }

  private async handleIsRunningMessage(): Promise<IsRunningMessageResponse> {
    return { running: this.isEnabled };
  }

  private async handleStopMessage(): Promise<StopMessageResponse> {
    await this.shutdown();
  }

  private async handleIsStartedMessage(): Promise<IsStartedMessageResponse> {
    return { isShuttingDown: this.shuttingDown };
  }

  private async handleEnableMessage(): Promise<void> {
    const inflight = this.inflighMessages.get(MessageType.Enable);
    if (inflight) {
      return inflight as Promise<void>;
    }

    const processing = this.enableSecureEnvironment();
    this.inflighMessages.set(MessageType.Enable, processing);

    await processing.finally(() => {
      this.inflighMessages.delete(MessageType.Enable);
    });
  }

  private async initServers(): Promise<void> {
    this.proxyConfigServer = await ProxyConfigurationServer.create({
      host: this.configs.proxyConfigServer.host,
      port: this.configs.proxyConfigServer.port,
      proxyServer: {
        host: this.configs.netServer.host,
        port: this.configs.netServer.port,
      },
    });

    this.ipcServer = await IPCServer.create({
      path: this.configs.ipcChannels.proxy,
      onMessage: async (event: EventMessage): Promise<MessageResponse> => {
        switch (event.type) {
          case MessageType.IsRunning:
            return await this.handleIsRunningMessage();
          case MessageType.Stop:
            return await this.handleStopMessage();
          case MessageType.IsStarted:
            return await this.handleIsStartedMessage();
          case MessageType.Enable:
            return await this.handleEnableMessage();
        }
      },
    });

    this.netServer = NetProxy.create({
      host: this.configs.netServer.host,
      port: this.configs.netServer.port,
      icpServer: {
        host: this.configs.icpServer.host,
        port: this.configs.icpServer.port,
      },
    });

    if (!this.certificates.proxy) {
      throw new MissingCertificateError('proxy');
    }

    this.icpServer = ICPServer.create({
      host: this.configs.icpServer.host,
      port: this.configs.icpServer.port,
      certificate: {
        default: this.certificates.proxy,
        create: async (servername): Promise<Certificate> => {
          if (!this.certificates.ca) {
            throw new MissingCertificateError('ca');
          }

          return await this.certificateFactory.create({
            type: 'domain',
            hostname: servername,
            ca: this.certificates.ca,
          });
        },
      },
    });
  }
}
