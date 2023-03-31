import { execAsync, nodeStartCommand } from '@dfinity/http-proxy-core';
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

export const nodeStart = async (
  entrypoint: string,
  logsPath: string
): Promise<void> => {
  const execCommand = nodeStartCommand(entrypoint, logsPath);

  await execAsync(execCommand);
};
