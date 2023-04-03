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
