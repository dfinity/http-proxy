import { execAsync, getFile, logger, saveFile } from '@dfinity/http-proxy-core';
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
    logger.info(
      `attaching proxy to system with: ` +
        `host(${this.configs.proxy.host}:${this.configs.proxy.port}), ` +
        `capath(${this.configs.ca.path}), ` +
        `caname(${this.configs.ca.commonName})`
    );

    await this.trustCertificate(
      true,
      this.configs.ca.path,
      this.configs.ca.commonName
    );
    await this.configureWebProxy(true, {
      host: this.configs.proxy.host,
      port: this.configs.proxy.port,
    });
  }

  public async detach(): Promise<void> {
    logger.info(
      `detaching proxy from system with: ` +
        `host(${this.configs.proxy.host}:${this.configs.proxy.port}), ` +
        `capath(${this.configs.ca.path}), ` +
        `caname(${this.configs.ca.commonName})`
    );

    await this.trustCertificate(
      false,
      this.configs.ca.path,
      this.configs.ca.commonName
    );
    await this.configureWebProxy(false, {
      host: this.configs.proxy.host,
      port: this.configs.proxy.port,
    });
  }

  private async isCertificatedInSystemStore(
    commonName: string
  ): Promise<boolean> {
    return execAsync(`security find-certificate -c '${commonName}'`)
      .then(() => true)
      .catch(() => false);
  }

  private async deleteCertificateFromStore(commonName: string): Promise<void> {
    const isInStore = await this.isCertificatedInSystemStore(commonName);
    if (!isInStore) {
      return;
    }

    await execAsync(
      'security authorizationdb write com.apple.trust-settings.admin allow' +
        SHELL_SCRIPT_SEPARATOR +
        `security delete-certificate -c '${commonName}'` +
        SHELL_SCRIPT_SEPARATOR +
        'security authorizationdb remove com.apple.trust-settings.admin'
    );
  }

  private async trustCertificate(
    trust: boolean,
    path: string,
    commonName: string
  ): Promise<void> {
    await this.deleteCertificateFromStore(commonName);

    if (trust) {
      await execAsync(
        'security authorizationdb write com.apple.trust-settings.admin allow' +
          SHELL_SCRIPT_SEPARATOR +
          `security add-trusted-cert -d -r trustRoot -k /Library/Keychains/System.keychain ${path}` +
          SHELL_SCRIPT_SEPARATOR +
          'security authorizationdb remove com.apple.trust-settings.admin'
      );
    }
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
