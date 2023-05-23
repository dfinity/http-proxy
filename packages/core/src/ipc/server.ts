import { rm } from 'node:fs/promises';
import net from 'node:net';
import { logger, pathExists } from '~src/commons';
import { EventMessage, IPCServerOptions, ResultMessage } from './typings';

export class IPCServer {
  private constructor(
    private readonly server: net.Server,
    private readonly options: IPCServerOptions
  ) {}

  public static async create(options: IPCServerOptions): Promise<IPCServer> {
    const server = new IPCServer(net.createServer(), options);

    await server.init();

    return server;
  }

  private async init(): Promise<void> {
    this.server.addListener('connection', this.onConnection.bind(this));
    this.server.addListener('close', this.onClose.bind(this));
  }

  private static writeAndCloseSocket(
    socket: net.Socket,
    result: ResultMessage
  ): void {
    socket.write(JSON.stringify(result));
    socket.end();
  }

  private async onConnection(socket: net.Socket): Promise<void> {
    socket.on('data', async (data) => {
      const result: ResultMessage = { processed: true };

      try {
        const event = JSON.parse(data.toString()) as EventMessage;
        const skipWait = event?.skipWait ?? false;

        if (skipWait) {
          IPCServer.writeAndCloseSocket(socket, result);

          if (event?.type && this.options.onMessage) {
            this.options.onMessage(event);
          }
          return;
        }

        if (event?.type && this.options.onMessage) {
          result.data = await this.options.onMessage(event);

          IPCServer.writeAndCloseSocket(socket, result);
        }
      } catch (e) {
        result.processed = false;
        result.err = String(e);

        IPCServer.writeAndCloseSocket(socket, result);
      }
    });

    socket.on('error', (err) => {
      logger.error(`Client socket error(${String(err)})`);
    });
  }

  private async handleHangingSocket(): Promise<void> {
    const socketPathExists = await pathExists(this.options.path);

    if (socketPathExists) {
      await rm(this.options.path, { force: true });
    }
  }

  public async start(): Promise<void> {
    await this.handleHangingSocket();

    return new Promise<void>((ok, err) => {
      const onListenError = (e: Error) => {
        if ('code' in e && e.code === 'EADDRINUSE') {
          this.server.close();
        }

        return err(e);
      };

      this.server.addListener('error', onListenError);

      this.server.listen(
        {
          path: this.options.path,
          readableAll: true,
          writableAll: true,
        },
        () => {
          this.server.removeListener('error', onListenError);
          this.server.addListener('error', this.onError.bind(this));

          ok();
        }
      );
    });
  }

  public async shutdown(): Promise<void> {
    logger.info('Shutting down ipc server.');

    return new Promise<void>((ok, reject) => {
      this.server.close((err) => {
        if (err) {
          return reject(err);
        }

        return ok();
      });
    });
  }

  private async onClose(): Promise<void> {
    logger.info('IPC server closed');
  }

  private async onError(err: Error): Promise<void> {
    logger.error(`IPC server error: (${String(err)})`);
  }
}
