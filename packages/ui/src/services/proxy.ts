import { IPCClient, wait } from '@dfinity/http-proxy-core';
import {
  IsRunningMessageResponse,
  IsStartedMessageResponse,
  MessageType,
} from '@dfinity/http-proxy-server';
import { fork } from 'child_process';
import { waitProcessing } from '~src/commons/utils';

export class ProxyService {
  public constructor(private readonly ipcClient: IPCClient) {}

  public async isEnabled(): Promise<boolean> {
    return this.ipcClient
      .sendMessage<IsRunningMessageResponse>({ type: MessageType.IsRunning })
      .then((result) => (result.processed && result.data?.running) ?? false)
      .catch(() => false);
  }

  public async isStarted(waitIfShuttingDownMs = 3000): Promise<boolean> {
    const response = await this.ipcClient
      .sendMessage<IsStartedMessageResponse>({ type: MessageType.IsStarted })
      .catch(() => null);

    if (!response) {
      return false;
    }

    if (response.processed && !response?.data?.isShuttingDown) {
      return true;
    }

    if (response?.data?.isShuttingDown) {
      await wait(waitIfShuttingDownMs);
    }

    return false;
  }

  public async stopServers(): Promise<boolean> {
    return this.ipcClient
      .sendMessage<void>({ type: MessageType.Stop, skipWait: true })
      .then((resp) => resp.processed)
      .catch(() => false);
  }

  public async enable(): Promise<boolean> {
    return this.ipcClient
      .sendMessage<void>({ type: MessageType.Enable })
      .then((resp) => resp.processed)
      .catch(() => false);
  }

  public async startProxyServers(entrypoint: string): Promise<boolean> {
    const isStarted = await this.isStarted();
    if (isStarted) {
      return isStarted;
    }

    fork(entrypoint, [], {
      stdio: 'ignore',
      env: process.env,
      detached: true,
    });

    const successfullyProcessed = await waitProcessing(
      async () => await this.isStarted()
    );

    return successfullyProcessed ? true : false;
  }
}
