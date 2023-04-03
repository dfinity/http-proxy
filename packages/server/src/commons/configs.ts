import os from 'os';
import { EnvironmentConfiguration } from './typings';

const environment: EnvironmentConfiguration = {
  platform: os.platform(),
  certificate: {
    storage: {
      folder: 'certs',
      hostPrefix: 'host',
    },
    rootca: {
      commonName: 'IC Proxy CA',
      organizationName: 'IC Proxy',
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
