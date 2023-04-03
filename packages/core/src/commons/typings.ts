export enum SupportedPlatforms {
  Windows = 'win32',
  MacOSX = 'darwin',
}

export interface IpcChannels {
  daemon: string;
  proxy: string;
}

export interface CoreConfiguration {
  dataPath: string;
  platform: string;
  windows: boolean;
  macosx: boolean;
  ipcChannels: IpcChannels;
}
