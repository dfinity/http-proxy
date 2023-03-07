import pino from "pino";

const logger = pino(
  {
    name: "IC HTTP Proxy",
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
