import { exec } from 'child_process';
import {
  existsSync,
  lstatSync,
  mkdirSync,
  readFile,
  readdirSync,
  writeFile,
} from 'fs';
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

export const retryClosure = async <T = unknown>(
  asyncExecFn: () => Promise<T>,
  doAfterFailFn?: () => Promise<void>,
  retries = 2
): Promise<T> => {
  let result: T;
  let tries = retries && retries < 0 ? 0 : retries;
  do {
    try {
      result = await asyncExecFn();
      return result;
    } catch (e) {
      if (tries === 0) {
        throw e;
      }

      if (doAfterFailFn) {
        await doAfterFailFn();
      }
    }
    --tries;
  } while (tries > 0);

  throw new Error(`Retry closure failed all options`);
};

export const getFiles = (
  directoryPath: string,
  extensions?: string[]
): string[] => {
  const files: string[] = [];
  const isDirectory =
    pathExists(directoryPath) && lstatSync(directoryPath).isDirectory();
  if (!isDirectory) {
    return [];
  }

  readdirSync(directoryPath, {
    withFileTypes: true,
  }).forEach((file) => {
    if (!file.isFile()) {
      return;
    }

    const shouldFilterExtension = extensions && extensions.length > 0;
    if (!shouldFilterExtension) {
      files.push(file.name);
      return;
    }

    const parts = file.name.split('.');
    const extension = parts.length > 1 ? parts[parts.length - 1] : '';
    if (extensions.includes(extension)) {
      files.push(file.name);
    }
  });

  return files;
};

export const getDirectories = (directoryPath: string): string[] => {
  const directories: string[] = [];
  const isDirectory =
    pathExists(directoryPath) && lstatSync(directoryPath).isDirectory();
  if (!isDirectory) {
    return [];
  }

  readdirSync(directoryPath, {
    withFileTypes: true,
  }).forEach((entry) => {
    if (!entry.isDirectory()) {
      return;
    }

    directories.push(entry.name);
  });

  return directories;
};
