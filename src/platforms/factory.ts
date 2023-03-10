import { SupportedPlatforms } from "../commons";
import { UnsupportedPlatformError } from "../errors";
import { MacPlatform } from "./mac";
import { Platform, PlatformBuildConfigs } from "./typings";
import { WindowsPlatform } from "./windows";

export class PlatformFactory {
  public static async create(configs: PlatformBuildConfigs): Promise<Platform> {
    switch (configs.platform) {
      case SupportedPlatforms.MacOSX:
        return new MacPlatform({
          ca: configs.ca,
          proxy: configs.proxy,
        });
      case SupportedPlatforms.Windows:
        return new WindowsPlatform({
          ca: configs.ca,
          proxy: configs.proxy,
        });
      default:
        throw new UnsupportedPlatformError("unknown");
    }
  }
}
