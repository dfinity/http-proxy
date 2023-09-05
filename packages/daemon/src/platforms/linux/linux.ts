import {
  execAsync,
  getDirectories,
  getFile,
  logger, pathExists, saveFile
} from '@dfinity/http-proxy-core';
import { Platform, PlatformProxyInfo } from '../typings';
import { PlatformConfigs } from './typings';
import { resolve } from 'path';
import { BASE_MOZILLA_PATH, BASE_SNAP_MOZZILA_PATH, CURL_RC_FILE, FIREFOX_PROFILES_FOLDER, MOZILLA_CERTIFICATES_FOLDER, ROOT_CA_PATH, findP11KitTrustPath } from './utils';

export class LinuxPlatform implements Platform {
  constructor(
    private readonly configs: PlatformConfigs,
    private readonly username = String(process.env.LOGNAME ?? "root")
  ) {}

  public async attach(): Promise<void> {
    await this.setupDependencies();

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
    await this.setupDependencies();

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
    const pacUrl = `http://${this.configs.pac.host}:${this.configs.pac.port}/proxy.pac`;

    if (enable) {
      await execAsync([
        `su -l ${this.username} -c "gsettings set org.gnome.system.proxy mode 'auto' && gsettings set org.gnome.system.proxy autoconfig-url '${pacUrl}'"`
      ].join(" && "));
    
      return;
    }

    await execAsync([
      `su -l ${this.username} -c "gsettings set org.gnome.system.proxy mode 'none'"`
    ].join(" && "));
  }

  private async trustCertificate(
    trust: boolean,
    path: string
  ): Promise<void> {
    if (trust) {
      await execAsync(`sudo cp "${path}" "${ROOT_CA_PATH}" && sudo update-ca-certificates`);

      await this.firefoxTrustCertificate({ path });
      return;
    }

    await execAsync(`sudo rm -rf "${ROOT_CA_PATH}" && sudo update-ca-certificates`);
  }

  private async firefoxTrustCertificate(cert: { path: string }): Promise<void> {
    await this.setupFirefoxCertificateConfigurations(BASE_MOZILLA_PATH, cert);
    await this.setupFirefoxCertificateConfigurations(BASE_SNAP_MOZZILA_PATH, cert);
  }

  private async setupFirefoxCertificateConfigurations(basePath: string, cert: { path: string }): Promise<void> {
    const homePath = String(process.env.HOME);
    const mozillaPathPath = resolve(homePath, basePath);
    const certificatesPath = resolve(mozillaPathPath, MOZILLA_CERTIFICATES_FOLDER);
    const profilesPath = resolve(mozillaPathPath, FIREFOX_PROFILES_FOLDER);

    if (!pathExists(mozillaPathPath)) {
      // Firefox is not installed.
      return;
    }

    await this.firefoxSetupCertificates(certificatesPath, cert);
    await this.firefoxSetupProfiles(profilesPath);
  }

  private async setupDependencies(): Promise<void> {
    const p11KitPath = await findP11KitTrustPath();

    if (!p11KitPath) {
      await execAsync("sudo apt install p11-kit p11-kit-modules libnss3-tools -y");
      const installed = await findP11KitTrustPath();

      if (!installed) {
        throw new Error("Failed to setup p11-kit dependency");
      }
    }
  }

  private async firefoxSetupCertificates(profilesPath: string, cert: { path: string }) : Promise<void> {
    if (!pathExists(profilesPath)) {
      return;
    }

    const p11KitPath = await findP11KitTrustPath();
    if (!p11KitPath) {
      throw new Error("Failed to find certificate store path");
    }

    // firefox profile directories end with .default|.default-release
    const profiles = getDirectories(profilesPath).filter((dir) => dir.endsWith('.default') || dir.endsWith('.default-release'));

    for (const profileFolder of profiles) {
      const profilePath = resolve(profilesPath, profileFolder);

      await execAsync(`modutil -dbdir sql:${profilePath} -add "P11 Kit" -libfile ${p11KitPath}`);
    }
  }

  private async firefoxSetupProfiles(profilesPath: string) : Promise<void> {
    if (!pathExists(profilesPath)) {
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
        preferences.filter((line) => line.length > 0).join('\n') + '\n',
        {
          encoding: 'utf-8',
        }
      );
      await execAsync(`sudo chown ${this.username}:${this.username} "${userPreferencesPath}"`);
    }
  }
}
