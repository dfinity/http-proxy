import os from "node:os";
import { InitConfiguration, SupportedPlatforms } from "./typings";
import { resolve } from "node:path";

const platform = os.platform();

const envConfigs: InitConfiguration = {
  isBackgroundControllerProcess: !!process.env.BACKGROUND_CONTROLLER,
  dataPath: resolve(process.env.INIT_CWD ?? ".", "data"),
  platform,
  macosx: platform === SupportedPlatforms.MacOSX,
  windows: platform === SupportedPlatforms.Windows,
  certificate: {
    countryName: "CH",
    state: "Zurich",
    locality: "Zurich",
    organizationName: "IC HTTP Gateway CA",
    commonName: "IC HTTP Gateway CA",
    storage: {
      folder: "certs",
      hostPrefix: "host",
    },
  },
  netServer: {
    host: "127.0.0.1",
    port: 4050,
  },
  icpServer: {
    host: "127.0.0.1",
    port: 4051,
  },
  backgroundServer: {
    host: "127.0.0.1",
    port: 4052,
  },
};

export { envConfigs };
