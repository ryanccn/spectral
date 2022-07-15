import { app } from 'electron';
import { join } from 'path';
import { ensuredir } from './ensure';

const INSTANCE_BASE_DIR = join(app.getPath('userData'), 'instances');

export const getInstanceDir = async (name: string) => {
  const ret = join(INSTANCE_BASE_DIR, name);
  await ensuredir(ret);
  return ret;
};

export const getVersionDir = async (name: string) => {
  const ret = join(await getInstanceDir(name), 'versions', 'default');
  await ensuredir(ret);
  return ret;
};
