import { PlatformRootCA } from '../typings';

// these are all the same as they are for windows

export interface PlatformProxyInfo {
  host: string;
  port: number;
}

export interface PlatformConfigs {
  ca: PlatformRootCA;
  proxy: PlatformProxyInfo;
}

export interface SystemWebProxyInfo {
  enabled: boolean;
}

export interface WebProxyConfiguration {
  https: SystemWebProxyInfo;
  http: SystemWebProxyInfo;
}

export interface NetworkProxySetup {
  [networkPort: string]: WebProxyConfiguration;
}
