import {
  CertificateConfiguration,
  IpcChannels,
} from '@dfinity/http-proxy-core';
import { ICPServerConfiguration, NetServerConfiguration } from '~src/commons';

export interface ProxyServersOptions {
  certificate: CertificateConfiguration;
  netServer: NetServerConfiguration;
  icpServer: ICPServerConfiguration;
  ipcChannels: IpcChannels;
}

export interface IsRunningMessageResponse {
  running: boolean;
}

export interface StopMessageResponse {
  stopped: boolean;
}

export type MessageResponse =
  | void
  | IsRunningMessageResponse
  | StopMessageResponse;

export enum MessageType {
  IsRunning = 'is-running',
  Stop = 'Stop',
}
