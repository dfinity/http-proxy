import { resolve } from 'path';
import { envConfigs } from '../commons';

export const CHECK_PROXY_PROCESS_MS = 3000;
export const ONLINE_DESCRIPTOR = resolve(envConfigs.dataPath, 'background.pid');
export const MESSAGES_DESCRIPTOR = resolve(
  envConfigs.dataPath,
  'background.messages'
);
export const BACKGROUND_LOGS_PATH = resolve(
  envConfigs.dataPath,
  'background.logs'
);
