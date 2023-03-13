import net from "net";
import { ConnectionInfo, NetProxyOpts, ServerInfo } from "./typings";
import { logger } from "../../commons";
import { MissingConnectionHostError } from "src/errors";

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
    this.server.addListener("connection", this.onConnection.bind(this));
    this.server.addListener("close", this.onClose.bind(this));
  }

  public shutdown(): void {
    this.server.close();
  }

  public async start(): Promise<void> {
    return new Promise<void>((ok, err) => {
      const onListenError = (e: Error) => {
        if ("code" in e && e.code === "EADDRINUSE") {
          this.server.close();
        }

        return err(e);
      };

      this.server.addListener("error", onListenError);

      this.server.listen(this.opts.port, this.opts.host, () => {
        this.server.removeListener("error", onListenError);
        this.server.addListener("error", this.onError.bind(this));

        ok();
      });
    });
  }

  private getConnectionInfo(data: string): ConnectionInfo {
    const isTLSConnection = data.indexOf("CONNECT") !== -1;
    const [host, port] = isTLSConnection
      ? data.split("CONNECT ")?.[1].split(" ")?.[0].split(":")
      : data.split("Host: ")?.[1].split("\r\n")?.[0].split(":");
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
    logger.info("Client Connected To Proxy");
    socket.once("data", async (data) => {
      const socketData = data.toString();
      const connectionInfo = this.getConnectionInfo(socketData);
      const icRequest = await this.shouldHandleAsICPRequest(connectionInfo);
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
    });

    socket.on("error", (err) => {
      logger.error("CLIENT TO PROXY ERROR");
      logger.error(err);
    });
  }

  private async handleInternetComputerConnection(
    connection: ConnectionInfo,
    clientSocket: net.Socket,
    data: Buffer
  ): Promise<void> {
    if (!connection.secure) {
      const body = "Page moved permanently";

      clientSocket.write(
        "HTTP/1.1 301 Moved Permanently\r\n" +
          "Server: IC HTTP Gateway\r\n" +
          "Content-Type: text/plain\r\n" +
          "Connection: keep-alive\r\n" +
          `Content-Length: ${body.length}\r\n` +
          `Location: https://${connection.host}\r\n\n`
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

  private async connectionPassthrough(
    originServer: ServerInfo,
    connection: ConnectionInfo,
    clientSocket: net.Socket,
    data: Buffer
  ): Promise<void> {
    const serverSocket = net.createConnection(
      {
        host: originServer.host,
        port: originServer.port,
      },
      () => {
        console.log("PROXY TO SERVER SET UP");
        if (connection.secure) {
          clientSocket.write("HTTP/1.1 200 Connection established\r\n\r\n");
        } else {
          serverSocket.write(data);
        }

        // Piping the sockets
        clientSocket.pipe(serverSocket);
        serverSocket.pipe(clientSocket);

        serverSocket.on("error", (err) => {
          logger.error("PROXY TO SERVER ERROR");
          logger.error(err);
        });
      }
    );

    serverSocket.on("error", (err) => {
      logger.error("CLIENT TO PROXY ERROR");
      logger.error(err);
    });
  }

  private async shouldHandleAsICPRequest(
    connection: ConnectionInfo
  ): Promise<boolean> {
    if (connection.host === "internetcomputer.org") {
      return true;
    }

    return false;
  }

  private async onClose(): Promise<void> {
    logger.info("Client disconnected");
  }

  private async onError(err: Error): Promise<void> {
    logger.error(`NetProxy error: (${String(err)})`);
  }
}
