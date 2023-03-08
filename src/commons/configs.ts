import os from "node:os";
import { InitConfiguration, SupportedPlatforms } from "./typings";

const platform = os.platform();

const configuration: InitConfiguration = {
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
  httpServer: {
    host: "127.0.0.1",
    port: 4343,
  },
};

export { configuration };
