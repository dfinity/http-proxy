import { existsSync, mkdirSync } from 'node:fs';
import os from 'node:os';
import { join, resolve } from 'node:path';
import { CoreConfiguration, SupportedPlatforms } from './typings';

const platform = os.platform();

if (!process.env.HOME && !process.env.APPDATA) {
  throw new Error('Missing user data folder');
}

const platformDataFolder =
  process.env.APPDATA ||
  (process.platform === 'darwin'
    ? resolve(String(process.env.HOME), 'Library', 'Preferences')
    : resolve(String(process.env.HOME), '.local', 'share'));

const dataPath = resolve(platformDataFolder, 'dfinity', 'ichttpproxy');

if (!existsSync(dataPath)) {
  mkdirSync(dataPath, { recursive: true });
}

const isMaxOSX = platform === SupportedPlatforms.MacOSX;
const isWindows = platform === SupportedPlatforms.Windows;

const coreConfigs: CoreConfiguration = {
  dataPath,
  platform,
  macosx: isMaxOSX,
  windows: isWindows,
  ipcChannels: {
    daemon: isWindows ? join('\\\\.\\pipe\\', 'daemon_pipe') : '/tmp/ic-http-daemon.sock',
    proxy: isWindows ? join('\\\\.\\pipe\\', 'proxy_pipe') : '/tmp/ic-http-proxy.sock',
  },
  logs: {
    proxy: resolve(dataPath, 'proxy.logs'),
    daemon: resolve(dataPath, 'daemon.logs'),
    ui: resolve(dataPath, 'ui.logs'),
  },
};

export { coreConfigs };
