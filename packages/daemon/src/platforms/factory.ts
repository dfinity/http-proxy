import {
  SupportedPlatforms,
  UnsupportedPlatformError,
} from '@dfinity/http-proxy-core';
import { MacPlatform } from './mac';
import { Platform, PlatformBuildConfigs } from './typings';
import { WindowsPlatform } from './windows';
import { LinuxPlatform } from './linux';

export class PlatformFactory {
  public static async create(configs: PlatformBuildConfigs): Promise<Platform> {
    switch (configs.platform) {
      case SupportedPlatforms.MacOSX:
        return new MacPlatform({
          ca: configs.ca,
          proxy: configs.proxy,
          pac: configs.pac,
        });
      case SupportedPlatforms.Windows:
        return new WindowsPlatform({
          ca: configs.ca,
          proxy: configs.proxy,
          pac: configs.pac,
        });
      case SupportedPlatforms.Linux:
        return new LinuxPlatform({
          ca: configs.ca,
          proxy: configs.proxy,
          pac: configs.pac,
        });
      default:
        throw new UnsupportedPlatformError('unknown');
    }
  }
}
