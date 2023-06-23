import { IpcChannels } from '@dfinity/http-proxy-core';

export interface DaemonConfiguration {
  ipcChannels: IpcChannels;
  platform: string;
}

export enum MessageType {
  EnableProxy = 'enable-proxy',
  DisableProxy = 'disable-proxy',
  IsProxyEnabled = 'is-proxy-enabled',
}

export interface EnableProxyMessage {
  type: MessageType.EnableProxy;
  host: string;
  port: number;
  pac: {
    host: string;
    port: number;
  };
  certificatePath: string;
  commonName: string;
}

export interface ProxyEnabledResponse {
  enabled: boolean;
}

export type OnMessageResponse = void | ProxyEnabledResponse;
