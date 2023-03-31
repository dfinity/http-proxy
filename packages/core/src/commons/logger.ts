import pino from 'pino';

let logger: pino.Logger<pino.LoggerOptions>;

export const initLogger = (name = 'IC HTTP Proxy'): void => {
  logger = pino(
    {
      name,
      customLevels: {
        log: 30,
      },
      transport: {
        target: 'pino-pretty',
        options: {
          colorize: true,
        },
      },
    },
    pino.destination({ sync: false })
  );
};

export { logger };

export default initLogger;
