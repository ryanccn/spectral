import { mkdir } from 'fs/promises';
import { dirname } from 'path';

export const ensuredir = async (path: string) => {
  try {
    await mkdir(path, { recursive: true });
  } catch (e) {
    // @ts-expect-error
    if (e instanceof Error && e.code !== 'EEXIST') throw e;
  }
};

export const ensurefile = async (path: string) => {
  await ensuredir(dirname(path));
};
