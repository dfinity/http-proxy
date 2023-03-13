import { exec } from "child_process";
import { resolve } from "path";
import { BACKGROUND_LOGS_PATH } from "../../background/utils";
import { envConfigs } from "../../commons";
import { Platform, PlatformProxyInfo } from "../typings";
import { execAsync } from "../utils";
import { PlatformConfigs } from "./typings";
import { isTrustedCertificate } from "./utils";

export class WindowsPlatform implements Platform {
  constructor(private readonly configs: PlatformConfigs) { }

  public async attach(): Promise<void> {
    await this.trustCertificate(true, this.configs.ca.path, this.configs.ca.commonName);
    await this.configureWebProxy(true, {
      host: this.configs.proxy.host,
      port: this.configs.proxy.port,
    });
  }

  public async detach(): Promise<void> {
    await this.trustCertificate(false, this.configs.ca.path, this.configs.ca.commonName);
    await this.configureWebProxy(false, {
      host: this.configs.proxy.host,
      port: this.configs.proxy.port,
    });
  }

  public async spawnTaskManager(): Promise<void> {
    const command = [
      `node`,
      ...process.execArgv, 
      resolve(envConfigs.rootPath, 'background', 'main.js'), 
      `>>`,
      BACKGROUND_LOGS_PATH
    ].join(" ");

    const spawnCommand = `powershell -command "start-process -windowstyle hidden cmd -verb runas -argumentlist '/c set TASK_MANAGER=1 && ${command}'"`;

    await execAsync(spawnCommand);
  }

  private async trustCertificate(trust: boolean, path: string, certificateID: string): Promise<void> {
    const isTrusted = await isTrustedCertificate(certificateID);
    const shouldContinue = trust ? !isTrusted : isTrusted;
    if (!shouldContinue) {
      return;
    }

    const command = trust
      ? `certutil -addstore root "${path}"`
      : `certutil -delstore root "${certificateID}"`;

    return new Promise<void>((ok, err) => {
      exec(`${command}`, (error, ...args) => {
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
        const updateInternetSettingsProxy = enable 
          ? `powershell -command "Set-ItemProperty -Path 'HKCU:\\Software\\Microsoft\\Windows\\CurrentVersion\\Internet Settings' -name ProxyServer -Value 'http://${host}:${port}'"` 
          : `powershell -command "Set-ItemProperty -Path 'HKCU:\\Software\\Microsoft\\Windows\\CurrentVersion\\Internet Settings' -name ProxyServer -Value ''"`;

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
