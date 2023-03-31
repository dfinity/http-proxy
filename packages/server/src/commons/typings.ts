import { CertificateConfiguration } from '@dfinity/http-proxy-core';

export interface ICPServerConfiguration {
  host: string;
  port: number;
}

export interface NetServerConfiguration {
  host: string;
  port: number;
}

export interface EnvironmentConfiguration {
  platform: string;
  certificate: CertificateConfiguration;
  netServer: NetServerConfiguration;
  icpServer: ICPServerConfiguration;
}
