import { got } from 'got';

import { createWriteStream } from 'fs';
import { copyFile, rm } from 'fs/promises';
import { pipeline } from 'stream/promises';

import { ensuredir, ensurefile } from './ensure';
import { app } from 'electron';
import { join } from 'path';
import { exists } from './exists';
import { execa } from 'execa';

const CACHE_DIR = join(app.getPath('cache'), 'Spectral');

const getSHA1Hash = async (file: string) =>
  await execa('shasum', ['--algorithm', '1', file]).then((r) => r.stdout);

const generateSha1Cachepath = (hash: string) =>
  join(CACHE_DIR, `sha1`, hash.substring(0, 2), hash);
const generateETagCachepath = (etag: string) =>
  join(CACHE_DIR, `etag`, etag.substring(0, 2), etag);

export const download = async ({
  url,
  // options,
  destination,
  expectedHash,
}: {
  url: string;
  // options?: OptionsOfBufferResponseBody;
  expectedHash?: string;
  destination: string;
}) => {
  if (await exists(destination)) {
    if (expectedHash) {
      const hash = await getSHA1Hash(destination);
      if (hash === expectedHash) {
        console.log('Already downloaded, hash matches, whoopee!');
        return;
      }
    }

    await rm(destination);
  }

  await ensuredir(CACHE_DIR);
  await ensurefile(destination);

  if (expectedHash && (await exists(generateSha1Cachepath(expectedHash)))) {
    // console.log(3);
    console.log(`Using cached file (SHA-1) ${expectedHash}`);
    await copyFile(generateSha1Cachepath(expectedHash), destination);
    return;
  }

  // console.log(`Downloading ${url} to ${destination}`);

  const res = got.stream(url);

  // let etag = res.headers['etag'] ?? null;
  // etag = etag ? etag.replace(/"/g, '') : null;

  // if (!expectedHash && etag && (await exists(generateETagCachepath(etag)))) {
  //   // console.log(3);
  //   // console.log(`Using cached file (ETag) ${etag}`);
  //   await copyFile(generateETagCachepath(etag), destination);
  //   return;
  // }

  // if (!res.body) {
  //   throw new Error(
  //     `failed to download ${res.url}: ${res.statusCode} ${res.statusMessage}`
  //   );
  // }

  res.on('error', (err) => {
    throw err;
  });
  await pipeline(res, createWriteStream(destination));

  const sha1Hash = await getSHA1Hash(destination);

  if (expectedHash && sha1Hash !== expectedHash) {
    throw new Error(
      `SHA-1 hash mismatch on ${url}: ${expectedHash} !== ${sha1Hash}`
    );
  }

  await ensurefile(generateSha1Cachepath(sha1Hash));

  await copyFile(destination, generateSha1Cachepath(sha1Hash));

  // if (!expectedHash && etag) {
  //   await ensurefile(generateETagCachepath(etag));
  //   await copyFile(destination, generateETagCachepath(etag));
  // }
};
