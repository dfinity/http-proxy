export interface Platform {
  attach(): Promise<void>;
  detach(): Promise<void>;
  addCommandAdminPrivileges(command: string, promptMessage: string): string;
  addCommandDetachArgs(command: string, logsOutput: string): string;
}

export interface PlatformRootCA {
  path: string;
}

export interface PlatformProxyInfo {
  host: string;
  port: number;
}

export interface PlatformBuildConfigs {
  platform: string;
  ca: PlatformRootCA;
  proxy: PlatformProxyInfo;
}
