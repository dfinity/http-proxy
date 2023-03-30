import { BackgroundProcess } from '~src/background';
import { BackgroundEventTypes } from '~src/background/typings';
import {
  MissingCertificateError,
  MissingRequirementsError,
  UnsupportedPlatformError,
} from '~src/errors';
import { Platform } from '~src/platforms';
import { PlatformFactory } from '~src/platforms/factory';
import { Certificate, CertificateFactory } from '~src/tls';
import { InitConfiguration, SupportedPlatforms, envConfigs } from '../commons';
import { ICPServer } from './icp';
import { NetProxy } from './net';

export class Gateway {
  private icpServer!: ICPServer;
  private netServer!: NetProxy;
  private platform!: Platform;

  private certificates: {
    ca?: Certificate;
    proxy?: Certificate;
  } = {};

  private constructor(
    private readonly configs: InitConfiguration,
    private readonly certificateFactory: CertificateFactory
  ) {}

  public async start(): Promise<void> {
    await this.icpServer.start();
    await this.netServer.start();

    if (!this.certificates.ca) {
      throw new MissingCertificateError('ca');
    }

    // setup servers to be used by the operating system
    const rootCAId = this.certificates.ca.id;
    this.platform = await PlatformFactory.create({
      platform: this.configs.platform,
      ca: {
        path: this.certificateFactory.store.certificatePath(rootCAId),
        commonName: envConfigs.certificate.rootca.commonName,
      },
      proxy: {
        host: this.configs.netServer.host,
        port: this.configs.netServer.port,
      },
    });

    // starts the background task manager (requires admin privileges)
    const taskManager = await BackgroundProcess.init(this.platform);

    // setup the proxy to to work across the operating system
    const platformRequirements = await taskManager.processMessage({
      type: BackgroundEventTypes.SetupSystem,
      data: {
        commonName: envConfigs.certificate.rootca.commonName,
        certificatePath:
          this.certificateFactory.store.certificatePath(rootCAId),
      },
    });

    if (!platformRequirements.processed) {
      throw new MissingRequirementsError(
        `Failed to setup platform requirements(${platformRequirements.err})`
      );
    }
  }

  public async shutdown(): Promise<void> {
    this.netServer.shutdown();
    this.icpServer.shutdown();
  }

  public isSupportedPlatform(): boolean {
    return Object.values(SupportedPlatforms).some(
      (supported) => supported === this.configs.platform
    );
  }

  private async setupRequirements(): Promise<boolean> {
    this.certificates.ca = await this.certificateFactory.create({ type: 'ca' });
    this.certificates.proxy = await this.certificateFactory.create({
      type: 'domain',
      hostname: 'localhost',
      ca: this.certificates.ca,
    });

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
      throw new MissingCertificateError('proxy');
    }

    gateway.netServer = NetProxy.create({
      host: configs.netServer.host,
      port: configs.netServer.port,
      icpServer: {
        host: configs.icpServer.host,
        port: configs.icpServer.port,
      },
    });

    gateway.icpServer = ICPServer.create({
      host: configs.icpServer.host,
      port: configs.icpServer.port,
      certificate: {
        default: gateway.certificates.proxy,
        create: async (servername): Promise<Certificate> => {
          if (!gateway.certificates.ca) {
            throw new MissingCertificateError('ca');
          }

          return await gateway.certificateFactory.create({
            type: 'domain',
            hostname: servername,
            ca: gateway.certificates.ca,
          });
        },
      },
    });

    return gateway;
  }
}
