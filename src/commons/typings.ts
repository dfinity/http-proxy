export enum SupportedPlatforms {
  Windows = "win32",
  MacOSX = "darwin",
}

export interface CertificateConfiguration {
  countryName: string;
  state: string;
  locality: string;
  organizationName: string;
  commonName: string;
  storage: {
    hostPrefix: string;
    folder: string;
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
  isBackgroundControllerProcess: boolean;
  dataPath: string;
  platform: string;
  windows: boolean;
  macosx: boolean;
  certificate: CertificateConfiguration;
  netServer: NetServerConfiguration;
  icpServer: ICPServerConfiguration;
  backgroundServer: BackgrroundServerConfiguration;
}
