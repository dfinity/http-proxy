import { logger } from '@dfinity/http-proxy-core';
import http from 'http';
import { ProxyConfigOpts } from './typings';

export class ProxyConfigurationServer {
  private constructor(
    private readonly server: http.Server,
    private readonly opts: ProxyConfigOpts
  ) {}

  public static create(opts: ProxyConfigOpts): ProxyConfigurationServer {
    const server = new ProxyConfigurationServer(http.createServer(), opts);
    server.init();

    return server;
  }

  private init(): void {
    this.server.on('close', this.onClose.bind(this));
    this.server.on('request', (req, res) => {
      res.statusCode = 200;
      res.setHeader('Content-Type', 'text/plain');
      // use the proxy for all http and https requests,
      // if the proxy server goes down fallback to a direct connection
      res.end(
        `function FindProxyForURL(url, host) {
          if (url.startsWith("https:") || url.startsWith("http:")) {
            return "PROXY ${this.opts.proxyServer.host}:${this.opts.proxyServer.port}; DIRECT";
          }
 
          return "DIRECT";
        }`.trim()
      );
    });
  }

  public async shutdown(): Promise<void> {
    logger.info('Shutting down proxy configuration server.');
    return new Promise<void>((ok) => this.server.close(() => ok()));
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

  private async onClose(): Promise<void> {
    logger.info('Client disconnected');
  }

  private async onError(err: Error): Promise<void> {
    logger.error(`NetProxy error: (${String(err)})`);
  }
}
