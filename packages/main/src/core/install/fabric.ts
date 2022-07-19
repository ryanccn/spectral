import { readFile, rm, writeFile } from 'fs/promises';
import { join } from 'path';
import { got } from 'got';

import { ensuredir } from '@core/lib/ensure';
import { downloadLibsAndAssets } from '@core/install/librariesAndAssets';
import { getManifest } from '/@/core/install/vanilla';
import { download } from '@core/lib/download';
import { getInstanceDir, getVersionDir } from '@core/lib/paths';

import { performance } from 'perf_hooks';

import type { FabricLoaderManifest, Version } from '@core/install/types';

export interface VersionArgs {
  vanilla: string;
  loader: string;
}

const INSTALLER_URL = (versions: VersionArgs) =>
  `https://meta.fabricmc.net/v2/versions/loader/${encodeURIComponent(
    versions.vanilla
  )}/${encodeURIComponent(versions.loader)}`;

export const fetchFabricManifest = async (v: VersionArgs) => {
  return await got(INSTALLER_URL(v)).json<FabricLoaderManifest>();
};

export const install = async (name: string, versions: VersionArgs) => {
  const timeStart = performance.now();

  const v = await getManifest()
    .then((r) => r.versions.filter((k) => k.id === versions.vanilla))
    .then((r) => {
      if (r.length === 0) {
        throw new Error('vanilla version not found!');
      }
      return r;
    })
    .then((r) => r[0]);

  const instanceDir = await getInstanceDir(name);
  const versionDir = await getVersionDir(name);

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

  console.log('Downloading Fabric manifest');

  // console.log('fabric manifest:', await fetchFabricManifest(versions));

  const fabricManifest = await fetchFabricManifest(versions);

  fullVersion.libraries = fullVersion.libraries
    .concat(fabricManifest.launcherMeta.libraries.common)
    .concat(fabricManifest.launcherMeta.libraries.client)
    .concat([
      {
        name: fabricManifest.intermediary.maven,
        url: 'https://maven.fabricmc.net/',
      },
      {
        name: fabricManifest.loader.maven,
        url: 'https://maven.fabricmc.net/',
      },
    ]);

  fullVersion.mainClass =
    typeof fabricManifest.launcherMeta.mainClass === 'string'
      ? fabricManifest.launcherMeta.mainClass
      : fabricManifest.launcherMeta.mainClass.client;

  await writeFile(destJSON, JSON.stringify(fullVersion));

  console.log('Downloading main JAR');

  await download({
    url: fullVersion.downloads.client.url,
    destination: join(versionDir, `default.jar`),
    expectedHash: fullVersion.downloads.client.sha1,
  });

  await downloadLibsAndAssets(versionDir, fullVersion);

  const timeEnd = performance.now();

  console.log(`Done in ${(timeEnd - timeStart).toFixed(2)}ms!`);
};
