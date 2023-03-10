import { SupportedPlatforms } from "../commons";
import { UnsupportedPlatformError } from "../errors";
import { MacPlatform } from "./mac";
import { Platform, PlatformBuildConfigs } from "./typings";

export class PlatformFactory {
  public static async create(configs: PlatformBuildConfigs): Promise<Platform> {
    switch (configs.platform) {
      case SupportedPlatforms.MacOSX:
        return new MacPlatform({
          ca: configs.ca,
          proxy: configs.proxy,
        });
      case SupportedPlatforms.Windows:
        throw new Error("not implemented");
      default:
        throw new UnsupportedPlatformError("unknown");
    }
  }
}
