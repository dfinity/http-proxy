// Initializes the logger with the correct context
import { initLogger } from '@dfinity/http-proxy-core';
initLogger('IC HTTP Proxy UI');

import { app } from 'electron';
import { ProxyUI } from '~src/proxy-ui';

app.whenReady().then(() => {
  ProxyUI.init();
});
