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

export interface EnvironmentConfiguration {
  platform: string;
  rootPath: string;
  dataPath: string;
  certificate: CertificateConfiguration;
  netServer: NetServerConfiguration;
  icpServer: ICPServerConfiguration;
}
