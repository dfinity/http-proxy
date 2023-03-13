import { IncomingMessage, ServerResponse } from 'http';
import https from 'https';
import { SecureContext, createSecureContext } from 'tls';
import { ICPServerOpts } from './typings';

export class ICPServer {
  private httpsServer!: https.Server;

  private constructor(private readonly configuration: ICPServerOpts) {}

  public static create(configuration: ICPServerOpts): ICPServer {
    const server = new ICPServer(configuration);
    server.init();

    return server;
  }

  public shutdown(): void {
    this.httpsServer.close();
  }

  public async start(): Promise<void> {
    this.httpsServer.listen(this.configuration.port, this.configuration.host);
  }

  private init(): void {
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
    // todo: implement request response verification
    res.writeHead(200, { 'Content-Type': 'text/plain' });
    res.write('IC HTTP Server');
    res.end();
  }
}
