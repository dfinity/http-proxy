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

export interface HTTPServerConfiguration {
  host: string;
  port: number;
}

export interface InitConfiguration {
  platform: string;
  windows: boolean;
  macosx: boolean;
  certificate: CertificateConfiguration;
  httpServer: HTTPServerConfiguration;
}
