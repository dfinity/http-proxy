export class NotAllowedRequestRedirectError extends Error {
  constructor() {
    super(
      'Due to security reasons redirects are blocked on the IC until further notice!'
    );

    this.name = this.constructor.name;
  }
}
