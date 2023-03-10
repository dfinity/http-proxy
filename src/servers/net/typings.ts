export interface NetProxyOpts {
  host: string;
  port: number;
  icpServer: {
    host: string;
    port: number;
  };
}

export interface ConnectionInfo {
  host: string;
  port: number;
  secure: boolean;
}

export interface ServerInfo {
  host: string;
  port: number;
}
