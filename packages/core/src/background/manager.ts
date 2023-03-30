import net from 'net';
import { InitConfiguration, getFile, logger } from '../commons';
import {
  BackgroundEventMessage,
  BackgroundEventTypes,
  BackgroundResultMessage,
  SetupSystemMessage,
} from './typings';
import { Platform, PlatformFactory } from '../platforms';
import { CHECK_PROXY_PROCESS_MS } from './utils';
import { ONLINE_DESCRIPTOR as PROXY_ONLINE_DESCRIPTOR } from '../utils';
import findProcess from 'find-process';

export class TaskManager {
  private platform?: Platform;

  private constructor(
    private readonly server: net.Server,
    private readonly configs: InitConfiguration
  ) {}

  public static async create(configs: InitConfiguration): Promise<TaskManager> {
    const server = new TaskManager(net.createServer(), configs);
    await server.init();

    return server;
  }

  private async init(): Promise<void> {
    // setup servers to be used by the operating system
    this.server.addListener('connection', this.onConnection.bind(this));
    this.server.addListener('close', this.onClose.bind(this));

    this.registerProxyShutdownListener();
  }

  public shutdown(): void {
    this.server.close();
  }

  public async start(): Promise<void> {
    return new Promise<void>((ok, err) => {
      const onListenError = (e: Error) => {
        if ('code' in e && e.code === 'EADDRINUSE') {
          this.server.close();
        }

        return err(e);
      };

      this.server.addListener('error', onListenError);

      this.server.listen(
        this.configs.backgroundServer.port,
        this.configs.backgroundServer.host,
        () => {
          this.server.removeListener('error', onListenError);
          this.server.addListener('error', this.onError.bind(this));

          ok();
        }
      );
    });
  }

  private async onConnection(socket: net.Socket): Promise<void> {
    socket.on('data', async (data) => {
      const result: BackgroundResultMessage = { processed: false };

      try {
        const event = JSON.parse(data.toString()) as BackgroundEventMessage;

        logger.info(`⚙️  Processing task: ${event?.type}`);
        switch (event?.type) {
          case BackgroundEventTypes.SetupSystem:
            await this.setupSystemTask(event as SetupSystemMessage);
            break;
        }

        result.processed = true;
      } catch (e) {
        result.processed = false;
        result.err = String(e);
      } finally {
        socket.write(JSON.stringify(result));
        socket.end();
      }
    });

    socket.on('error', (err) => {
      logger.error(`Client socket error(${String(err)})`);
    });
  }

  private async setupSystemTask(message: SetupSystemMessage): Promise<void> {
    this.platform = await PlatformFactory.create({
      platform: this.configs.platform,
      ca: {
        path: message.data.certificatePath,
        commonName: message.data.commonName,
      },
      proxy: {
        host: this.configs.netServer.host,
        port: this.configs.netServer.port,
      },
    });

    await this.platform.attach();
  }

  private async registerProxyShutdownListener(retries = 2): Promise<void> {
    const interval = setInterval(async () => {
      const isRunning = await this.isProxyRunning();
      if (isRunning) {
        retries = 2;
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
      setTimeout(() => process.kill(process.pid, 'SIGINT'), 1000);
    }, CHECK_PROXY_PROCESS_MS);
  }

  private async isProxyRunning(): Promise<boolean> {
    const pid = await getFile(PROXY_ONLINE_DESCRIPTOR, { encoding: 'utf8' });
    if (!pid) {
      return false;
    }

    const info = await findProcess('pid', Number(pid), true);

    return !!info.length;
  }

  private async onClose(): Promise<void> {
    logger.info('Server closed');
  }

  private async onError(err: Error): Promise<void> {
    logger.error(`Server error: (${String(err)})`);
  }
}
