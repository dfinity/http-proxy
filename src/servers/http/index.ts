import { IncomingMessage, ServerResponse } from "http";
import https from "https";
import { logger } from "src/commons";
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
        key: this.configuration.certificate.default.keyPem,
        cert: this.configuration.certificate.default.pem,
        SNICallback: this.SNICallback.bind(this),
      },
      this.handleRequest.bind(this)
    );
  }

  private async SNICallback(
    servername: string,
    cb: (err: Error | null, ctx?: SecureContext | undefined) => void
  ): Promise<void> {
    logger.info({ servername });
    const domainCertificate = await this.configuration.certificate.create(
      servername
    );
    const ctx = createSecureContext({
      key: domainCertificate.keyPem,
      cert: domainCertificate.pem,
    });

    cb(null, ctx);
  }

  private async handleRequest(
    req: IncomingMessage,
    res: ServerResponse<IncomingMessage> & {
      req: IncomingMessage;
    }
  ): Promise<void> {
    logger.info({ req });
    // todo: implement request response verification
    res.writeHead(502, { "Content-Type": "text/plain" });
    res.end("IC HTTP Server");
  }
}
