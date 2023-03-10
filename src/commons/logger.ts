import pino from "pino";
import { envConfigs } from "./configs";

const logger = pino(
  {
    name: !envConfigs.isTaskManager
      ? "IC HTTP Proxy"
      : "IC HTTP Task Manager",
    customLevels: {
      log: 30,
    },
    transport: {
      target: "pino-pretty",
      options: {
        colorize: true,
      },
    },
  },
  pino.destination({ sync: false })
);

export { logger };
