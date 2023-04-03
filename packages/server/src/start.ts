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
      icpServer: environment.icpServer,
      netServer: environment.netServer,
      ipcChannels: coreConfigs.ipcChannels,
    });

    process.on('SIGINT', () => servers?.shutdown());

    // start proxy servers
    await servers.start();

    logger.info('IC HTTP Proxy servers listening');
  } catch (e) {
    logger.error(`Failed to start (${String(e)})`);

    servers?.shutdown();
  }
})();
