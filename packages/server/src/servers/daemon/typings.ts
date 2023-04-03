export interface EnableProxyOptions {
  certificate: {
    commonName: string;
    path: string;
  };
  proxy: {
    host: string;
    port: number;
  };
}
