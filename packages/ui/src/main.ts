import { app } from 'electron';
import { ProxyUI } from '~src/proxy-ui';

app.on('ready', () => ProxyUI.init());
