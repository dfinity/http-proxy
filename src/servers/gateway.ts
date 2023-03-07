import { InitConfiguration, SupportedPlatforms } from "src/commons";
import {
  MissingProxyCertificateError,
  MissingRequirementsError,
  UnsupportedPlatformError,
} from "src/errors";
import { Certificate, CertificateFactory } from "src/tls";
import { HTTPServer } from "./http";

export class Gateway {
  private httpsServer!: HTTPServer;

  private certificates: {
    ca?: Certificate;
    proxy?: Certificate;
  } = {};

  private constructor(
    private readonly configs: InitConfiguration,
    private readonly certificateFactory: CertificateFactory
  ) {}

  public async start(): Promise<void> {
    await this.httpsServer.start();
  }

  public isSupportedPlatform(): boolean {
    return Object.values(SupportedPlatforms).some(
      (supported) => supported === this.configs.platform
    );
  }

  private async setupRequirements(): Promise<boolean> {
    this.certificates.ca = await this.certificateFactory.create({ type: "ca" });
    this.certificates.proxy = await this.certificateFactory.create({
      type: "domain",
      hostname: "localhost",
      ca: this.certificates.ca,
    });

    return true;
  }

  public static async create(configs: InitConfiguration): Promise<Gateway> {
    const gateway = new Gateway(
      configs,
      new CertificateFactory(configs.certificate)
    );

    if (!gateway.isSupportedPlatform()) {
      throw new UnsupportedPlatformError(configs.platform);
    }

    const requirementsReady = await gateway.setupRequirements();
    if (!requirementsReady) {
      throw new MissingRequirementsError();
    }

    if (!gateway.certificates.proxy) {
      throw new MissingProxyCertificateError();
    }

    gateway.httpsServer = HTTPServer.create({
      host: configs.httpServer.host,
      port: configs.httpServer.port,
      certificate: gateway.certificates.proxy,
    });

    return gateway;
  }
}
