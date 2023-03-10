import { exec } from "child_process";
import findProcess from "find-process";
import net from "net";
import { basename, dirname, resolve } from "path";
import { envConfigs, getFile } from "../commons";
import { Platform } from "../platforms";
import {
  BackgroundEventMessage,
  BackgroundEventTypes,
  BackgroundResultMessage,
} from "./typings";
import { BACKGROUND_LOGS_PATH, ONLINE_DESCRIPTOR } from "./utils";

export class BackgroundProcess {
  private constructor(private readonly platform: Platform) {}

  private async spawn(): Promise<void> {
    const [nodePath, currentEntryFilePath] = process.argv;
    const backgroundFilePath = resolve(
      dirname(currentEntryFilePath),
      "background",
      basename(currentEntryFilePath)
    );

    // spawns a new process with admin privileges to keep system updated
    const startCommand = [
      nodePath,
      ...process.execArgv,
      backgroundFilePath,
    ].join(" ");
    const command = this.platform.addCommandAdminPrivileges(
      this.platform.addCommandDetachArgs(startCommand, BACKGROUND_LOGS_PATH),
      "IC HTTP Proxy needs your permission to create a secure environment"
    );

    return new Promise<void>((ok, err) => {
      exec(command, (error) => {
        if (error) {
          return err(error);
        }

        let retryCheckProcessSpawned = 5;
        const interval = setInterval(async () => {
          --retryCheckProcessSpawned;
          const isRunning = await this.isAlreadyRunning();
          if (isRunning) {
            clearInterval(interval);
            return ok();
          }

          if (!retryCheckProcessSpawned) {
            clearInterval(interval);
            return err("Failed to create task manager");
          }
        }, 1000);
      });
    });
  }

  public async processMessage(
    event: BackgroundEventMessage
  ): Promise<BackgroundResultMessage> {
    return new Promise<BackgroundResultMessage>((ok, err) => {
      const socket = net.createConnection(
        {
          host: envConfigs.backgroundServer.host,
          port: envConfigs.backgroundServer.port,
        },
        () => {
          socket.write(JSON.stringify(event));
          socket.on("error", (error) => {
            err(error);
          });

          socket.on("data", (data) => {
            const result = JSON.parse(
              data.toString()
            ) as BackgroundResultMessage;

            ok(result);
          });
        }
      );
    });
  }

  private async isAlreadyRunning(): Promise<boolean> {
    const pid = await getFile(ONLINE_DESCRIPTOR, { encoding: "utf8" });
    if (!pid) {
      return false;
    }

    const info = await findProcess("pid", Number(pid), true);
    const processIsRunning = !!info.length;
    if (!processIsRunning) {
      return false;
    }

    const canProcessMessage = await this.processMessage({
      type: BackgroundEventTypes.Ping,
    })
      .then(() => true)
      .catch(() => false);

    return canProcessMessage;
  }

  public static async init(platform: Platform): Promise<BackgroundProcess> {
    const process = new BackgroundProcess(platform);
    const isRunning = await process.isAlreadyRunning();

    // only spawn a new process if there's none already running
    if (!isRunning) {
      await process.spawn();
    }

    return process;
  }
}
