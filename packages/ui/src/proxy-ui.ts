import {
  IPCClient,
  assertPresent,
  coreConfigs,
  logger,
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
import { ProxyUIOptions } from '~src/typings';

export class ProxyUI {
  private tray!: Tray;
  private taskbar!: ProxyMenu;
  private shouldResolveStatuses = true;
  private readonly images: Images;

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

    this.attachStatusUpdater();
  }

  async attachStatusUpdater(statusCheckIntervalMs = 1000): Promise<void> {
    try {
      if (this.shouldResolveStatuses) {
        const isProxyProcessRunning = await this.proxyService.isEnabled();
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

        startItem.enabled = !isProxyProcessRunning;
        stopItem.enabled = isProxyProcessRunning;
        enabledStatusItem.visible = isProxyProcessRunning;
        disabledStatusItem.visible = !isProxyProcessRunning;

        this.refreshUI();
      }
    } catch (e) {
      logger.error(`Failed to update statuses(${String(e)})`);
    } finally {
      setTimeout(() => this.attachStatusUpdater(), statusCheckIntervalMs);
    }
  }

  async onStart(): Promise<void> {
    const isProxyProcessRunning = await this.proxyService.isEnabled();
    if (isProxyProcessRunning) {
      return;
    }

    this.shouldResolveStatuses = false;
    this.proxyService
      .startProxyServers(this.configs.proxy.entrypoint)
      .finally(() => {
        this.shouldResolveStatuses = true;
      });
  }

  async onStop(): Promise<void> {
    const isProxyProcessRunning = await this.proxyService.isEnabled();
    if (!isProxyProcessRunning) {
      return;
    }

    this.shouldResolveStatuses = false;
    this.proxyService.stopServers().finally(() => {
      this.shouldResolveStatuses = true;
    });
  }

  async onQuit(opts: ElectronClickFnOptions): Promise<void> {
    this.shouldResolveStatuses = false;
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
