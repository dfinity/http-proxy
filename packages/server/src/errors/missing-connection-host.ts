export class MissingConnectionHostError extends Error {
  constructor() {
    super(`The connection is missing the host information`);

    this.name = this.constructor.name;
  }
}
