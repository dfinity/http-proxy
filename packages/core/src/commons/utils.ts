import { existsSync, mkdirSync, readFile, writeFile } from 'fs';
import { dirname } from 'path';

export const saveFile = async (
  path: string,
  data: string,
  { encoding }: { encoding: BufferEncoding }
): Promise<void> => {
  const directory = dirname(path);
  createDir(directory);
  return new Promise<void>((ok, err) => {
    writeFile(path, data, { encoding }, (failed) => {
      if (failed) {
        return err(failed);
      }

      ok();
    });
  });
};

export const getFile = async (
  path: string,
  { encoding }: { encoding: BufferEncoding }
): Promise<string | null> => {
  return new Promise<string | null>((ok, err) => {
    if (!existsSync(path)) {
      return ok(null);
    }

    readFile(path, encoding, (failed, data) => {
      if (failed) {
        return err(failed);
      }

      ok(data);
    });
  });
};

export const pathExists = (path: string): boolean => {
  return existsSync(path);
};

export const createDir = (path: string): void => {
  const exists = pathExists(path);
  if (!exists) {
    mkdirSync(path, { recursive: true });
  }
};
