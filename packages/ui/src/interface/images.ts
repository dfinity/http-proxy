import { nativeImage } from 'electron';
import path from 'node:path';

export class Images {
  static get logo(): Electron.NativeImage {
    return nativeImage.createFromPath(
      path.join(__dirname, '..', 'assets', 'logo-white@124x124.png')
    );
  }

  static get play(): Electron.NativeImage {
    return nativeImage.createFromPath(
      path.join(__dirname, '..', 'assets', 'play-dark@128x128.png')
    );
  }

  static get pause(): Electron.NativeImage {
    return nativeImage.createFromPath(
      path.join(__dirname, '..', 'assets', 'pause-dark@128x128.png')
    );
  }

  static get exit(): Electron.NativeImage {
    return nativeImage.createFromPath(
      path.join(__dirname, '..', 'assets', 'exit-dark@128x128.png')
    );
  }

  static get enabled(): Electron.NativeImage {
    return nativeImage.createFromPath(
      path.join(__dirname, '..', 'assets', 'enabled@64x64.png')
    );
  }

  static get disabled(): Electron.NativeImage {
    return nativeImage.createFromPath(
      path.join(__dirname, '..', 'assets', 'disabled@64x64.png')
    );
  }
}
