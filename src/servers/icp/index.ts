import { IncomingMessage, ServerResponse } from 'http';
import https from 'https';
import { CanisterNotFoundError } from 'src/errors';
import { SecureContext, createSecureContext } from 'tls';
import { lookupIcDomain } from './domains';
import { HTTPHeaders, ICPServerOpts } from './typings';
import { convertIncomingMessage, processIcRequest } from './utils';

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
    incomingMessage: IncomingMessage,
    res: ServerResponse<IncomingMessage> & {
      req: IncomingMessage;
    }
  ): Promise<void> {
    try {
      const request = await convertIncomingMessage(incomingMessage);
      const url = new URL(request.url);
      const canister = await lookupIcDomain(url.hostname);
      if (!canister) {
        throw new CanisterNotFoundError(url.hostname);
      }

      const response = await processIcRequest(canister, request);
      const responseBody = await response.text();
      const responseHeaders: { [key: string]: string } = {};
      for (const [headerName, headerValue] of response.headers.entries()) {
        responseHeaders[headerName] = headerValue;
      }
      const contentLength = Buffer.byteLength(responseBody);
      responseHeaders[
        HTTPHeaders.ContentLength.toString()
      ] = `${contentLength}`;
      responseHeaders.Server = 'IC HTTP Proxy';
      responseHeaders.Connection = 'close';

      res.writeHead(response.status, response.statusText, responseHeaders);
      res.end(responseBody);
    } catch (e) {
      const responseBody = `Proxy failed to handle internet computer request ${e}`;
      const bodyLength = Buffer.byteLength(responseBody);

      res.writeHead(500, {
        'Content-Type': 'text/plain',
        [HTTPHeaders.ContentLength]: bodyLength,
        Server: 'IC HTTP Proxy',
        Connection: 'close',
      });
      res.end(responseBody);
    }
  }
}
