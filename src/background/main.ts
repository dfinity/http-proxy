import { rmSync } from "fs";
import { envConfigs, logger, saveFile } from "../commons";
import { TaskManager } from "./manager";
import { ONLINE_DESCRIPTOR } from "./utils";

(async (): Promise<void> => {
  try {
    await saveFile(ONLINE_DESCRIPTOR, String(process.pid), {
      encoding: "utf8",
    });

    const server = await TaskManager.create(envConfigs);

    await server.start();

    logger.info("🚀 Waiting for tasks");

    process.on("SIGTERM", () => {
      logger.info("⚠️ Shutting down.");

      rmSync(ONLINE_DESCRIPTOR, { force: true });
      server.shutdown();
    });
  } catch (e) {
    logger.error(`❌ Failed to start (${String(e)})`);
  }
})();
