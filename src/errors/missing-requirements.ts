export class MissingRequirementsError extends Error {
  constructor(details?: string) {
    super(
      `Failed to set gateway requirements (${details ? details : "unknown"})`
    );

    this.name = this.constructor.name;
  }
}
