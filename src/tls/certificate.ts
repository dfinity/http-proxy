import { pki } from "node-forge";
import { CertificateDTO, CertificateOpts } from "./typings";

export class Certificate {
  public readonly key: pki.PrivateKey;
  public readonly publicKey: pki.PublicKey;
  public readonly pem: string;

  constructor(
    public readonly id: string,
    public readonly opts: CertificateOpts
  ) {
    this.key = opts.key;
    this.publicKey = opts.public;
    this.pem = opts.pem;
  }

  get keyPem(): string {
    return pki.privateKeyToPem(this.key);
  }

  get publicKeyPem(): string {
    return pki.publicKeyToPem(this.publicKey);
  }

  get info(): pki.Certificate {
    return pki.certificateFromPem(this.pem);
  }

  public toDTO(): CertificateDTO {
    return {
      id: this.id,
      pem: {
        key: this.keyPem,
        publicKey: this.publicKeyPem,
        cert: this.pem,
      },
    };
  }

  public static restore(dto: CertificateDTO): Certificate {
    return new Certificate(dto.id, {
      key: pki.privateKeyFromPem(dto.pem.key),
      public: pki.publicKeyFromPem(dto.pem.publicKey),
      pem: dto.pem.cert,
    });
  }

  toString(): string {
    return JSON.stringify({
      id: this.id,
      key: this.key,
      publicKey: this.publicKey,
      pem: this.pem,
    });
  }
}
