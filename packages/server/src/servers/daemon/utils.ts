import {
  SupportedPlatforms,
  UnsupportedPlatformError,
  execAsync,
} from '@dfinity/http-proxy-core';
import { DAEMON_ENTRYPOINT_FILENAME } from '@dfinity/http-proxy-daemon';
import { dirname, resolve } from 'path';

export const WAIT_UNTIL_ACTIVE_MS = 10000;
export const WAIT_INTERVAL_CHECK_MS = 250;

export const daemonNodeEntrypointPath = async (): Promise<string> => {
  const daemonPackage = require.resolve('@dfinity/http-proxy-daemon');
  const entrypointPath = resolve(
    dirname(daemonPackage),
    DAEMON_ENTRYPOINT_FILENAME
  );

  return entrypointPath;
};

const spawnDaemonProcessMacOSX = async (
  daemonPath: string,
  logsPath: string
): Promise<void> => {
  const execCommand = [
    `node`,
    ...process.execArgv,
    daemonPath,
    `&>${logsPath}`,
    `&`,
  ].join(' ');

  const promptMessage =
    'IC HTTP Proxy needs your permission to create a secure environment';
  const runCommand = [
    'osascript',
    '-e',
    `'do shell script "${execCommand}" with prompt "${promptMessage}" with administrator privileges'`,
  ].join(' ');

  await execAsync(runCommand);
};

const spawnDaemonProcessWindows = async (
  daemonPath: string,
  logsPath: string
): Promise<void> => {
  const command = [
    `node`,
    ...process.execArgv,
    daemonPath,
    `>>`,
    logsPath,
  ].join(' ');

  const spawnCommand = `powershell -command "start-process -windowstyle hidden cmd -verb runas -argumentlist '/c ${command}'"`;

  await execAsync(spawnCommand);
};

export const spawnDaemonProcess = async (
  platform: string,
  logsPath: string
): Promise<void> => {
  const daemonPath = await daemonNodeEntrypointPath();

  switch (platform) {
    case SupportedPlatforms.MacOSX:
      return await spawnDaemonProcessMacOSX(daemonPath, logsPath);
    case SupportedPlatforms.Windows:
      return await spawnDaemonProcessWindows(daemonPath, logsPath);
    default:
      throw new UnsupportedPlatformError(platform);
  }
};
