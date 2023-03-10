export class UnsupportedCertificateTypeError extends Error {
  constructor() {
    super(`Certificate type not supported.`);

    this.name = this.constructor.name;
  }
}
