import { exec } from 'child_process';
import { WebProxyConfiguration } from './typings';
import { PlatformProxyInfo } from '../typings';

export const SHELL_SCRIPT_SEPARATOR = ' ; ';
export const CURL_RC_FILE = '.curlrc';
export const PROXY_GET_SEPARATOR = ':ic-separator:';

export const resolveNetworkInfo = async (
  proxy: PlatformProxyInfo
): Promise<Map<string, WebProxyConfiguration>> => {
  const ports = await fetchHardwarePorts();
  const networkInfo = new Map<string, WebProxyConfiguration>();
  for (const port of ports) {
    const webProxyState = await fetchNetworkWebProxy(port, proxy);
    networkInfo.set(port, webProxyState);
  }

  return networkInfo;
};

export const fetchHardwarePorts = async (): Promise<string[]> => {
  return new Promise<string[]>((ok, err) => {
    exec(
      `networksetup -listnetworkserviceorder | grep 'Hardware Port'`,
      (error, stdout) => {
        if (error) {
          return err(error);
        }

        const ports = stdout
          .split('\n')
          .map((line) => {
            const [, port] =
              line.match(new RegExp(/Hardware Port:\s(.*),.*/)) ?? [];

            return port;
          })
          .filter((port) => !!port) as string[];

        ok(ports);
      }
    );
  });
};

export const fetchNetworkWebProxy = async (
  networkHardwarePort = 'wi-fi',
  proxy: PlatformProxyInfo
): Promise<WebProxyConfiguration> => {
  return new Promise<WebProxyConfiguration>(async (ok, err) => {
    const shellScript =
      `networksetup -getwebproxy "${networkHardwarePort}"` +
      SHELL_SCRIPT_SEPARATOR +
      `echo "${PROXY_GET_SEPARATOR}"` +
      SHELL_SCRIPT_SEPARATOR +
      `networksetup -getsecurewebproxy "${networkHardwarePort}"`;

    exec(`${shellScript}`, (error, stdout) => {
      if (error) {
        return err(error);
      }

      const [rawHttpProxy, rawHttpsProxy] = stdout.split(PROXY_GET_SEPARATOR);

      const isEnabled = (parts: string[]): boolean => {
        const sameProxyHost = parts.some((part) => {
          const [, host] =
            part.trim().match(new RegExp(/^Server:\s+(.*)/)) ?? [];
          return host ? host === proxy.host : false;
        });
        const sameProxyPort = parts.some((part) => {
          const [, port] = part.trim().match(new RegExp(/^Port:\s+(.*)/)) ?? [];
          return port ? Number(port) === proxy.port : false;
        });
        const isEnabled = parts.some((part) => {
          const [, enabled] =
            part.trim().match(new RegExp(/^Enabled:\s+(.*)/)) ?? [];

          return enabled ? enabled.toLowerCase() === 'yes' : false;
        });

        return sameProxyHost && sameProxyPort && isEnabled;
      };

      ok({
        http: { enabled: isEnabled(rawHttpProxy.split('\n')) },
        https: { enabled: isEnabled(rawHttpsProxy.split('\n')) },
      });
    });
  });
};
