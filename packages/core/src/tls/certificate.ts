import { pki } from 'node-forge';
import { CertificateDTO, CertificateOpts } from './typings';

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

  get shouldRenew(): boolean {
    // 10min is added as a buffer to prevent almost expired certificates from being sent back
    const expireAt = new Date(Date.now() - 600000);

    return this.info.validity.notAfter.getTime() <= expireAt.getTime();
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

  public toString(): string {
    return JSON.stringify({
      id: this.id,
      key: this.key,
      publicKey: this.publicKey,
      pem: this.pem,
    });
  }
}
