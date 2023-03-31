import { dirname, resolve } from 'node:path';
import os from 'os';
import { EnvironmentConfiguration } from './typings';

const rootPath = dirname(require.main?.filename ?? process.cwd());

const environment: EnvironmentConfiguration = {
  platform: os.platform(),
  rootPath: rootPath,
  dataPath: resolve(rootPath, '..', 'data'),
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
  netServer: {
    host: '127.0.0.1',
    port: 4050,
  },
  icpServer: {
    host: '127.0.0.1',
    port: 4051,
  },
};

export { environment };
