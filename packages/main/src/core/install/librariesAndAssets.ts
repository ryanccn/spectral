import { execa } from 'execa';
import { readFile } from 'fs/promises';
import { cpus, tmpdir } from 'os';
import { join } from 'path';
import pLimit from 'p-limit';

import { download } from '@core/lib/download';
import { matchRule, checkOS } from '@core/lib/matchRule';
import { randomId } from '@core/lib/randomId';

import type { MojangOS, Version } from './types';
import { app } from 'electron';
import { mavenToFile } from '../lib/mavenToFile';
import { installM1Patch } from './m1Patch';

const PARALLELIZATION = cpus().length / 2;

export const downloadLibsAndAssets = async (
  versionDir: string,
  fullVersion: Version,
  includeM1Patch: boolean
) => {
  const downloadsLimited = pLimit(PARALLELIZATION);
  const downloadsPromises: Promise<void>[] = [];

  for (const library of fullVersion.libraries) {
    // console.log(`Downloading library ${library.name}`);

    if (
      includeM1Patch &&
      (library.name.includes('lwjgl') || library.name.includes('objc-bridge'))
    ) {
      console.warn('skipping', library.name, 'as M1 patching is enabled');
      continue;
    }

    if ('downloads' in library) {
      if (library.rules && !matchRule(library.rules)) {
        continue;
      }

      if (library.downloads['artifact']) {
        // console.log(`Downloading artifact of ${library.name}`);

        downloadsPromises.push(
          downloadsLimited(() =>
            download({
              url: library.downloads['artifact'].url,
              destination: join(
                app.getPath('userData'),
                'libraries',
                library.downloads['artifact'].path
              ),
              expectedHash: library.downloads['artifact'].sha1,
            })
          )
        );
      }

      if (library.natives) {
        for (const native of Object.keys(library.natives) as MojangOS[]) {
          if (!checkOS(native)) {
            continue;
          }

          const libraryNatives = library.natives;

          downloadsPromises.push(
            downloadsLimited(async () => {
              console.log('Downloading native library for', library.name);

              const downloadSource =
                library.downloads.classifiers[libraryNatives[native]];
              const tmpJAR = join(
                tmpdir(),
                `${library.name}-native-${randomId()}.jar`
              );

              await download({
                url: downloadSource.url,
                destination: tmpJAR,
                expectedHash: downloadSource.sha1,
              });

              console.log('Unpacking native JAR of', library.name);

              /** @todo this is macOS specific */
              await execa(
                'unzip',
                [
                  '-o',
                  tmpJAR,
                  process.platform === 'darwin'
                    ? '*.dylib'
                    : process.platform === 'linux'
                    ? '*.so'
                    : '*.dll',
                  '-d',
                  join(versionDir, 'natives'),
                ],
                { stdout: 'inherit', stderr: 'inherit' }
              );
            })
          );
        }
      }
    } else {
      downloadsPromises.push(
        downloadsLimited(async () => {
          const [org, pkg, version] = library.name.split(':').filter(Boolean);
          const downloadURL = `https://maven.fabricmc.net/${org
            .split('.')
            .join('/')}/${encodeURIComponent(pkg)}/${encodeURIComponent(
            version
          )}/${encodeURIComponent(`${pkg}-${version}`)}.jar`;

          await download({
            url: downloadURL,
            destination: mavenToFile(library.name),
          });
        })
      );
    }
  }

  if (includeM1Patch) {
    await installM1Patch();
  }

  console.log('Downloading assets...');

  const assetIndexPath = join(
    app.getPath('userData'),
    'assets',
    'indexes',
    `${fullVersion.assetIndex.id}.json`
  );

  await download({
    url: fullVersion.assetIndex.url,
    destination: assetIndexPath,
    expectedHash: fullVersion.assetIndex.sha1,
  });

  const assetIndex = JSON.parse(
    await readFile(assetIndexPath, { encoding: 'utf8' })
  ) as { objects: { [key: string]: { hash: string } } };

  Object.entries(assetIndex.objects).forEach(([key, { hash }]) => {
    downloadsPromises.push(
      downloadsLimited(() =>
        (async () => {
          console.log(`Downloading asset ${key}`);

          await download({
            url: `https://resources.download.minecraft.net/${hash.substring(
              0,
              2
            )}/${hash}`,
            destination: join(
              app.getPath('userData'),
              'assets',
              'objects',
              hash.substring(0, 2),
              hash
            ),
            expectedHash: hash,
          });
        })()
      )
    );
  });

  await Promise.all(downloadsPromises);

  if (includeM1Patch) {
    console.log('Downloading M1 patch...');
    await installM1Patch();
  }

  console.log('Finished downloading libraries and assets!');
};
