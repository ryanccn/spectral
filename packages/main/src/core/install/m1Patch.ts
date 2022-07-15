// import dgr from 'download-git-repo';
import { app } from 'electron';
import { execa } from 'execa';
import { readdir } from 'fs/promises';
import { tmpdir } from 'os';
import { join } from 'path';
import { download } from '../lib/download';
import { randomId } from '../lib/randomId';

const M1_PATCH_PATH = join(app.getPath('userData'), 'm1-patch');

export const installM1Patch = async () => {
  const zipTarget = join(tmpdir(), `m1-patch-${randomId()}.zip`);

  await download({
    url: 'https://codeload.github.com/ryanccn/spectral-m1-support/zip/refs/heads/main',
    destination: zipTarget,
  });

  await execa('unzip', ['-o', zipTarget, '-d', M1_PATCH_PATH], {
    stdout: 'inherit',
    stderr: 'inherit',
  });
};

export const getLibraries = async () => {
  const dir = join(M1_PATCH_PATH, 'libraries');

  return (await readdir(dir)).map((k) => join(dir, k));
};

export const getNativesDir = () => join(M1_PATCH_PATH, 'natives');
