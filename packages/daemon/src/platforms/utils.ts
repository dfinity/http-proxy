export const PAC_FILE_NAME = 'ic-proxy.pac';

export const getProxyAutoConfiguration = (
  proxyHost: string,
  proxyPort: number
): string => {
  return `function FindProxyForURL(url, host) {
    if (url.startsWith("https:") || url.startsWith("http:")) {
      return "PROXY ${proxyHost}:${proxyPort}; DIRECT";
    }

    return "DIRECT";
  }`;
};
