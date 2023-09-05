import { nativeImage } from 'electron';
import { join } from 'node:path';

export class Images {
  static readonly path = join(__dirname, '..', 'assets');

  public constructor(private readonly isInDarkMode: boolean = false) {}

  get tray(): string {
    if (process.platform === 'darwin') {
      return join(Images.path, 'tray-Template.png');
    }

    if (process.platform === 'linux') {
      return join(Images.path, 'tray-dark.png');
    }

    const image = this.isInDarkMode ? 'tray-dark.png' : 'tray-light.png';

    return join(Images.path, image);
  }

  get trayEnabled(): string {
    if (process.platform === 'darwin') {
      return join(Images.path, 'tray-enabled-Template.png');
    }

    if (process.platform === 'linux') {
      return join(Images.path, 'tray-dark-enabled.png');
    }

    const image = this.isInDarkMode
      ? 'tray-dark-enabled.png'
      : 'tray-light-enabled.png';

    return join(Images.path, image);
  }

  get logo(): Electron.NativeImage {
    const image = this.isInDarkMode
      ? 'logo-dark@124x124.png'
      : 'logo-light@124x124.png';

    return nativeImage.createFromPath(join(Images.path, image));
  }

  get logoEnabled(): Electron.NativeImage {
    const image = this.isInDarkMode
      ? 'logo-dark-enabled@124x124.png'
      : 'logo-light-enabled@124x124.png';

    return nativeImage.createFromPath(join(Images.path, image));
  }

  get play(): Electron.NativeImage {
    const image = this.isInDarkMode
      ? 'play-dark@128x128.png'
      : 'play-light@128x128.png';

    return nativeImage.createFromPath(join(Images.path, image));
  }

  get pause(): Electron.NativeImage {
    const image = this.isInDarkMode
      ? 'pause-dark@128x128.png'
      : 'pause-light@128x128.png';

    return nativeImage.createFromPath(join(Images.path, image));
  }

  get exit(): Electron.NativeImage {
    const image = this.isInDarkMode
      ? 'exit-dark@128x128.png'
      : 'exit-light@128x128.png';

    return nativeImage.createFromPath(join(Images.path, image));
  }

  get enabled(): Electron.NativeImage {
    const image = 'enabled@64x64.png';

    return nativeImage.createFromPath(join(Images.path, image));
  }

  get disabled(): Electron.NativeImage {
    const image = 'disabled@64x64.png';

    return nativeImage.createFromPath(join(Images.path, image));
  }

  get pending(): Electron.NativeImage {
    const image = 'pending@64x64.png';

    return nativeImage.createFromPath(join(Images.path, image));
  }
}
