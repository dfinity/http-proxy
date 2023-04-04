import {
  Certificate,
  CertificateFactory,
  EventMessage,
  IPCClient,
  IPCServer,
  logger,
} from '@dfinity/http-proxy-core';
import { MissingCertificateError, MissingRequirementsError } from '~src/errors';
import { DaemonProcess } from '~src/servers/daemon';
import {
  IsRunningMessageResponse,
  MessageResponse,
  MessageType,
  ProxyServersOptions,
  StopMessageResponse,
} from '~src/servers/typings';
import { ICPServer } from './icp';
import { NetProxy } from './net';

export * from './typings';

export class ProxyServers {
  private icpServer!: ICPServer;
  private netServer!: NetProxy;
  private ipcServer!: IPCServer;
  private isEnabled = false;

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
    });

    if (!enabledProxyResult.processed) {
      throw new MissingRequirementsError(
        `Failed to enable proxy(${enabledProxyResult.err})`
      );
    }

    this.isEnabled = true;
  }

  public shutdown(): void {
    logger.info('Proxy is shutting down.');

    this.netServer.shutdown();
    this.icpServer.shutdown();
    this.ipcServer.shutdown();
    this.daemon.shutdown();

    this.isEnabled = false;

    process.exit(0);
  }

  private async setupRequirements(): Promise<boolean> {
    this.certificates.ca = await this.certificateFactory.create({ type: 'ca' });
    this.certificates.proxy = await this.certificateFactory.create({
      type: 'domain',
      hostname: 'localhost',
      ca: this.certificates.ca,
    });

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
    this.shutdown();
  }

  private async initServers(): Promise<void> {
    this.ipcServer = await IPCServer.create({
      path: this.configs.ipcChannels.proxy,
      onMessage: async (event: EventMessage): Promise<MessageResponse> => {
        switch (event.type) {
          case MessageType.IsRunning:
            return await this.handleIsRunningMessage();
          case MessageType.Stop:
            return await this.handleStopMessage();
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
