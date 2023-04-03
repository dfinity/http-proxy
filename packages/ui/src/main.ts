// Initializes the logger with the correct context
import { initLogger, coreConfigs, logger } from '@dfinity/http-proxy-core';
initLogger('IC HTTP Proxy UI', 'ui', coreConfigs.dataPath);

import { app } from 'electron';
import { ProxyUI } from '~src/proxy-ui';

app.whenReady().then(() => {
  logger.info('Preparing interface');

  ProxyUI.init()
    .then(() => {
      logger.info('Interface is ready');
    })
    .catch((e) => {
      logger.error(`Interface failed to render ${String(e)}`);
    });
});

app.on('quit', () => {
  logger.info('Exiting interface');
});
