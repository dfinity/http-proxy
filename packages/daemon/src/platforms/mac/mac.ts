import {
  createDir,
  execAsync,
  getDirectories,
  getFile,
  logger,
  pathExists,
  saveFile,
} from '@dfinity/http-proxy-core';
import { exec } from 'child_process';
import { resolve } from 'path';
import { Platform } from '../typings';
import { PlatformConfigs, PlatformProxyInfo } from './typings';
import {
  CURL_RC_FILE,
  FIREFOX_PROFILES_PATH,
  SHELL_SCRIPT_SEPARATOR,
  getActiveNetworkService,
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

      await this.setupFirefoxPolicies();
    }
  }

  private async setupFirefoxPolicies(): Promise<void> {
    const homePath = String(process.env.HOME);
    const profilesPath = resolve(homePath, FIREFOX_PROFILES_PATH);

    if (!pathExists(profilesPath)) {
      // Firefox is not installed.
      return;
    }

    const profiles = getDirectories(profilesPath);

    for (const profileFolder of profiles) {
      const userPreferencesPath = resolve(
        profilesPath,
        profileFolder,
        'user.js'
      );

      const userPreferences =
        (await getFile(userPreferencesPath, { encoding: 'utf8' })) ?? '';

      const preferences = userPreferences
        .split('\n')
        .filter((line) => !line.includes('security.enterprise_roots.enabled'));

      preferences.push(`user_pref("security.enterprise_roots.enabled", true);`);

      await saveFile(
        userPreferencesPath,
        preferences.filter((line) => line.length > 0).join('\n'),
        {
          encoding: 'utf-8',
        }
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

        // configure proxy to the active network interface
        await this.tooggleNetworkWebProxy(enable);

        ok();
      } catch (e) {
        // failed to setup web proxy
        err(e);
      }
    });
  }

  private async tooggleNetworkWebProxy(enable: boolean): Promise<void> {
    const networkService = getActiveNetworkService();

    if (!networkService) {
      throw new Error('no active network service found');
    }

    const status = enable ? 'on' : 'off';
    const commands: string[] = [];
    // enable admin privileges
    commands.push(
      `security authorizationdb write com.apple.trust-settings.admin allow`
    );
    // toggle web proxy for the active network interface
    if (enable) {
      commands.push(
        `networksetup -setautoproxyurl "${networkService}" "http://${this.configs.pac.host}:${this.configs.pac.port}/proxy.pac"`
      );
    }
    commands.push(
      `networksetup -setautoproxystate "${networkService}" ${status}`
    );
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
