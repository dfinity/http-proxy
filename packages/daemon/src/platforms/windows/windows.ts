import { execAsync, logger } from '@dfinity/http-proxy-core';
import { Platform, PlatformProxyInfo } from '../typings';
import { PlatformConfigs } from './typings';
import { isTrustedCertificate } from './utils';

export class WindowsPlatform implements Platform {
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
      host: this.configs.pac.host,
      port: this.configs.pac.port,
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
      host: this.configs.pac.host,
      port: this.configs.pac.port,
    });
  }

  private async deleteCertificateFromStore(
    certificateID: string
  ): Promise<void> {
    const isTrusted = await isTrustedCertificate(certificateID);
    if (!isTrusted) {
      return;
    }

    await execAsync(`certutil -delstore root "${certificateID}"`);
  }

  private async trustCertificate(
    trust: boolean,
    path: string,
    certificateID: string
  ): Promise<void> {
    await this.deleteCertificateFromStore(certificateID);

    if (trust) {
      await execAsync(`certutil -addstore root "${path}"`);
    }
  }

  public async configureWebProxy(
    enable: boolean,
    { host, port }: PlatformProxyInfo
  ): Promise<void> {
    return new Promise<void>(async (ok, err) => {
      try {
        const updateInternetSettingsProxy = enable
          ? `powershell -command "Set-ItemProperty -Path 'HKCU:\\Software\\Microsoft\\Windows\\CurrentVersion\\Internet Settings' -name AutoConfigURL -Value 'http://${host}:${port}/proxy.pac'"`
          : `powershell -command "Set-ItemProperty -Path 'HKCU:\\Software\\Microsoft\\Windows\\CurrentVersion\\Internet Settings' -name AutoConfigURL -Value ''"`;

        const updateInternetSettingsEnabled = enable
          ? `powershell -command "Set-ItemProperty -Path 'HKCU:\\Software\\Microsoft\\Windows\\CurrentVersion\\Internet Settings' ProxyEnable -value 1"`
          : `powershell -command "Set-ItemProperty -Path 'HKCU:\\Software\\Microsoft\\Windows\\CurrentVersion\\Internet Settings' ProxyEnable -value 0"`;

        await execAsync(`${updateInternetSettingsProxy}`);
        await execAsync(`${updateInternetSettingsEnabled}`);

        ok();
      } catch (e) {
        // failed to setup web proxy
        err(e);
      }
    });
  }
}
