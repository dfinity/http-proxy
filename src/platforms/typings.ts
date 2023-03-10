export interface Platform {
  attach(): Promise<void>;
  detach(): Promise<void>;
  spawnTaskManager(): Promise<void>;
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
