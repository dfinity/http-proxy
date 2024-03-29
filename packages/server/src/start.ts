// Initializes the logger with the correct context
import { coreConfigs, initLogger } from '@dfinity/http-proxy-core';
initLogger('IC HTTP Proxy Server', 'proxy', coreConfigs.dataPath);

import {
  UnsupportedPlatformError,
  isSupportedPlatform,
  logger,
} from '@dfinity/http-proxy-core';
import { environment } from '~src/commons';
import { ProxyServers } from './servers';

process.on('uncaughtException', (err) => {
  logger.error(`Uncaught Exception: ${String(err)}`);
  process.exit(1);
});

process.on('unhandledRejection', (reason) => {
  logger.error(`Unhandled rejection at reason: ${reason}`);
  process.exit(1);
});

(async (): Promise<void> => {
  let servers: ProxyServers | null = null;
  try {
    if (!isSupportedPlatform(environment.platform)) {
      throw new UnsupportedPlatformError(environment.platform);
    }

    // setting up proxy servers requirements
    logger.info('Preparing system requirements');
    servers = await ProxyServers.create({
      certificate: environment.certificate,
      proxyConfigServer: environment.proxyConfigServer,
      icpServer: environment.icpServer,
      netServer: environment.netServer,
      ipcChannels: coreConfigs.ipcChannels,
      autoEnable: process.argv.includes('--enable'),
    });

    process.on('SIGINT', async () => await servers?.shutdown());

    // start proxy servers
    await servers.start();

    logger.info('IC HTTP Proxy servers listening');
  } catch (e) {
    logger.error(`Failed to start (${String(e)})`);

    servers?.shutdown();
  }
})();
