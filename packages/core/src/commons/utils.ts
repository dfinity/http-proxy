import { exec } from 'child_process';
import { promisify } from 'node:util';
import {
  writeFile,
  readFile,
  access,
  mkdir,
  constants,
  lstat,
  readdir,
} from 'node:fs/promises';
import { dirname } from 'node:path';
import { SupportedPlatforms } from '~src/main';

export const saveFile = async (
  path: string,
  data: string,
  { encoding }: { encoding: BufferEncoding }
): Promise<void> => {
  const directory = dirname(path);
  createDir(directory);
  return await writeFile(path, data, { encoding });
};

export const getFile = async (
  path: string,
  { encoding }: { encoding: BufferEncoding }
): Promise<string | null> => {
  const fileExists = await pathExists(path);
  if (!fileExists) {
    return null;
  }

  return await readFile(path, encoding);
};

export const pathExists = async (path: string): Promise<boolean> => {
  try {
    await access(path, constants.F_OK);
    return true;
  } catch (error) {
    return false;
  }
};

const isDirectory = async (path: string): Promise<boolean> => {
  const stat = await lstat(path);

  return stat.isDirectory();
};

export const createDir = async (path: string): Promise<void> => {
  const exists = await pathExists(path);
  if (!exists) {
    await mkdir(path, { recursive: true });
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

const execPromise = promisify(exec);
export const execAsync = async (command: string): Promise<string> => {
  const { stdout } = await execPromise(command, { env: process.env });
  return stdout;
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
  let tries = Math.max(0, retries ?? 0);
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

export const getFiles = async (
  directoryPath: string,
  extensions?: string[]
): Promise<string[]> => {
  const pathExistsAndIsDir =
    (await pathExists(directoryPath)) && (await isDirectory(directoryPath));
  if (!pathExistsAndIsDir) {
    return [];
  }

  const dirents = await readdir(directoryPath, { withFileTypes: true });
  const files = dirents.reduce<string[]>((accum, file) => {
    if (!file.isFile()) {
      return accum;
    }

    const shouldFilterExtension = extensions && extensions.length > 0;
    if (!shouldFilterExtension) {
      accum.push(file.name);
      return accum;
    }

    const parts = file.name.split('.');
    const extension = parts.length > 1 ? parts[parts.length - 1] : '';
    if (extensions.includes(extension)) {
      accum.push(file.name);
    }

    return accum;
  }, []);

  return files;
};
