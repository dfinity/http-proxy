import { app } from 'electron';
import { ProxyUI } from '~src/proxy-ui';

app.whenReady().then(() => {
  ProxyUI.init();
});
