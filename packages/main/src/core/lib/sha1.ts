import { createHash } from 'crypto';
import { createReadStream } from 'fs';

export const getSHA1Hash = (path: string): Promise<string> => {
  return new Promise((resolve, reject) => {
    const hash = createHash('sha1');
    const input = createReadStream(path);

    input.on('error', reject);
    input.on('data', (chunk) => {
      hash.update(chunk);
    });
    input.on('close', () => {
      resolve(hash.digest('hex'));
    });
  });
};
