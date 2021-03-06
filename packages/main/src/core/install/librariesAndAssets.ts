import { execa } from 'execa';
import { readFile } from 'fs/promises';
import { cpus, tmpdir } from 'os';
import { join } from 'path';
import pLimit from 'p-limit';

import { download } from '@core/lib/download';
import { matchRule, checkOS } from '@core/lib/matchRule';
import { randomId } from '@core/lib/randomId';
import { mavenToFile } from '@core/lib/mavenToFile';

import type { MojangOS, Version } from './types';
import { app } from 'electron';

const PARALLELIZATION = 5;

export const downloadLibsAndAssets = async (
  versionDir: string,
  fullVersion: Version
) => {
  console.log('Downloading libraries...');

  const downloadsLimited = pLimit(PARALLELIZATION);
  let downloadsPromises: Promise<void>[] = [];

  for (const library of fullVersion.libraries) {
    if ('downloads' in library) {
      if (library.rules && !matchRule(library.rules)) {
        continue;
      }

      if (!library.downloads['artifact'].path.includes('natives')) {
        console.log(`Downloading artifact of ${library.name}`);

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
      } else {
        downloadsPromises.push(
          downloadsLimited(async () => {
            console.log('Downloading native library for', library.name);

            const downloadSource = library.downloads['artifact'];
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
    } else {
      downloadsPromises.push(
        downloadsLimited(async () => {
          console.log(`Downloading library ${library.name}`);

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

  await Promise.all(downloadsPromises);
  downloadsPromises = [];

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

  console.log('Finished downloading libraries and assets!');
};
