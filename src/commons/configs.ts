import os from 'node:os';
import { InitConfiguration, SupportedPlatforms } from './typings';
import { dirname, resolve } from 'node:path';

const platform = os.platform();

const isTaskManager = !!process.env.TASK_MANAGER;
const rootPath = !isTaskManager
  ? dirname(require.main?.filename ?? process.cwd())
  : resolve(dirname(require.main?.filename ?? process.cwd()), '..');

const envConfigs: InitConfiguration = {
  isTaskManager: isTaskManager,
  rootPath: dirname(require.main?.filename ?? process.cwd()),
  dataPath: resolve(rootPath, '..', 'data'),
  platform,
  macosx: platform === SupportedPlatforms.MacOSX,
  windows: platform === SupportedPlatforms.Windows,
  certificate: {
    storage: {
      folder: 'certs',
      hostPrefix: 'host',
    },
    rootca: {
      commonName: 'Internet Computer Root Authority',
      organizationName: 'Internet Computer',
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
  backgroundServer: {
    host: '127.0.0.1',
    port: 4052,
  },
};

export { envConfigs };
