import {
  CertificateConfiguration,
  IpcChannels,
} from '@dfinity/http-proxy-core';
import {
  ICPServerConfiguration,
  NetServerConfiguration,
  ProxyConfigServerConfiguration,
} from '~src/commons';

export interface ProxyServersOptions {
  certificate: CertificateConfiguration;
  proxyConfigServer: ProxyConfigServerConfiguration;
  netServer: NetServerConfiguration;
  icpServer: ICPServerConfiguration;
  ipcChannels: IpcChannels;
  autoEnable?: boolean;
}

export interface IsRunningMessageResponse {
  running: boolean;
}

export interface IsStartedMessageResponse {
  isShuttingDown: boolean;
}

export type StopMessageResponse = void;

export type MessageResponse =
  | void
  | IsRunningMessageResponse
  | StopMessageResponse
  | IsStartedMessageResponse;

export enum MessageType {
  // Process has started
  IsStarted = 'is-started',
  // Proxy is attached to the system
  IsRunning = 'is-running',
  // Shutdown proxy
  Stop = 'stop',
  // Should enable proxy
  Enable = 'enable',
}
