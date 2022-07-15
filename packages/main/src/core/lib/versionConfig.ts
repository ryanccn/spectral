import { readFile, writeFile } from 'fs/promises';
import { join } from 'path';
import { z } from 'zod';
import { getInstanceDir } from './paths';

export const SpectralConfigZod = z.object({
  usingM1Patch: z.boolean().default(false),
});

export type SpectralConfigType = z.infer<typeof SpectralConfigZod>;

export const getConfigPath = async (name: string) =>
  join(await getInstanceDir(name), 'spectralconfig.json');

export const writeVersionConfig = async (
  instanceName: string,
  config: Partial<SpectralConfigType>
): Promise<void> => {
  await writeFile(
    await getConfigPath(instanceName),
    JSON.stringify(SpectralConfigZod.parse(config))
  );
};

export const readVersionConfig = async (
  instanceName: string
): Promise<SpectralConfigType> => {
  const jsonContent = JSON.parse(
    await readFile(await getConfigPath(instanceName), { encoding: 'utf-8' })
  );
  const parseResult = SpectralConfigZod.safeParse(jsonContent);

  if (!parseResult.success) {
    await writeVersionConfig(instanceName, {});
    return SpectralConfigZod.parse({});
  }

  return parseResult.data;
};
