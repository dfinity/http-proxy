import { IPCClient, coreConfigs } from '@dfinity/http-proxy-core';
import {
  IsRunningMessageResponse,
  MessageType,
  StopMessageResponse,
} from '@dfinity/http-proxy-server';
import { nodeStart } from '~src/commons/utils';

export class ProxyService {
  public constructor(private readonly ipcClient: IPCClient) {}

  public async isEnabled(): Promise<boolean> {
    return this.ipcClient
      .sendMessage<IsRunningMessageResponse>({ type: MessageType.IsRunning })
      .then((result) => (result.processed && result.data?.running) ?? false)
      .catch(() => false);
  }

  public async stopServers(): Promise<boolean> {
    return this.ipcClient
      .sendMessage<StopMessageResponse>({ type: MessageType.Stop })
      .then((result) => (result.processed && result.data?.stopped) ?? false)
      .catch(() => false);
  }

  public async startProxyServers(entrypoint: string): Promise<boolean> {
    await nodeStart(entrypoint, coreConfigs.logs.proxy);

    return true;
  }
}
