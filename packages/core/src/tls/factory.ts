import { pki } from 'node-forge';
import { retryClosure } from '~src/commons';
import {
  CertificateCreationFailedError,
  UnsupportedCertificateTypeError,
} from '../errors';
import { Certificate } from './certificate';
import { CertificateStore } from './store';
import { CertificateConfiguration, CreateCertificateOpts } from './typings';
import { generateCertificate, generateKeyPair } from './utils';

export class CertificateFactory {
  private readonly issuer: pki.CertificateField[];
  public store!: CertificateStore;

  private constructor(
    private readonly configuration: CertificateConfiguration
  ) {
    this.issuer = [
      { name: 'commonName', value: configuration.rootca.commonName },
      {
        name: 'organizationName',
        value: configuration.rootca.organizationName,
      },
      { shortName: 'OU', value: configuration.rootca.organizationUnit },
    ];
  }

  public static async build(
    configuration: CertificateConfiguration
  ): Promise<CertificateFactory> {
    const factory = new CertificateFactory(configuration);
    await factory.init();

    return factory;
  }

  private async init(): Promise<void> {
    this.store = await CertificateStore.create({
      folder: this.configuration.storage.folder,
    });
  }

  async create(
    opts: CreateCertificateOpts,
    renew?: boolean
  ): Promise<Certificate> {
    try {
      let certificate: Certificate;
      switch (opts.type) {
        case 'ca':
          certificate = await this.createRootCA('ca', renew);
          break;
        case 'domain':
          certificate = await this.createHostCertificate(
            opts.hostname,
            opts.ca,
            renew
          );
          break;
        default:
          throw new UnsupportedCertificateTypeError();
      }

      return certificate;
    } catch (e) {
      throw new CertificateCreationFailedError(String(e));
    }
  }

  private async createRootCA(
    caId = 'ca',
    renew?: boolean
  ): Promise<Certificate> {
    const id = `root_${caId}`;

    return retryClosure<Certificate>(
      async () => {
        const current = await this.store.find(id);
        if (current && !renew) {
          return current;
        }

        const keyPair = await generateKeyPair();
        const pem = await generateCertificate({
          publicKey: keyPair.publicKey,
          signingKey: keyPair.privateKey,
          issuer: [...this.issuer],
          serialId: await this.store.nextSerialId(),
          // same as issuer since this is self signed
          subject: [...this.issuer],
          extensions: [
            { name: 'basicConstraints', cA: true, critical: true },
            {
              name: 'keyUsage',
              keyCertSign: true,
              digitalSignature: true,
              keyEncipherment: true,
            },
            {
              name: 'extKeyUsage',
              serverAuth: true,
              clientAuth: true,
              codeSigning: true,
              emailProtection: true,
              timeStamping: true,
            },
            { name: 'subjectKeyIdentifier' },
          ],
        });

        const certificate = new Certificate(id, {
          key: keyPair.privateKey,
          public: keyPair.publicKey,
          pem,
        });

        await this.store.save(certificate);
        await this.renewHostCertificates(certificate);

        return certificate;
      },
      async () => this.store.delete(id),
      this.configuration.creationRetries
    );
  }

  private async renewHostCertificates(ca: Certificate): Promise<void> {
    const hostPrefix = `${this.configuration.storage.hostPrefix}_`;
    const hostnames = this.store
      .getIssuedCertificatesIds()
      .filter((file) => file.startsWith(hostPrefix))
      .map((file) => file.replace(hostPrefix, ''));

    for (const hostname of hostnames) {
      await this.createHostCertificate(hostname, ca, true);
    }
  }

  private async createHostCertificate(
    hostname: string,
    ca: Certificate,
    renew?: boolean
  ): Promise<Certificate> {
    const id = `${this.configuration.storage.hostPrefix}_${hostname}`;

    return retryClosure<Certificate>(
      async () => {
        const current = await this.store.find(id);
        if (current && !renew) {
          return current;
        }

        const keyPair = await generateKeyPair();
        const caCert = ca.info;

        const pem = await generateCertificate({
          publicKey: keyPair.publicKey,
          signingKey: ca.key,
          issuer: caCert.subject.attributes,
          serialId: await this.store.nextSerialId(),
          subject: [
            { name: 'commonName', value: hostname },
            {
              name: 'organizationName',
              value: `${this.configuration.rootca.organizationName} (${hostname})`,
            },
            {
              shortName: 'OU',
              value: this.configuration.rootca.organizationUnit,
            },
          ],
          extensions: [
            { name: 'basicConstraints', cA: false, critical: true },
            {
              name: 'keyUsage',
              digitalSignature: true,
              keyEncipherment: true,
            },
            { name: 'extKeyUsage', serverAuth: true },
            { name: 'subjectKeyIdentifier' },
            {
              name: 'subjectAltName',
              altNames: [
                // https://www.rfc-editor.org/rfc/rfc5280#page-38
                {
                  type: 2, // dns name
                  value: hostname,
                },
                {
                  type: 7, // IP
                  ip: '127.0.0.1',
                },
              ],
            },
          ],
        });

        const certificate = new Certificate(id, {
          key: keyPair.privateKey,
          public: keyPair.publicKey,
          pem,
        });

        await this.store.save(certificate);

        return certificate;
      },
      async () => this.store.delete(id),
      this.configuration.creationRetries
    );
  }
}
