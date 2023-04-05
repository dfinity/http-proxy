// Initializes the logger with the correct context
import { initLogger, coreConfigs } from '@dfinity/http-proxy-core';
initLogger('IC HTTP Proxy Daemon', 'daemon', coreConfigs.dataPath);

import { logger } from '@dfinity/http-proxy-core';
import { Daemon } from './daemon';

(async (): Promise<void> => {
  try {
    const daemon = await Daemon.create({
      ipcChannels: coreConfigs.ipcChannels,
      platform: coreConfigs.platform,
    });

    await daemon.start();

    logger.info('Waiting for tasks');

    process.on('SIGINT', async () => await daemon.shutdown());
  } catch (e) {
    logger.error(`Failed to start (${String(e)})`);
  }
})();
