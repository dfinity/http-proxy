import { execAsync } from '@dfinity/http-proxy-core';
import { PROXY_ENTRYPOINT_FILENAME } from '@dfinity/http-proxy-server';
import { dirname, resolve } from 'node:path';

export const proxyNodeEntrypointPath = async (): Promise<string> => {
  const proxyPackage = require.resolve('@dfinity/http-proxy-server');
  const entrypointPath = resolve(
    dirname(proxyPackage),
    PROXY_ENTRYPOINT_FILENAME
  );

  return entrypointPath;
};

export const nodeStart = async (entrypoint: string): Promise<void> => {
  const execCommand = [
    `node`,
    ...process.execArgv,
    entrypoint,
    '&>/tmp/ic-proxy.logs',
    `&`,
  ].join(' ');

  console.log(execCommand);

  const result = await execAsync(execCommand);

  console.log(result);
};
