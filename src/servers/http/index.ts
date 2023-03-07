import { IncomingMessage, ServerResponse } from "http";
import https from "https";
import { SecureContext, createSecureContext } from "tls";
import { HTTPServerOpts } from "./typings";

export class HTTPServer {
  private httpsServer!: https.Server;

  private constructor(private readonly configuration: HTTPServerOpts) {}

  public static create(configuration: HTTPServerOpts): HTTPServer {
    const server = new HTTPServer(configuration);
    server.initHttpsServer();

    return server;
  }

  public async start(): Promise<void> {
    this.httpsServer.listen(this.configuration.port, this.configuration.host);
  }

  private initHttpsServer(): void {
    this.httpsServer = https.createServer(
      {
        key: this.configuration.certificate.keyPem,
        cert: this.configuration.certificate.pem,
        SNICallback: this.SNICallback.bind(this),
      },
      this.handleRequest.bind(this)
    );
  }

  private async SNICallback(
    _servername: string,
    cb: (err: Error | null, ctx?: SecureContext | undefined) => void
  ): Promise<void> {
    // todo: create certificate for servername
    const ctx = createSecureContext({
      key: this.configuration.certificate.keyPem,
      cert: this.configuration.certificate.pem,
    });

    cb(null, ctx);
  }

  private async handleRequest(
    req: IncomingMessage,
    res: ServerResponse<IncomingMessage> & {
      req: IncomingMessage;
    }
  ): Promise<void> {
    // todo: implement request response verification
    res.writeHead(502, { "Content-Type": "text/plain" });
    res.end("IC HTTP Server");
  }
}
