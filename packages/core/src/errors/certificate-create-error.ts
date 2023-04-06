export class CertificateCreationFailedError extends Error {
  constructor(error: string) {
    super(`Certificate creation failed(${error})`);

    this.name = this.constructor.name;
  }
}
