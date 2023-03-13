export enum SupportedPlatforms {
  Windows = 'win32',
  MacOSX = 'darwin',
}

export interface CertificateConfiguration {
  storage: {
    hostPrefix: string;
    folder: string;
  };
  rootca: {
    commonName: string;
    organizationName: string;
    organizationUnit: string;
  };
}

export interface ICPServerConfiguration {
  host: string;
  port: number;
}

export interface NetServerConfiguration {
  host: string;
  port: number;
}

export type BackgrroundServerConfiguration = NetServerConfiguration;

export interface InitConfiguration {
  isTaskManager: boolean;
  rootPath: string;
  dataPath: string;
  platform: string;
  windows: boolean;
  macosx: boolean;
  certificate: CertificateConfiguration;
  netServer: NetServerConfiguration;
  icpServer: ICPServerConfiguration;
  backgroundServer: BackgrroundServerConfiguration;
}
