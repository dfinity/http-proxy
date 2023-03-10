import { exec } from "child_process";
import { resolve } from "path";
import { BACKGROUND_LOGS_PATH } from "../../background/utils";
import { envConfigs, logger } from "../../commons";
import { Platform } from "../typings";
import { execAsync } from "../utils";
import {
  PlatformConfigs
} from "./typings";
import { isTrustedCertificate } from "./utils";

export class WindowsPlatform implements Platform {
  constructor(private readonly configs: PlatformConfigs) { }

  public async attach(): Promise<void> {
    await this.trustCertificate(true, this.configs.ca.path);
  }

  public async detach(): Promise<void> {
    await this.trustCertificate(false, this.configs.ca.path);
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

    return execAsync(spawnCommand);
  }

  private async trustCertificate(trust: boolean, path: string): Promise<void> {
     // todo: pass certificate id from variable
    const certificateID = "IC HTTP Gateway CA";

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
}
