export class MissingProxyCertificateError extends Error {
  constructor() {
    super(`The http proxy certificate is missing`);

    this.name = this.constructor.name;
  }
}
