export class MissingRequirementsError extends Error {
  constructor() {
    super(`Failed to set gateway requirements`);

    this.name = this.constructor.name;
  }
}
