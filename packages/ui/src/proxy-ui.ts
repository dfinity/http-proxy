import {
  IPCClient,
  assertPresent,
  coreConfigs,
  logger,
  wait,
} from '@dfinity/http-proxy-core';
import { Tray, app, nativeTheme } from 'electron';
import { proxyNodeEntrypointPath } from '~src/commons/utils';
import {
  ElectronClickFnOptions,
  Images,
  ProxyMenu,
  ProxyMenuItem,
} from '~src/interface';
import { ProxyService } from '~src/services';
import { ProxyStatus, ProxyUIOptions } from '~src/typings';

export class ProxyUI {
  private tray!: Tray;
  private taskbar!: ProxyMenu;
  private readonly images: Images;
  private isStarting = false;
  private isStopping = false;
  private updater: null | NodeJS.Timeout = null;
  private static readonly maxStatusChangeMs = 20000;
  private lastStatus = ProxyStatus.Disabled;

  private constructor(
    private readonly configs: ProxyUIOptions,
    private readonly proxyService: ProxyService
  ) {
    this.images = new Images(configs.darkMode);
  }

  static async init(): Promise<void> {
    const proxyPath = await proxyNodeEntrypointPath();
    const ui = new ProxyUI(
      {
        proxy: { entrypoint: proxyPath },
        darkMode: nativeTheme.shouldUseDarkColors,
      },
      new ProxyService(new IPCClient({ path: coreConfigs.ipcChannels.proxy }))
    );

    await ui.render();
  }

  async render(): Promise<void> {
    this.tray = new Tray(this.images.logo.resize({ width: 18, height: 18 }));
    this.taskbar = new ProxyMenu(this.images);

    this.taskbar.onClick(ProxyMenuItem.Quit, this.onQuit.bind(this));
    this.taskbar.onClick(ProxyMenuItem.Start, this.onStart.bind(this));
    this.taskbar.onClick(ProxyMenuItem.Stop, this.onStop.bind(this));

    this.tray.setContextMenu(this.taskbar.menu);
    this.tray.setToolTip('IC HTTP Proxy');

    this.registerInterfaceUpdater();
  }

  async registerInterfaceUpdater(statusCheckIntervalMs = 500): Promise<void> {
    this.unregisterInterfaceUpdater();

    this.updater = setTimeout(() => {
      this.updateInterface().finally(() =>
        this.registerInterfaceUpdater(statusCheckIntervalMs)
      );
    }, statusCheckIntervalMs);
  }

  unregisterInterfaceUpdater(): void {
    if (this.updater) {
      clearTimeout(this.updater);
    }
  }

  async updateInterface(isProxyRunning?: boolean): Promise<void> {
    try {
      const isProxyProcessRunning =
        isProxyRunning ?? (await this.proxyService.isEnabled());

      const startItem = assertPresent(
        this.taskbar.menu.getMenuItemById(ProxyMenuItem.Start)
      );
      const stopItem = assertPresent(
        this.taskbar.menu.getMenuItemById(ProxyMenuItem.Stop)
      );
      const enabledStatusItem = assertPresent(
        this.taskbar.menu.getMenuItemById(ProxyMenuItem.EnabledStatus)
      );
      const disabledStatusItem = assertPresent(
        this.taskbar.menu.getMenuItemById(ProxyMenuItem.DisabledStatus)
      );
      const stoppingStatusItem = assertPresent(
        this.taskbar.menu.getMenuItemById(ProxyMenuItem.StoppingStatus)
      );
      const startingStatusItem = assertPresent(
        this.taskbar.menu.getMenuItemById(ProxyMenuItem.StartingStatus)
      );

      const shouldBlockActionButtons = this.isStarting || this.isStopping;

      if (
        isProxyProcessRunning &&
        this.lastStatus !== ProxyStatus.Enabled &&
        !shouldBlockActionButtons
      ) {
        this.lastStatus = ProxyStatus.Enabled;

        this.tray.setImage(
          this.images.logoEnabled.resize({ width: 18, height: 18 })
        );
      } else if (
        !isProxyProcessRunning &&
        this.lastStatus !== ProxyStatus.Disabled &&
        !shouldBlockActionButtons
      ) {
        this.lastStatus = ProxyStatus.Disabled;

        this.tray.setImage(this.images.logo.resize({ width: 18, height: 18 }));
      }

      if (shouldBlockActionButtons) {
        startItem.enabled = false;
        stopItem.enabled = false;
      } else {
        startItem.enabled = !isProxyProcessRunning;
        stopItem.enabled = isProxyProcessRunning;
      }

      startingStatusItem.visible = this.isStarting;
      stoppingStatusItem.visible = this.isStopping;
      enabledStatusItem.visible =
        isProxyProcessRunning && !this.isStarting && !this.isStopping;
      disabledStatusItem.visible =
        !isProxyProcessRunning && !this.isStarting && !this.isStopping;

      this.refreshUI();
    } catch (e) {
      logger.error(`Failed to update statuses(${String(e)})`);
    }
  }

  async onStart(): Promise<void> {
    let isProxyProcessRunning = await this.proxyService.isEnabled();
    if (isProxyProcessRunning) {
      return;
    }
    this.unregisterInterfaceUpdater();

    try {
      this.isStarting = true;
      await this.updateInterface(isProxyProcessRunning);

      await this.proxyService.startProxyServers(this.configs.proxy.entrypoint);

      let timeSpent = 0;
      const checkInterval = 250;
      do {
        await wait(checkInterval);
        timeSpent += checkInterval;

        isProxyProcessRunning = await this.proxyService.isEnabled();
      } while (!isProxyProcessRunning && timeSpent < ProxyUI.maxStatusChangeMs);

      await this.updateInterface(isProxyProcessRunning);

      if (!isProxyProcessRunning) {
        logger.error(`Proxy start event timeout`);
      }
    } catch (e) {
      logger.error(`Failed to start proxy(${String(e)})`);
    } finally {
      this.isStarting = false;
    }

    this.registerInterfaceUpdater();
  }

  async onStop(): Promise<void> {
    let isProxyProcessRunning = await this.proxyService.isEnabled();
    if (!isProxyProcessRunning) {
      return;
    }
    this.unregisterInterfaceUpdater();
    try {
      this.isStopping = true;
      await this.updateInterface(isProxyProcessRunning);

      await this.proxyService.stopServers();

      let timeSpent = 0;
      const checkInterval = 250;
      do {
        await wait(checkInterval);
        timeSpent += checkInterval;

        isProxyProcessRunning = await this.proxyService.isEnabled();
      } while (isProxyProcessRunning && timeSpent < ProxyUI.maxStatusChangeMs);

      await this.updateInterface(isProxyProcessRunning);

      if (isProxyProcessRunning) {
        logger.error(`Proxy stop event timeout`);
      }
    } catch (e) {
      logger.error(`Failed to stop proxy(${String(e)})`);
    } finally {
      this.isStopping = false;
    }

    this.registerInterfaceUpdater();
  }

  async onQuit(opts: ElectronClickFnOptions): Promise<void> {
    this.unregisterInterfaceUpdater();
    opts.menuItem.enabled = false;

    const isProxyProcessRunning = await this.proxyService.isEnabled();
    if (isProxyProcessRunning) {
      await this.proxyService.stopServers();
    }

    this.refreshUI();
    app.quit();
  }

  refreshUI(): void {
    this.tray.setContextMenu(this.taskbar.menu);
  }
}
