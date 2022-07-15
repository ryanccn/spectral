import { app } from 'electron';
import { got } from 'got';

import { ensuredir } from '/@/core/lib/ensure';
import { downloadLibsAndAssets } from '@core/install/librariesAndAssets';
import { download } from '@core/lib/download';
import type { Manifest, Version } from '@core/install/types';

import { join } from 'path';
import { readFile, rm } from 'fs/promises';
import { getInstanceDir } from '../lib/paths';
import { writeVersionConfig } from '../lib/versionConfig';

const MANIFEST_URL =
  'https://launchermeta.mojang.com/mc/game/version_manifest.json';

export const getManifest = async (): Promise<Manifest> => {
  return got(MANIFEST_URL).json<Manifest>();
};

export const install = async (
  name: string,
  vanillaVersion: string,
  includeM1Patch: boolean = false
) => {
  const timeStart = performance.now();

  const v = await getManifest().then(
    (r) => r.versions.filter((k) => k.id === vanillaVersion)[0]
  );

  const instanceDir = await getInstanceDir(name);
  const versionDir = join(instanceDir, 'versions', 'default');

  try {
    await rm(instanceDir, { recursive: true, force: true });
  } catch (e) {
    // @ts-expect-error
    if (e && e['code'] !== 'ENOENT') {
      throw e;
    }
  }
  await ensuredir(instanceDir);
  await ensuredir(versionDir);

  const destJSON = join(versionDir, `default.json`);

  console.log('Downloading version manifest');

  await download({
    url: v.url,
    destination: destJSON,
  });

  const fullVersion = JSON.parse(
    await readFile(destJSON, { encoding: 'utf8' })
  ) as Version;

  console.log('Downloading main JAR');

  await download({
    url: fullVersion.downloads.client.url,
    destination: join(versionDir, `default.jar`),
    expectedHash: fullVersion.downloads.client.sha1,
  });

  await downloadLibsAndAssets(versionDir, fullVersion, includeM1Patch);

  if (includeM1Patch) {
    await writeVersionConfig(name, { usingM1Patch: true });
  }

  const timeEnd = performance.now();

  console.log(`Done in ${(timeEnd - timeStart).toFixed(2)}ms!`);
};
