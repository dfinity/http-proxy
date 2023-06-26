import { CertificateConfiguration } from '@dfinity/http-proxy-core';

export interface ICPServerConfiguration {
  host: string;
  port: number;
}

export interface NetServerConfiguration {
  host: string;
  port: number;
}

export type ProxyConfigServerConfiguration = NetServerConfiguration;

export interface EnvironmentConfiguration {
  userAgent: string;
  platform: string;
  certificate: CertificateConfiguration;
  proxyConfigServer: ProxyConfigServerConfiguration;
  netServer: NetServerConfiguration;
  icpServer: ICPServerConfiguration;
}
