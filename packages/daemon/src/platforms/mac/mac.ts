import { getFile, saveFile } from '@dfinity/http-proxy-core';
import { exec } from 'child_process';
import { resolve } from 'path';
import { Platform } from '../typings';
import {
  PlatformConfigs,
  PlatformProxyInfo,
  WebProxyConfiguration,
} from './typings';
import {
  CURL_RC_FILE,
  SHELL_SCRIPT_SEPARATOR,
  resolveNetworkInfo,
} from './utils';

export class MacPlatform implements Platform {
  constructor(private readonly configs: PlatformConfigs) {}

  public async attach(): Promise<void> {
    await this.trustCertificate(true, this.configs.ca.path);
    await this.configureWebProxy(true, {
      host: this.configs.proxy.host,
      port: this.configs.proxy.port,
    });
  }

  public async detach(): Promise<void> {
    await this.trustCertificate(false, this.configs.ca.path);
    await this.configureWebProxy(false, {
      host: this.configs.proxy.host,
      port: this.configs.proxy.port,
    });
  }

  private async isTrustedCertificate(path: string): Promise<boolean> {
    return new Promise<boolean>((ok) => {
      exec(
        `security verify-cert -k /Library/Keychains/System.keychain -c ${path}`,
        (error) => {
          ok(error ? false : true);
        }
      );
    });
  }

  private async trustCertificate(trust: boolean, path: string): Promise<void> {
    const isTrusted = await this.isTrustedCertificate(path);
    const shouldContinue = trust ? !isTrusted : isTrusted;
    if (!shouldContinue) {
      return;
    }

    const trustCommand = trust
      ? `security add-trusted-cert -d -r trustRoot -k /Library/Keychains/System.keychain ${path}`
      : `security remove-trusted-cert -d ${path}`;

    return new Promise<void>((ok, err) => {
      const shellScript =
        'security authorizationdb write com.apple.trust-settings.admin allow' +
        SHELL_SCRIPT_SEPARATOR +
        trustCommand +
        SHELL_SCRIPT_SEPARATOR +
        'security authorizationdb remove com.apple.trust-settings.admin';

      exec(`${shellScript}`, (error) => {
        if (error) {
          return err(error);
        }

        ok();
      });
    });
  }

  public async configureWebProxy(
    enable: boolean,
    { host, port }: PlatformProxyInfo
  ): Promise<void> {
    return new Promise<void>(async (ok, err) => {
      try {
        // configure proxy for curl
        const curlrcPath = resolve(String(process.env.HOME), CURL_RC_FILE);
        const curlrc = (await getFile(curlrcPath, { encoding: 'utf8' })) ?? '';
        const curlrcLines = curlrc
          .split('\n')
          .filter((line) => !line.startsWith('proxy='));
        if (enable) {
          curlrcLines.push(`proxy=http://${host}:${port}`);
        }
        await saveFile(curlrcPath, curlrcLines.join('\n'), {
          encoding: 'utf-8',
        });

        // configure proxy in all network interfaces
        const networkInfo = await resolveNetworkInfo({ host, port });
        await this.tooggleNetworkWebProxy(networkInfo, enable);

        ok();
      } catch (e) {
        // failed to setup web proxy
        err(e);
      }
    });
  }

  private async tooggleNetworkWebProxy(
    networkPorts: Map<string, WebProxyConfiguration>,
    enable: boolean
  ): Promise<void> {
    const hasIncorrectStatus = Array.from(networkPorts.values()).some(
      (proxy) => proxy.http.enabled !== enable || proxy.https.enabled !== enable
    );

    if (!hasIncorrectStatus) {
      return;
    }

    const commands: string[] = [];
    // enable admin privileges
    commands.push(
      `security authorizationdb write com.apple.trust-settings.admin allow`
    );
    // set proxy host configuration
    for (const [port, proxyStatus] of networkPorts.entries()) {
      if (!proxyStatus.http.enabled) {
        commands.push(
          `networksetup -setwebproxy "${port}" ${this.configs.proxy.host} ${this.configs.proxy.port}`
        );
      }
      if (!proxyStatus.https.enabled) {
        commands.push(
          `networksetup -setsecurewebproxy "${port}" ${this.configs.proxy.host} ${this.configs.proxy.port}`
        );
      }
    }
    const status = enable ? 'on' : 'off';
    // toggle web proxy for all network interfaces
    for (const [port, proxyStatus] of networkPorts.entries()) {
      if (proxyStatus.http.enabled !== enable) {
        commands.push(`networksetup -setwebproxystate "${port}" ${status}`);
      }
      if (proxyStatus.https.enabled !== enable) {
        commands.push(
          `networksetup -setsecurewebproxystate "${port}" ${status}`
        );
      }
    }
    // remove admin privileges
    commands.push(
      `security authorizationdb remove com.apple.trust-settings.admin`
    );
    const shellScript = commands.join(SHELL_SCRIPT_SEPARATOR);

    return new Promise<void>(async (ok, err) => {
      exec(`${shellScript}`, (error) => {
        if (error) {
          return err(error);
        }

        ok();
      });
    });
  }
}
