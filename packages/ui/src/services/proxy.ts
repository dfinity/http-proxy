import { IPCClient } from '@dfinity/http-proxy-core';
import {
  IsRunningMessageResponse,
  MessageType,
} from '@dfinity/http-proxy-server';
import { fork } from 'child_process';

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
    fork(entrypoint, undefined, {
      stdio: 'ignore',
      env: process.env,
    });
  }
}
