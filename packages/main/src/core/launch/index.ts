import { app } from 'electron';
import { execa } from 'execa';

import { Version } from '@core/install/types';

import { readFile } from 'fs/promises';
import { join } from 'path';
import { matchRule } from '../lib/matchRule';
import { randomUUID } from 'crypto';
import { javaBinaries } from './javaBinary';
import { mavenToFile } from '../lib/mavenToFile';
import pLimit from 'p-limit';
import { exists } from '../lib/exists';
import { readVersionConfig } from '../lib/versionConfig';
import { getLibraries, getNativesDir } from '../install/m1Patch';
import { getInstanceDir } from '../lib/paths';

const getJAR = async (instanceName: string) =>
  join(
    await getInstanceDir(instanceName),
    'versions',
    'default',
    'default.jar'
  );

const getFullVersion = async (instanceName: string) => {
  const versionJSON = join(
    await getInstanceDir(instanceName),
    'versions',
    'default',
    'default.json'
  );

  const version = JSON.parse(
    await readFile(versionJSON, { encoding: 'utf8' })
  ) as Version;

  return version;
};

export const classPath = async (instanceName: string) => {
  const ret: string[] = [];
  const v = await getFullVersion(instanceName);

  v.libraries.forEach((lib) => {
    if ('downloads' in lib) {
      ret.push(
        join(app.getPath('userData'), 'libraries', lib.downloads.artifact.path)
      );
    } else {
      ret.push(mavenToFile(lib.name));
    }
  });

  const { usingM1Patch } = await readVersionConfig(instanceName);
  if (usingM1Patch) ret.push(...(await getLibraries()));

  ret.push(await getJAR(instanceName));

  const lim = pLimit(10);

  await Promise.all(
    ret.map((path) =>
      lim(async () => {
        if (!(await exists(path))) {
          throw new Error(`Library ${path} is missing!`);
        }
      })
    )
  );

  return ret.join(':');
};

export const getJVMArgs = async (instanceName: string) => {
  const version = await getFullVersion(instanceName);
  const jvmRawArgs = version.arguments.jvm;

  let jvmArgs: string[] = [
    `-Dminecraft.client.jar=${getJAR(instanceName)}`,
    '-XX:+UnlockExperimentalVMOptions',
    '-XX:+UseG1GC',
    '-XX:G1NewSizePercent=20',
    '-XX:G1ReservePercent=20',
    '-XX:MaxGCPauseMillis=50',
    '-XX:G1HeapRegionSize=16m',
    '-XX:-UseAdaptiveSizePolicy',
    '-XX:-OmitStackTraceInFastThrow',
    '-XX:-DontCompileHugeMethods',
    '-Dfml.ignoreInvalidMinecraftCertificates=true',
    '-Dfml.ignorePatchDiscrepancies=true',
    '-Djava.rmi.server.useCodebaseOnly=true',
    '-Dcom.sun.jndi.rmi.object.trustURLCodebase=false',
    '-Dcom.sun.jndi.cosnaming.object.trustURLCodebase=false',
    '-Dlog4j2.formatMsgNoLookups=true',
  ];

  for (const arg of jvmRawArgs) {
    if (typeof arg === 'string') {
      jvmArgs.push(arg);
    } else {
      const { value, rules } = arg;

      if (matchRule(rules)) {
        if (Array.isArray(value)) jvmArgs = jvmArgs.concat(value);
        else jvmArgs.push(value);
      }
    }
  }

  const { usingM1Patch } = await readVersionConfig(instanceName);

  // Run substitutions
  jvmArgs = await Promise.all(
    jvmArgs.map(async (original) => {
      return original
        .replace(
          '${natives_directory}',
          usingM1Patch
            ? getNativesDir()
            : join(
                await getInstanceDir(instanceName),
                'versions',
                'default',
                'natives'
              )
        )
        .replace('${launcher_name}', app.getName())
        .replace('${launcher_version}', app.getVersion())
        .replace('${classpath}', await classPath(instanceName))
        .replace('${primary_jar}', await getJAR(instanceName))
        .replace('${classpath_separator}', ':')
        .replace(
          '${library_directory}',
          join(await getInstanceDir(instanceName), 'libraries')
        )
        .replace('${game_directory}', await getInstanceDir(instanceName));
    })
  );

  return jvmArgs;
};

export const getGameArgs = async (instanceName: string) => {
  const version = await getFullVersion(instanceName);
  const gameRawArgs = version.arguments.game;
  let gameArgs: string[] = [];

  for (const arg of gameRawArgs) {
    if (typeof arg === 'string') {
      gameArgs.push(arg);
    } else {
      const { value, rules } = arg;

      if (matchRule(rules)) {
        if (Array.isArray(value)) gameArgs = gameArgs.concat(value);
        else gameArgs.push(value);
      }
    }
  }

  // Run substitutions
  gameArgs = await Promise.all(
    gameArgs.map(async (original) => {
      return original
        .replace('${auth_player_name}', 'TestAccount')
        .replace('${version_name}', version.id)
        .replace('${game_directory}', await getInstanceDir(instanceName))
        .replace('${assets_root}', join(app.getPath('userData'), 'assets'))
        .replace('${assets_index_name}', version.assets)
        .replace('${auth_uuid}', randomUUID().replaceAll('-', ''))
        .replace('${user_type}', 'mojang')
        .replace('${version_type}', `${app.getName()} ${app.getVersion()}`);
    })
  );

  return gameArgs;
};

export const generateArguments = async (instanceName: string) => {
  const version = await getFullVersion(instanceName);
  const jvmArgs = await getJVMArgs(instanceName);
  const gameArgs = await getGameArgs(instanceName);

  return [...jvmArgs, version.mainClass, ...gameArgs];
};

export const launch = async (instanceName: string) => {
  const args = await generateArguments(instanceName);
  await execa((await javaBinaries())[0], args, {
    cwd: await getInstanceDir(instanceName),
    detached: true,
  });
};
