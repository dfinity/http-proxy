// Initializes the logger with the correct context
import { initLogger, coreConfigs } from '@dfinity/http-proxy-core';
initLogger('IC HTTP Proxy Daemon', 'daemon', coreConfigs.dataPath);

import { logger } from '@dfinity/http-proxy-core';
import { Daemon } from './daemon';

let daemon: Daemon | null = null;

// clean exit here? detach the proxy
process.on('uncaughtException', (err) => {
  logger.error(`Uncaught Exception: ${String(err)}`);

  daemon ? daemon.shutdown(1) : process.exit(1);
});

process.on('unhandledRejection', (reason) => {
  logger.error(`Unhandled rejection at reason: ${reason}`);

  daemon ? daemon.shutdown(1) : process.exit(1);
});

(async (): Promise<void> => {
  try {
    daemon = await Daemon.create({
      ipcChannels: coreConfigs.ipcChannels,
      platform: coreConfigs.platform,
    });

    await daemon.start();

    logger.info('Waiting for tasks');

    process.on('SIGINT', async () => await daemon?.shutdown());
  } catch (e) {
    logger.error(`Failed to start (${String(e)})`);
  }
})();
