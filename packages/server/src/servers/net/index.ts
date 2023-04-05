import net from 'net';
import { MissingConnectionHostError } from '~src/errors';
import { lookupIcDomain } from '../icp/domains';
import { ConnectionInfo, NetProxyOpts, ServerInfo } from './typings';
import { logger } from '@dfinity/http-proxy-core';

export enum DefaultPorts {
  secure = 443,
  insecure = 80,
}

export class NetProxy {
  private connections = new Set<net.Socket>();

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

  public async shutdown(): Promise<void> {
    logger.info('Shutting down net server.');
    return new Promise<void>((ok) => {
      this.server.close(() => ok());
      this.connections.forEach((socket) => {
        socket.destroy();
      });
    });
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

    this.connections.add(socket);

    socket.on('close', () => {
      socket?.destroy();
      this.connections.delete(socket);
    });

    socket.once('data', async (data) => {
      try {
        const socketData = data.toString();
        const connectionInfo = this.getConnectionInfo(socketData);
        info = connectionInfo;

        const icRequest = await this.shouldHandleAsICPRequest(connectionInfo);

        logger.info(
          icRequest
            ? `Proxying web3 request for ${connectionInfo.host}:${connectionInfo.port}`
            : `Proxying web2 request for ${connectionInfo.host}:${connectionInfo.port}`
        );
        if (icRequest) {
          this.handleInternetComputerConnection(connectionInfo, socket, data);
          return;
        }

        this.connectionPassthrough(
          {
            host: connectionInfo.host,
            port: connectionInfo.port,
          },
          connectionInfo,
          socket,
          data
        );
      } catch (e) {
        logger.error(`Failed to proxy request ${String(e)}`);

        socket.end();
      }
    });

    socket.on('error', (err) => {
      logger.error(
        !info
          ? `Client socket error (${err})`
          : `Client socket error ${info.host}:${info.port} (${err})`
      );

      if ('code' in err && err.code === 'ENOTFOUND') {
        const body =
          'Error: ENOTFOUND - The requested resource could not be found.';
        socket.write(
          'HTTP/1.1 404 Not Found\r\n\r\n' +
            'Server: IC HTTP Proxy\r\n' +
            'Content-Type: text/plain\r\n' +
            'Connection: close\r\n' +
            `Content-Length: ${Buffer.byteLength(body)}\r\n` +
            `\r\n` +
            body
        );
      }
      socket.end();
    });
  }

  private handleInternetComputerConnection(
    connection: ConnectionInfo,
    clientSocket: net.Socket,
    data: Buffer
  ): void {
    if (!connection.secure) {
      const body = 'Page moved permanently';

      clientSocket.write(
        'HTTP/1.1 301 Moved Permanently\r\n' +
          'Server: IC HTTP Proxy\r\n' +
          'Content-Type: text/plain\r\n' +
          'Connection: keep-alive\r\n' +
          `Content-Length: ${Buffer.byteLength(body)}\r\n` +
          `Location: https://${connection.host}\r\n\r\n`
      );
      clientSocket.write(body);
      clientSocket.end();
      return;
    }

    this.connectionPassthrough(
      {
        host: this.opts.icpServer.host,
        port: this.opts.icpServer.port,
      },
      connection,
      clientSocket,
      data
    );
  }

  private connectionPassthrough(
    originServer: ServerInfo,
    connection: ConnectionInfo,
    clientSocket: net.Socket,
    data: Buffer
  ): void {
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
      }
    );

    serverSocket.on('error', (err) => {
      clientSocket.emit('error', err);
    });
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
