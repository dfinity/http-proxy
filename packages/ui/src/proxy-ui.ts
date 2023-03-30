import { Tray, app } from 'electron';
import {
  ElectronClickFnOptions,
  Images,
  ProxyMenu,
  ProxyMenuItem,
} from '~src/interface';

export class ProxyUI {
  tray!: Tray;
  taskbar!: ProxyMenu;

  private constructor() {
    // allowed empty private constructor
  }

  static async init(): Promise<void> {
    const ui = new ProxyUI();

    await ui.render();
  }

  async render(): Promise<void> {
    this.tray = new Tray(Images.logo.resize({ width: 18, height: 18 }));
    this.taskbar = new ProxyMenu();

    this.taskbar.onClick(ProxyMenuItem.Quit, this.quit.bind(this));

    this.tray.setContextMenu(this.taskbar.menu);
    this.tray.setToolTip('IC HTTP Proxy');
  }

  async quit(opts: ElectronClickFnOptions): Promise<void> {
    opts.menuItem.enabled = false;
    this.refreshUI();

    app.quit();
  }

  refreshUI(): void {
    this.tray.setContextMenu(this.taskbar.menu);
  }
}
