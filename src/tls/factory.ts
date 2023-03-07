import { CreateCertificateOpts } from "./typings";
import { Certificate } from "./certificate";
import { generateCertificate, generateKeyPair } from "./utils";
import { CertificateConfiguration } from "src/commons";
import { pki } from "node-forge";
import { UnsupportedCertificateTypeError } from "src/errors";

export class CertificateFactory {
  private readonly issuer: pki.CertificateField[];

  constructor(private readonly configuration: CertificateConfiguration) {
    this.issuer = [
      { name: "commonName", value: configuration.commonName },
      { name: "countryName", value: configuration.countryName },
      { shortName: "ST", value: configuration.state },
      { name: "localityName", value: configuration.locality },
      { name: "organizationName", value: configuration.organizationName },
      { shortName: "OU", value: configuration.organizationName },
    ];
  }

  async create(opts: CreateCertificateOpts): Promise<Certificate> {
    switch (opts.type) {
      case "ca":
        return this.createRootCA();
      case "domain":
        return this.createHostCertificate(opts.hostname, opts.ca);
      default:
        throw new UnsupportedCertificateTypeError();
    }
  }

  private async createRootCA(id = "ca"): Promise<Certificate> {
    const keyPair = await generateKeyPair();
    const pem = await generateCertificate({
      publicKey: keyPair.publicKey,
      signingKey: keyPair.privateKey,
      issuer: [...this.issuer],
      // same as issuer since this is self signed
      subject: [...this.issuer],
      extensions: [
        { name: "basicConstraints", cA: true },
        {
          name: "keyUsage",
          keyCertSign: true,
          digitalSignature: true,
          keyEncipherment: true,
        },
        {
          name: "extKeyUsage",
          serverAuth: true,
          clientAuth: true,
          codeSigning: true,
          emailProtection: true,
          timeStamping: true,
        },
        { name: "subjectKeyIdentifier" },
      ],
    });

    return new Certificate(id, {
      key: keyPair.privateKey,
      public: keyPair.publicKey,
      pem,
    });
  }

  private async createHostCertificate(
    hostname: string,
    ca: Certificate
  ): Promise<Certificate> {
    const keyPair = await generateKeyPair();
    const caCert = ca.info;
    const id = `${this.configuration.storage.hostPrefix}:${hostname}`;

    const pem = await generateCertificate({
      publicKey: keyPair.publicKey,
      signingKey: ca.key,
      issuer: caCert.subject.attributes,
      subject: [
        { name: "commonName", value: hostname },
        {
          name: "organizationName",
          value: hostname,
        },
        { shortName: "OU", value: hostname },
        { name: "countryName", value: this.configuration.countryName },
        { shortName: "ST", value: this.configuration.state },
        { name: "localityName", value: this.configuration.locality },
      ],
      extensions: [
        { name: "basicConstraints", cA: false },
        { name: "keyUsage", digitalSignature: true, keyEncipherment: true },
        { name: "extKeyUsage", serverAuth: true },
        { name: "subjectKeyIdentifier" },
        {
          name: "subjectAltName",
          altNames: [
            // https://www.rfc-editor.org/rfc/rfc5280#page-38
            {
              type: 2, // dna name
              value: hostname,
            },
            {
              type: 7, // IP
              ip: "127.0.0.1",
            },
          ],
        },
      ],
    });

    return new Certificate(id, {
      key: keyPair.privateKey,
      public: keyPair.publicKey,
      pem,
    });
  }
}
