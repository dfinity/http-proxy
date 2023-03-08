import { InitConfiguration, SupportedPlatforms } from "src/commons";
import {
  MissingCertificateError,
  MissingRequirementsError,
  UnsupportedPlatformError,
} from "src/errors";
import { MacPlatform } from "src/platforms";
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

    if (this.configs.macosx) {
      const certPath = this.certificateFactory.store.certificatePath(
        this.certificates.ca.id
      );
      await MacPlatform.trustCertificate(certPath);
    }

    return true;
  }

  public static async create(configs: InitConfiguration): Promise<Gateway> {
    const certificateFactory = await CertificateFactory.build(
      configs.certificate
    );
    const gateway = new Gateway(configs, certificateFactory);

    if (!gateway.isSupportedPlatform()) {
      throw new UnsupportedPlatformError(configs.platform);
    }

    const requirementsReady = await gateway.setupRequirements();
    if (!requirementsReady) {
      throw new MissingRequirementsError();
    }

    if (!gateway.certificates.proxy) {
      throw new MissingCertificateError("proxy");
    }

    gateway.httpsServer = HTTPServer.create({
      host: configs.httpServer.host,
      port: configs.httpServer.port,
      certificate: {
        default: gateway.certificates.proxy,
        create: async (servername): Promise<Certificate> => {
          if (!gateway.certificates.ca) {
            throw new MissingCertificateError("ca");
          }

          return await gateway.certificateFactory.create({
            type: "domain",
            hostname: servername,
            ca: gateway.certificates.ca,
          });
        },
      },
    });

    return gateway;
  }
}
