import { IPCClient, coreConfigs, logger } from '@dfinity/http-proxy-core';
import {
  IsRunningMessageResponse,
  MessageType,
} from '@dfinity/http-proxy-server';
import { fork } from 'child_process';
import { appendFile } from 'fs';

export class ProxyService {
  public constructor(private readonly ipcClient: IPCClient) {}

  public async isEnabled(): Promise<boolean> {
    return this.ipcClient
      .sendMessage<IsRunningMessageResponse>({ type: MessageType.IsRunning })
      .then((result) => (result.processed && result.data?.running) ?? false)
      .catch(() => false);
  }

  public async stopServers(): Promise<void> {
    this.ipcClient
      .sendMessage<void>({ type: MessageType.Stop })
      .catch(() => false);
  }

  public async startProxyServers(entrypoint: string): Promise<void> {
    const proxyProcess = fork(entrypoint, undefined, {
      stdio: 'pipe',
      env: process.env,
    });

    proxyProcess.stderr?.on('data', (data) => {
      appendFile(coreConfigs.logs.proxy, data.toString(), (e) => {
        if (e) {
          logger.error(`Failed to append proxy logs (String(e))`);
        }
      });
    });

    proxyProcess.stdout?.on('data', (data) => {
      appendFile(coreConfigs.logs.proxy, data.toString(), (e) => {
        if (e) {
          logger.error(`Failed to append proxy logs (String(e))`);
        }
      });
    });
  }
}
