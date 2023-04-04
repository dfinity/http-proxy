import { nativeImage } from 'electron';
import { join } from 'node:path';

export class Images {
  static readonly path = join(__dirname, '..', 'assets');

  public constructor(private readonly isInDarkMode: boolean = false) {}

  get logo(): Electron.NativeImage {
    const image = this.isInDarkMode
      ? 'logo-white@124x124.png'
      : 'logo-color@124x124.png';

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
