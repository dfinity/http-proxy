import { configuration, logger } from "./commons";
import { Gateway } from "./servers";

(async (): Promise<void> => {
  try {
    // setting up gateway requirements
    const gateway = await Gateway.create(configuration);

    // start proxying requests
    await gateway.start();

    logger.info("🚀 Proxying internet computer requests");
  } catch (e) {
    logger.error(`❌ Failed to start (${String(e)})`);
  }
})();
