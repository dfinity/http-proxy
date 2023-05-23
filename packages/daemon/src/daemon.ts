import {
  EventMessage,
  IPCClient,
  IPCServer,
  logger,
} from '@dfinity/http-proxy-core';
import { Platform, PlatformFactory } from '~src/platforms';
import {
  CHECK_PROXY_PROCESS_MS,
  CHECK_PROXY_RUNNING_RETRIES,
} from '~src/utils';
import {
  DaemonConfiguration,
  EnableProxyMessage,
  MessageType,
  OnMessageResponse,
} from './typings';

export class Daemon {
  private server?: IPCServer;
  private ipcClient?: IPCClient;
  private platform?: Platform;
  private isProxyRunning = false;

  private constructor(private readonly configs: DaemonConfiguration) {}

  public static async create(configs: DaemonConfiguration): Promise<Daemon> {
    const daemon = new Daemon(configs);
    await daemon.init();

    return daemon;
  }

  private async init(): Promise<void> {
    this.ipcClient = new IPCClient({ path: this.configs.ipcChannels.proxy });
    this.server = await IPCServer.create({
      path: this.configs.ipcChannels.daemon,
      onMessage: async (event: EventMessage): Promise<OnMessageResponse> => {
        switch (event.type) {
          case MessageType.EnableProxy:
            return await this.enableProxyTask(event as EnableProxyMessage);
          case MessageType.DisableProxy:
            return await this.disableProxyTask();
          case MessageType.IsProxyEnabled:
            return { enabled: this.isProxyRunning };
        }
      },
    });
  }

  private async enableProxyTask(message: EnableProxyMessage): Promise<void> {
    this.platform = await PlatformFactory.create({
      platform: this.configs.platform,
      ca: {
        path: message.certificatePath,
        commonName: message.commonName,
      },
      proxy: {
        host: message.host,
        port: message.port,
      },
    });

    await this.platform.attach();

    this.isProxyRunning = true;
  }

  private async disableProxyTask(): Promise<void> {
    await this.platform?.detach();

    this.isProxyRunning = false;

    this.shutdown();
  }

  public async start(): Promise<void> {
    await this.server?.start();

    this.registerProxyShutdownListener();
  }

  public async shutdown(signal = 0): Promise<void> {
    logger.info('Shutting down');

    await this.server?.shutdown();

    logger.info('Exited.');

    process.exit(signal);
  }

  // poll the main process to see if it has shutdown or died,
  // if that happens we need to make sure the daemon also shuts down
  private async registerProxyShutdownListener(
    retries = CHECK_PROXY_RUNNING_RETRIES
  ): Promise<void> {
    const interval = setInterval(async () => {
      const isRunning = await this.ipcClient
        ?.sendMessage({ type: 'ping' })
        .then((result) => result.processed)
        .catch(() => false);
      if (isRunning) {
        retries = CHECK_PROXY_RUNNING_RETRIES;
        return;
      }

      // clear current interval when proxy is not running
      clearInterval(interval);

      if (retries > 0) {
        this.registerProxyShutdownListener(--retries);
        return;
      }

      logger.info(
        'Proxy server not running, removing configuration from system'
      );

      await this.platform?.detach();
      // wait until logs are written
      setTimeout(() => this.shutdown(), 1000);
    }, CHECK_PROXY_PROCESS_MS);
  }
}
