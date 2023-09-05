import {
  SupportedPlatforms,
  UnsupportedPlatformError,
  coreConfigs,
  execAsync,
} from '@dfinity/http-proxy-core';
import { spawnSync } from 'child_process';

export const WAIT_UNTIL_ACTIVE_MS = 10000;
export const WAIT_INTERVAL_CHECK_MS = 250;

export const daemonBinPath = async (platform: string): Promise<string> => {
  switch (platform) {
    case SupportedPlatforms.MacOSX:
      return require
        .resolve('@dfinity/http-proxy-daemon/bin/http-proxy-daemon-macos-x64')
        .replace('.asar', '.asar.unpacked');
    case SupportedPlatforms.Windows:
      return require
        .resolve('@dfinity/http-proxy-daemon/bin/http-proxy-daemon-win-x64.exe')
        .replace('.asar', '.asar.unpacked');
    case SupportedPlatforms.Linux:
      return require
        .resolve('@dfinity/http-proxy-daemon/bin/http-proxy-daemon-linux-arm64')
        .replace('.asar', '.asar.unpacked');
    default:
      throw new UnsupportedPlatformError(platform);
  }
};

const spawnDaemonProcessMacOSX = async (daemonPath: string): Promise<void> => {
  const command = [
    daemonPath.replaceAll(' ', '\\\\ '),
    '&>/dev/null',
    `&`,
  ].join(' ');
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
  const encodedCommand = Buffer.from(
    startProcessCommand,
    coreConfigs.encoding
  ).toString('base64');
  const spawnCommand = `powershell -EncodedCommand ${encodedCommand}`;

  await execAsync(spawnCommand);
};

const spawnDaemonProcessUbuntu = (daemonPath: string) => {
  const escapedDaemonPath = daemonPath.replace(/ /g, '\\ ');
  const command = 'pkexec';
  const args = [
    'sh',
    '-c',
    `HOME="${process.env.HOME}" LOGNAME="${process.env.LOGNAME}" nohup ${escapedDaemonPath} &>/dev/null &`,
  ];

  const result = spawnSync(command, args, {
    stdio: 'ignore',
    env: process.env,
  });
  if (result.status !== 0) {
    throw new Error(
      `Spawn error (err: ${result.status}): ${result.error ?? 'unknown'}`
    );
  }
};

export const spawnDaemonProcess = async (platform: string): Promise<void> => {
  const daemonPath = await daemonBinPath(platform);

  switch (platform) {
    case SupportedPlatforms.MacOSX:
      return await spawnDaemonProcessMacOSX(daemonPath);
    case SupportedPlatforms.Windows:
      return await spawnDaemonProcessWindows(daemonPath);
    case SupportedPlatforms.Linux:
      return await spawnDaemonProcessUbuntu(daemonPath);
    default:
      throw new UnsupportedPlatformError(platform);
  }
};
