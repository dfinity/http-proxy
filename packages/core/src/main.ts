import { envConfigs, logger, saveFile } from './commons';
import { Gateway } from './servers';
import { ONLINE_DESCRIPTOR } from './utils';
import { rmSync } from 'fs';

(async (): Promise<void> => {
  try {
    await saveFile(ONLINE_DESCRIPTOR, String(process.pid), {
      encoding: 'utf8',
    });

    // setting up gateway requirements
    const gateway = await Gateway.create(envConfigs);

    // start proxying requests
    await gateway.start();

    logger.info('🚀 Proxying internet computer requests');

    process.on('SIGINT', async () => {
      logger.info('⚠️ Proxy is shutting down.');

      await gateway.shutdown();

      rmSync(ONLINE_DESCRIPTOR, { force: true });
    });
  } catch (e) {
    logger.error(`❌ Failed to start (${String(e)})`);
  }
})();