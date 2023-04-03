import { Images } from '~src/interface/images';
import Electron, { BrowserWindow, Menu, MenuItem, WebContents } from 'electron';

export enum ProxyMenuItem {
  EnabledStatus = 'enabled-status',
  DisabledStatus = 'disabled-status',
  Start = 'start',
  Stop = 'stop',
  Quit = 'quit',
}

export type ElectronMenuItem =
  | Electron.MenuItemConstructorOptions
  | Electron.MenuItem;

export interface ElectronClickFnOptions {
  menuItem: MenuItem;
  keyboardEvent: KeyboardEvent;
  focusedWindow: BrowserWindow | undefined;
  focusedWebContents: WebContents;
}

export type ElectronClickFn = (opts: ElectronClickFnOptions) => void;

export class ProxyMenu {
  private _menu;

  public constructor(readonly images: Images, items?: ElectronMenuItem[]) {
    const template = items ?? ProxyMenu.default(images);
    this._menu = Menu.buildFromTemplate(template);
  }

  get menu(): Menu {
    return this._menu;
  }

  onClick(itemId: ProxyMenuItem, callback: ElectronClickFn): void {
    const item = this._menu.getMenuItemById(itemId);
    if (!item) {
      return;
    }

    item.click = function (
      keyboardEvent: KeyboardEvent,
      focusedWindow: BrowserWindow | undefined,
      focusedWebContents: WebContents
    ): void {
      callback({
        menuItem: item,
        keyboardEvent,
        focusedWindow,
        focusedWebContents,
      });
    };
  }

  static default(images: Images): ElectronMenuItem[] {
    return [
      {
        id: ProxyMenuItem.EnabledStatus,
        label: 'Proxy is running',
        enabled: false,
        visible: false,
        icon: images.enabled.resize({ width: 8, height: 8 }),
      },
      {
        id: ProxyMenuItem.DisabledStatus,
        label: 'Proxy is stopped',
        enabled: false,
        visible: false,
        icon: images.disabled.resize({ width: 8, height: 8 }),
      },
      { type: 'separator' },
      {
        id: ProxyMenuItem.Start,
        label: 'start',
        type: 'normal',
        icon: images.play.resize({ width: 16, height: 16 }),
        enabled: false,
      },
      {
        id: ProxyMenuItem.Stop,
        label: 'stop',
        type: 'normal',
        icon: images.pause.resize({ width: 16, height: 16 }),
        enabled: false,
      },
      { type: 'separator' },
      {
        id: ProxyMenuItem.Quit,
        label: 'quit',
        type: 'normal',
        icon: images.exit.resize({ width: 16, height: 16 }),
      },
    ];
  }
}
