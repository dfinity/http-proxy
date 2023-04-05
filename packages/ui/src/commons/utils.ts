import { wait } from '@dfinity/http-proxy-core';
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

export const waitProcessing = async (
  stopConditionFn: () => Promise<boolean>,
  timeoutMs = 10000,
  checkIntervalMs = 250
): Promise<boolean> => {
  if (checkIntervalMs > timeoutMs) {
    throw new Error(`Check interval must be lower then the timeout`);
  }

  let shouldStop = false;
  let timeSpent = 0;
  do {
    await wait(checkIntervalMs);
    timeSpent += checkIntervalMs;

    shouldStop = await stopConditionFn();
  } while (!shouldStop && timeSpent < timeoutMs);

  return shouldStop;
};
