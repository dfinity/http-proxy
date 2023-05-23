import pino from 'pino';
import { tmpdir } from 'node:os';
import { createStream } from 'rotating-file-stream';

const defaultLogFileName = `main`;
let logger: pino.Logger<pino.LoggerOptions>;

export const initLogger = (
  name = 'IC HTTP Proxy',
  logName: string = defaultLogFileName,
  logFolder = tmpdir()
): void => {
  logger = pino(
    {
      name,
      level: process.env.LOG_LEVEL ?? 'trace',
      timestamp: (): string => {
        return `, "time": "${new Date().toISOString()}"`;
      },
    },
    pino.multistream([
      {
        stream: createStream(`ic-http-proxy-${logName}.log`, {
          size: '10M',
          compress: 'gzip',
          maxFiles: 5,
          path: logFolder,
        }),
      },
      { stream: process.stdout },
    ])
  );
};

export { logger };

export default initLogger;
