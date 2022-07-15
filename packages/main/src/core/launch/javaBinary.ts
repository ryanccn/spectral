import { app } from 'electron';
import { execa } from 'execa';
import { join } from 'path';

export const javaBinaries = async () => {
  return await execa(
    'find',
    [join(app.getPath('userData'), 'jres'), '-type', 'f', '-name', 'java'],
    { stdout: 'pipe', stderr: 'pipe' }
  )
    .then(({ stdout }) => {
      return stdout.split('\n').filter(Boolean);
    })
    .catch(() => {
      return [];
    });
};
