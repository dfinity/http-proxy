import { SupportedPlatforms } from '../commons';

const supported = Object.values(SupportedPlatforms).join(',');

export class UnsupportedPlatformError extends Error {
  constructor(platform: string) {
    super(
      `The current platform(${platform}) is not supported. Please use one of the following supported platforms(${supported})`
    );

    this.name = this.constructor.name;
  }
}
