export interface ProxyUIOptions {
  darkMode: boolean;
  proxy: {
    entrypoint: string;
  };
}

export enum ProxyStatus {
  Enabled = 'enbaled',
  Disabled = 'disabled',
}
