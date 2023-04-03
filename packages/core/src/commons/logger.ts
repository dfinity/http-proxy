import pino from 'pino';
import { tmpdir } from 'os';
import { resolve } from 'path';

const defaultLogFileName = `main`;
let logger: pino.Logger<pino.LoggerOptions>;

export const initLogger = (
  name = 'IC HTTP Proxy',
  logName: string = defaultLogFileName,
  logFolder = tmpdir()
): void => {
  const logPath = resolve(logFolder, `ic-http-proxy-${logName}.log`);

  logger = pino(
    {
      name,
      level: process.env.LOG_LEVEL ?? 'trace',
      timestamp: (): string => {
        return `, "time": "${new Date().toISOString()}"`;
      },
    },
    pino.multistream([
      pino.destination({ sync: false, dest: logPath }),
      { stream: process.stdout },
    ])
  );
};

export { logger };

export default initLogger;
