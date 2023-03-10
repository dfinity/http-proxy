export class MissingCertificateError extends Error {
  constructor(certName: string) {
    super(`The tls certificate for the ${certName} is missing`);

    this.name = this.constructor.name;
  }
}
