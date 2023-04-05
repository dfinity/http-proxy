import { IncomingMessage, ServerResponse } from 'http';
import https from 'https';
import { CanisterNotFoundError } from '~src/errors';
import { SecureContext, createSecureContext } from 'tls';
import { lookupIcDomain } from './domains';
import { HTTPHeaders, ICPServerOpts } from './typings';
import { convertIncomingMessage, processIcRequest } from './utils';
import { environment } from '~src/commons';
import { logger } from '@dfinity/http-proxy-core';

export class ICPServer {
  private httpsServer!: https.Server;

  private constructor(private readonly configuration: ICPServerOpts) {}

  public static create(configuration: ICPServerOpts): ICPServer {
    const server = new ICPServer(configuration);
    server.init();

    return server;
  }

  public async shutdown(): Promise<void> {
    logger.info('Shutting down icp server.');
    return new Promise<void>((ok) => {
      this.httpsServer.close(() => ok());
    });
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
      const request = await convertIncomingMessage(
        incomingMessage,
        (headers) => {
          const userAgent = headers.get(HTTPHeaders.UserAgent);
          if (userAgent) {
            headers.set(
              HTTPHeaders.UserAgent,
              `${userAgent} ${environment.userAgent}`
            );
          }

          return headers;
        }
      );
      const url = new URL(request.url);
      const canister = await lookupIcDomain(url.hostname);
      if (!canister) {
        throw new CanisterNotFoundError(url.hostname);
      }

      const httpResponse = await processIcRequest(canister, request);
      const responseHeaders: { [key: string]: string } = {};
      for (const [headerName, headerValue] of httpResponse.headers.entries()) {
        responseHeaders[headerName] = headerValue;
      }
      responseHeaders[
        HTTPHeaders.ContentLength.toString()
      ] = `${httpResponse.body.length}`;
      responseHeaders.Server = 'IC HTTP Proxy';
      responseHeaders.Connection = 'close';

      res.writeHead(httpResponse.status, responseHeaders);
      res.end(httpResponse.body);
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
