export class CanisterNotFoundError extends Error {
  constructor(host: string) {
    super(`Canister not found for ${host}`);

    this.name = this.constructor.name;
  }
}
