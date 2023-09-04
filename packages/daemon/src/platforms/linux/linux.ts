import {
  execAsync,
  getDirectories,
  getFile,
  logger, pathExists, saveFile
} from '@dfinity/http-proxy-core';
import { Platform, PlatformProxyInfo } from '../typings';
import { PlatformConfigs } from './typings';
import { resolve } from 'path';
import { CURL_RC_FILE, FIREFOX_PROFILES_PATH, ROOT_CA_PATH, SNAP_FIREFOX_PROFILES_PATH } from './utils';
import { execSync } from 'child_process';

export class LinuxPlatform implements Platform {
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
      this.configs.ca.path
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
      this.configs.ca.path
    );

    await this.configureWebProxy(false, {
      host: this.configs.proxy.host,
      port: this.configs.proxy.port,
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
        const curlrc = (await getFile(curlrcPath, { encoding: 'utf-8' })) ?? '';
        const curlrcLines = curlrc
          .split('\n')
          .filter((line) => !line.startsWith('proxy='));
        if (enable) {
          curlrcLines.push(`proxy=http://${host}:${port}`);
        }
        await saveFile(curlrcPath, curlrcLines.join('\n'), {
          encoding: 'utf-8',
        });

        await this.tooggleNetworkWebProxy(enable);
        ok();
      } catch (e) {
        // failed to setup web proxy
        err(e);
      }
    });
  }

  private async tooggleNetworkWebProxy(enable: boolean): Promise<void> {
    const username = String(process.env.LOGNAME ?? "root");
    const commandToGetDbus = `pgrep -u ${username} gnome-session | head -n 1`;
    const PID = execSync(commandToGetDbus).toString().trim();
    const dbusEnv = execSync(`grep -z DBUS_SESSION_BUS_ADDRESS /proc/${PID}/environ | cut -d= -f2-`).toString().trim();
    const setDbusEnv = `export DBUS_SESSION_BUS_ADDRESS=${dbusEnv}`;

    const pacUrl = `http://${this.configs.pac.host}:${this.configs.pac.port}/proxy.pac`;

    if (enable) {
      await execAsync([
        `${setDbusEnv}`,
        `gsettings set org.gnome.system.proxy mode 'auto'`,
        `gsettings set org.gnome.system.proxy autoconfig-url '${pacUrl}'`
      ].join(" && "));
    
      return;
    }

    await execAsync([
      `${setDbusEnv}`,
      `gsettings set org.gnome.system.proxy mode 'none'`
    ].join(" && "));
  }

  private async trustCertificate(
    trust: boolean,
    path: string
  ): Promise<void> {
    if (trust) {
      await execAsync(`sudo cp "${path}" "${ROOT_CA_PATH}" && sudo update-ca-certificates`);

      await this.setupFirefoxPolicies();
      return;
    }

    await execAsync(`sudo rm -rf "${ROOT_CA_PATH}" && sudo update-ca-certificates`);
  }

  private async setupFirefoxPolicies(): Promise<void> {
    await this.setupFirefoxPoliciesForPath(FIREFOX_PROFILES_PATH);
    await this.setupFirefoxPoliciesForPath(SNAP_FIREFOX_PROFILES_PATH);
  }

  private async setupFirefoxPoliciesForPath(firefoxProfilesPath: string): Promise<void> {
    const homePath = String(process.env.HOME);
    const profilesPath = resolve(homePath, firefoxProfilesPath);

    if (!pathExists(profilesPath)) {
      // Firefox is not installed.
      return;
    }

    // firefox profile directories end with .default|.default-release
    const profiles = getDirectories(profilesPath).filter((dir) => dir.endsWith('.default') || dir.endsWith('.default-release'));

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
}
