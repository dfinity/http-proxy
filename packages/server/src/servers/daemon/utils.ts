import {
  SupportedPlatforms,
  UnsupportedPlatformError,
  execAsync,
} from '@dfinity/http-proxy-core';

export const WAIT_UNTIL_ACTIVE_MS = 10000;
export const WAIT_INTERVAL_CHECK_MS = 250;

export const daemonBinPath = async (platform: string): Promise<string> => {
  switch (platform) {
    case SupportedPlatforms.MacOSX:
      return require
        .resolve('@dfinity/http-proxy-daemon/bin/http-proxy-daemon-macos')
        .replace('.asar', '.asar.unpacked');
    case SupportedPlatforms.Windows:
      return require
        .resolve('@dfinity/http-proxy-daemon/bin/http-proxy-daemon-win.exe')
        .replace('.asar', '.asar.unpacked');
    default:
      throw new UnsupportedPlatformError(platform);
  }
};

const spawnDaemonProcessMacOSX = async (daemonPath: string): Promise<void> => {
  const command = [daemonPath.replaceAll(' ', '\\\\ '), `&`].join(' ');
  const promptMessage =
    'IC HTTP Proxy needs your permission to create a secure environment';
  const runCommand = [
    'osascript',
    '-e',
    `'do shell script "${command}" with prompt "${promptMessage}" with administrator privileges'`,
  ].join(' ');

  await execAsync(runCommand);
};

const spawnDaemonProcessWindows = async (daemonPath: string): Promise<void> => {
  const command = [`$env:DAEMON_EXEC_PATH`].join(' ');
  const startProcessCommand = `$env:DAEMON_EXEC_PATH='"${daemonPath}"'; start-process -windowstyle hidden cmd -verb runas -argumentlist "/c ${command}"`;
  const encodedCommand = Buffer.from(startProcessCommand, 'utf16le').toString(
    'base64'
  );
  const spawnCommand = `powershell -EncodedCommand ${encodedCommand}`;

  await execAsync(spawnCommand);
};

export const spawnDaemonProcess = async (platform: string): Promise<void> => {
  const daemonPath = await daemonBinPath(platform);

  switch (platform) {
    case SupportedPlatforms.MacOSX:
      return await spawnDaemonProcessMacOSX(daemonPath);
    case SupportedPlatforms.Windows:
      return await spawnDaemonProcessWindows(daemonPath);
    default:
      throw new UnsupportedPlatformError(platform);
  }
};
