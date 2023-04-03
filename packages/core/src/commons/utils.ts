import { exec } from 'child_process';
import { existsSync, mkdirSync, readFile, writeFile } from 'fs';
import { dirname } from 'path';
import { SupportedPlatforms } from '~src/main';

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

export const isSupportedPlatform = (platform: string): boolean => {
  return Object.values(SupportedPlatforms)
    .map(String)
    .some((supported) => supported.toLowerCase() === platform.toLowerCase());
};

export const wait = (numberMs = 100): Promise<void> => {
  return new Promise<void>((ok) => {
    setTimeout(() => ok(), numberMs);
  });
};

export const execAsync = async (command: string): Promise<string> => {
  return new Promise<string>((ok, err) => {
    exec(command, { env: process.env }, (error, stdout) => {
      if (error) {
        return err(error);
      }

      ok(stdout);
    });
  });
};

export const assertPresent = <T>(
  value: T,
  name = 'unknown'
): NonNullable<T> => {
  if (value === null || value === undefined) {
    throw new Error(`${name} is not present`);
  }

  return value;
};
