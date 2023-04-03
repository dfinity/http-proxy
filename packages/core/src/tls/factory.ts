import { pki } from 'node-forge';
import { UnsupportedCertificateTypeError } from '../errors';
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

  async create(opts: CreateCertificateOpts): Promise<Certificate> {
    switch (opts.type) {
      case 'ca':
        return this.createRootCA();
      case 'domain':
        return this.createHostCertificate(opts.hostname, opts.ca);
      default:
        throw new UnsupportedCertificateTypeError();
    }
  }

  private async createRootCA(caId = 'ca'): Promise<Certificate> {
    const id = `root_${caId}`;
    const current = await this.store.find(id);
    if (current) {
      return current;
    }

    const keyPair = await generateKeyPair();
    const pem = await generateCertificate({
      publicKey: keyPair.publicKey,
      signingKey: keyPair.privateKey,
      issuer: [...this.issuer],
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

    return certificate;
  }

  private async createHostCertificate(
    hostname: string,
    ca: Certificate
  ): Promise<Certificate> {
    const id = `${this.configuration.storage.hostPrefix}_${hostname}`;
    const current = await this.store.find(id);
    if (current) {
      return current;
    }

    const keyPair = await generateKeyPair();
    const caCert = ca.info;

    const pem = await generateCertificate({
      publicKey: keyPair.publicKey,
      signingKey: ca.key,
      issuer: caCert.subject.attributes,
      subject: [
        { name: 'commonName', value: hostname },
        {
          name: 'organizationName',
          value: `${this.configuration.rootca.organizationName} (${hostname})`,
        },
        { shortName: 'OU', value: this.configuration.rootca.organizationUnit },
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
  }
}
