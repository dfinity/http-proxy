import { Images } from '~src/interface/images';
import Electron, { BrowserWindow, Menu, MenuItem, WebContents } from 'electron';

export enum ProxyMenuItem {
  Status = 'status',
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

  public constructor(items?: ElectronMenuItem[]) {
    const template = items ?? ProxyMenu.default();
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

  static default(): ElectronMenuItem[] {
    return [
      {
        id: ProxyMenuItem.Status,
        label: 'status unknown',
        enabled: false,
      },
      { type: 'separator' },
      {
        id: ProxyMenuItem.Start,
        label: 'start',
        type: 'normal',
        icon: Images.play.resize({ width: 16, height: 16 }),
        enabled: false,
      },
      {
        id: ProxyMenuItem.Stop,
        label: 'stop',
        type: 'normal',
        icon: Images.pause.resize({ width: 16, height: 16 }),
        enabled: false,
      },
      { type: 'separator' },
      {
        id: ProxyMenuItem.Quit,
        label: 'quit',
        type: 'normal',
        icon: Images.exit.resize({ width: 16, height: 16 }),
      },
    ];
  }
}
