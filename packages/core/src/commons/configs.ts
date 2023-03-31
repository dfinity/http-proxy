import os from 'node:os';
import { dirname, resolve } from 'node:path';
import { CoreConfiguration, SupportedPlatforms } from './typings';

const platform = os.platform();

const rootPath = dirname(require.main?.filename ?? process.cwd());

const coreConfigs: CoreConfiguration = {
  rootPath: dirname(require.main?.filename ?? process.cwd()),
  dataPath: resolve(rootPath, '..', 'data'),
  platform,
  macosx: platform === SupportedPlatforms.MacOSX,
  windows: platform === SupportedPlatforms.Windows,
  ipcChannels: {
    daemon: '/tmp/ic-http-daemon.sock',
    proxy: '/tmp/ic-http-proxy.sock',
  },
  certificate: {
    storage: {
      folder: 'certs',
      hostPrefix: 'host',
    },
    rootca: {
      commonName: 'IC HTTP Proxy Root Authority',
      organizationName: 'IC HTTP Proxy',
      organizationUnit: 'IC',
    },
  },
};

export { coreConfigs };
