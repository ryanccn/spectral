import { app } from 'electron';
import { got } from 'got';
import { execa } from 'execa';

import { join } from 'path';
import { tmpdir } from 'os';

import { download } from '@core/lib/download';
import { randomId } from '@core/lib/randomId';
import { ensuredir } from '/@/core/lib/ensure';

// interface ReleaseInfo {
//   available_releases: unknown[];
//   available_lts_releases: unknown[];
//   most_recent_lts: number;
//   most_recent_feature_release: number;
//   most_recent_feature_version: number;
//   tip_version: number;
// }

const adoptiumCompatibleArch = () => {
  const arch = process.arch;
  if (arch === 'arm64') return 'aarch64';
  return arch;
};

const adoptiumCompatibleOS = () => {
  const os = process.platform;
  if (os === 'darwin') return 'mac';
  if (os === 'win32') return 'win';

  return os;
};

export const getLatestJRE = async (): Promise<string> => {
  const releaseURL = new URL('https://api.adoptium.net/v3/info/release_names');
  releaseURL.searchParams.append('architecture', adoptiumCompatibleArch());
  releaseURL.searchParams.append('os', adoptiumCompatibleOS());

  releaseURL.searchParams.append('project', 'jdk');
  releaseURL.searchParams.append('image_type', 'jre');
  releaseURL.searchParams.append('release_type', 'ga');

  releaseURL.searchParams.append('page', '0');
  releaseURL.searchParams.append('page_size', '10');
  releaseURL.searchParams.append('sort_method', 'DEFAULT');
  releaseURL.searchParams.append('sort_order', 'DESC');
  releaseURL.searchParams.append('vendor', 'eclipse');

  const availableReleases = await got(releaseURL).json<{
    releases: string[];
  }>();

  return availableReleases.releases[0];
};

const installDir = join(app.getPath('userData'), 'jres');

export const installJRE = async (): Promise<void> => {
  console.log('[jre install] fetching data...');
  const latestRelease = await getLatestJRE();

  const downloadURL = `https://api.adoptium.net/v3/binary/version/${encodeURIComponent(
    latestRelease
  )}/${adoptiumCompatibleOS()}/${adoptiumCompatibleArch()}/jre/hotspot/normal/eclipse?project=jdk`;
  const dlDest = join(tmpdir(), `jre-${latestRelease}-${randomId()}.tar.gz`);

  console.log('[jre install] downloading...');
  await download({
    url: downloadURL,
    destination: dlDest,
  });

  await ensuredir(installDir);
  console.log('[jre install] unpacking...');
  await execa('tar', ['xf', dlDest, `--directory=${installDir}`]);

  console.log('[jre install] done!');
};
