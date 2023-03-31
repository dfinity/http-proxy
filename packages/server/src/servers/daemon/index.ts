import { IPCClient, ResultMessage, wait } from '@dfinity/http-proxy-core';
import { EnableProxyMessage, MessageType } from '@dfinity/http-proxy-daemon';
import { environment } from '~src/commons';
import { MissingRequirementsError } from '~src/errors';
import { EnableProxyOptions } from '~src/servers/daemon/typings';
import {
  WAIT_INTERVAL_CHECK_MS,
  WAIT_UNTIL_ACTIVE_MS,
  spawnDaemonProcess,
} from '~src/servers/daemon/utils';

export class DaemonProcess {
  public constructor(private readonly ipcClient: IPCClient) {}

  public async start(): Promise<void> {
    const isAlreadyRunning = await this.isRunning();
    if (isAlreadyRunning) {
      return;
    }

    await spawnDaemonProcess(environment.platform, '/tmp/ic-http-daemon.logs');

    await this.waitUntilActive();
  }

  public shutdown(): void {
    this.ipcClient.sendMessage({ type: MessageType.DisableProxy }).catch(() => {
      // do nothing if the daemon is already shutdown
    });
  }

  public async enableProxy(opts: EnableProxyOptions): Promise<ResultMessage> {
    const message: EnableProxyMessage = {
      type: MessageType.EnableProxy,
      certificatePath: opts.certificate.path,
      commonName: opts.certificate.commonName,
      host: opts.proxy.host,
      port: opts.proxy.port,
    };

    return this.ipcClient.sendMessage(message);
  }

  private async isRunning(): Promise<boolean> {
    return this.ipcClient
      .sendMessage({ type: 'ping' })
      ?.then((result) => result.processed)
      .catch(() => false);
  }

  private async waitUntilActive(
    timeout: number = WAIT_UNTIL_ACTIVE_MS,
    intervalCheckMs = WAIT_INTERVAL_CHECK_MS
  ): Promise<void> {
    let elapsedTime = 0;
    do {
      const isRunning = await this.isRunning();
      if (isRunning) {
        // daemon is active and ready to receive messages
        return;
      }

      await wait(intervalCheckMs);
      elapsedTime += intervalCheckMs;
    } while (elapsedTime < timeout);

    throw new MissingRequirementsError(`Daemon process failed to activate`);
  }
}
