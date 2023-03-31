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

export interface IpcChannels {
  daemon: string;
  proxy: string;
}

export interface CoreConfiguration {
  rootPath: string;
  dataPath: string;
  platform: string;
  windows: boolean;
  macosx: boolean;
  ipcChannels: IpcChannels;
  certificate: CertificateConfiguration;
}
