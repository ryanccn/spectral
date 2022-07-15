import { app } from 'electron';
import { join } from 'path';

export const mavenToFile = (mavenId: string) => {
  const [org, pkg, version] = mavenId.split(':').filter(Boolean);

  return join(
    app.getPath('userData'),
    'libraries',
    ...org.split('.'),
    pkg,
    version,
    `${pkg}-${version}.jar`
  );
};
