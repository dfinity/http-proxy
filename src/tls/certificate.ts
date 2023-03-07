import { pki } from "node-forge";
import { CertificateOpts } from "./typings";

export class Certificate {
  public readonly key: pki.PrivateKey;
  public readonly publicKey: pki.PublicKey;
  public readonly pem: string;

  constructor(private readonly id: string, opts: CertificateOpts) {
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

  toString(): string {
    return JSON.stringify({
      id: this.id,
      key: this.key,
      publicKey: this.publicKey,
      pem: this.pem,
    });
  }
}
