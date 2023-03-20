import net from 'net';
import { MissingConnectionHostError } from 'src/errors';
import { logger } from '../../commons';
import { lookupIcDomain } from '../icp/domains';
import { ConnectionInfo, NetProxyOpts, ServerInfo } from './typings';

export enum DefaultPorts {
  secure = 443,
  insecure = 80,
}

export class NetProxy {
  private constructor(
    private readonly server: net.Server,
    private readonly opts: NetProxyOpts
  ) {}

  public static create(opts: NetProxyOpts): NetProxy {
    const proxy = new NetProxy(net.createServer(), opts);
    proxy.init();

    return proxy;
  }

  private init(): void {
    this.server.on('connection', this.onConnection.bind(this));
    this.server.on('close', this.onClose.bind(this));
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

      this.server.listen(this.opts.port, this.opts.host, () => {
        this.server.removeListener('error', onListenError);
        this.server.addListener('error', this.onError.bind(this));

        ok();
      });
    });
  }

  private getConnectionInfo(data: string): ConnectionInfo {
    const isTLSConnection = data.indexOf('CONNECT') !== -1;
    const info = isTLSConnection
      ? data.split('CONNECT ')?.[1]?.split(' ')?.[0]?.split(':')
      : data.split('Host: ')?.[1]?.split('\r\n')?.[0]?.split(':');
    const [host, port] = info ?? [];
    const defaultPort = isTLSConnection
      ? DefaultPorts.secure
      : DefaultPorts.insecure;

    if (!host) {
      throw new MissingConnectionHostError();
    }

    return {
      host,
      port: port ? Number(port) : defaultPort,
      secure: isTLSConnection,
    };
  }

  private async onConnection(socket: net.Socket): Promise<void> {
    let info: ConnectionInfo | undefined;

    socket.once('data', async (data) => {
      const socketData = data.toString();
      const connectionInfo = this.getConnectionInfo(socketData);
      info = connectionInfo;

      logger.info(
        `Proxying request for ${connectionInfo.host}:${connectionInfo.port}`
      );

      const icRequest = await this.shouldHandleAsICPRequest(connectionInfo);
      if (icRequest) {
        await this.handleInternetComputerConnection(
          connectionInfo,
          socket,
          data
        );
        return;
      }

      await this.connectionPassthrough(
        {
          host: connectionInfo.host,
          port: connectionInfo.port,
        },
        connectionInfo,
        socket,
        data
      );
    });

    socket.on('error', (err) => {
      logger.error(
        !info
          ? `Client socket error (${err})`
          : `Client socket error ${info.host}:${info.port} (${err})`
      );
    });
  }

  private async handleInternetComputerConnection(
    connection: ConnectionInfo,
    clientSocket: net.Socket,
    data: Buffer
  ): Promise<void> {
    if (!connection.secure) {
      const body = 'Page moved permanently';

      clientSocket.write(
        'HTTP/1.1 301 Moved Permanently\r\n' +
          'Server: IC HTTP Gateway\r\n' +
          'Content-Type: text/plain\r\n' +
          'Connection: keep-alive\r\n' +
          `Content-Length: ${Buffer.byteLength(body)}\r\n` +
          `Location: https://${connection.host}\r\n\r\n`
      );
      clientSocket.write(body);
      clientSocket.end();
      return;
    }

    await this.connectionPassthrough(
      {
        host: this.opts.icpServer.host,
        port: this.opts.icpServer.port,
      },
      connection,
      clientSocket,
      data
    );
  }

  private async connectionPassthrough(
    originServer: ServerInfo,
    connection: ConnectionInfo,
    clientSocket: net.Socket,
    data: Buffer
  ): Promise<void> {
    const serverSocket = net.connect(
      {
        host: originServer.host,
        port: originServer.port,
      },
      () => {
        if (connection.secure) {
          clientSocket.write(
            'HTTP/1.1 200 Connection established\r\n' +
              'Proxy-agent: Internet Computer Proxy\r\n' +
              '\r\n'
          );
        } else {
          serverSocket.write(data);
        }

        // Piping the sockets
        serverSocket.pipe(clientSocket);
        clientSocket.pipe(serverSocket);

        serverSocket.on('error', (err) => {
          logger.error(`Passthrough server socket error (${err})`);
        });
      }
    );
  }

  private async shouldHandleAsICPRequest(
    connection: ConnectionInfo
  ): Promise<boolean> {
    const canister = await lookupIcDomain(connection.host).catch((err) => {
      logger.error(
        `Failed to query dns record of ${connection.host} with ${err}`
      );

      return null;
    });

    return canister !== null ? true : false;
  }

  private async onClose(): Promise<void> {
    logger.info('Client disconnected');
  }

  private async onError(err: Error): Promise<void> {
    logger.error(`NetProxy error: (${String(err)})`);
  }
}
