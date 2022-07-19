import { got } from 'got';

import { createWriteStream } from 'fs';
import { copyFile, rm } from 'fs/promises';
import { pipeline } from 'stream/promises';

import { app } from 'electron';
import { join } from 'path';
import { exists } from './exists';
import { getSHA1Hash } from './sha1';
import { ensuredir, ensurefile } from './ensure';

const CACHE_DIR = join(app.getPath('cache'), 'Spectral');

const generateSha1Cachepath = (hash: string) =>
  join(CACHE_DIR, `sha1`, hash.substring(0, 2), hash);

interface Options {
  url: string;
  // options?: OptionsOfBufferResponseBody;
  expectedHash?: string;
  destination: string;
}

const downloadRaw = async ({
  url,
  // options,
  destination,
  expectedHash,
}: Options) => {
  if (await exists(destination)) {
    if (expectedHash) {
      const hash = await getSHA1Hash(destination);
      if (hash === expectedHash) {
        // console.log('Already downloaded, hash matches, whoopee!');
        return;
      }
    }

    await rm(destination);
  }

  await ensuredir(CACHE_DIR);
  await ensurefile(destination);

  if (expectedHash && (await exists(generateSha1Cachepath(expectedHash)))) {
    // console.log(3);
    // console.log(`Using cached file (SHA-1) ${expectedHash}`);
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
      `SHA-1 hash mismatch on ${url}: ${JSON.stringify(
        expectedHash
      )} !== ${JSON.stringify(sha1Hash)}`
    );
  }

  await ensurefile(generateSha1Cachepath(sha1Hash));

  await copyFile(destination, generateSha1Cachepath(sha1Hash));

  // if (!expectedHash && etag) {
  //   await ensurefile(generateETagCachepath(etag));
  //   await copyFile(destination, generateETagCachepath(etag));
  // }
};

export const download = async (opts: Options) => {
  try {
    await downloadRaw(opts);
  } catch {
    try {
      await downloadRaw(opts);
    } catch {
      await downloadRaw(opts);
    }
  }
};
