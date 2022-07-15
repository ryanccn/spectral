#!/usr/bin/env node

const { createServer, build, createLogger } = require('vite');
const electronPath = require('electron');
const { spawn } = require('child_process');

/** @type 'production' | 'development'' */
const mode = (process.env.MODE = process.env.MODE || 'development');

/** @type {import('vite').LogLevel} */
const LOG_LEVEL = 'info';

/** @type {import('vite').InlineConfig} */
const sharedConfig = {
  mode,
  build: {
    watch: {},
  },
  logLevel: LOG_LEVEL,
};

/** Messages on stderr that match any of the contained patterns will be stripped from output */
const stderrFilterPatterns = [
  // warning about devtools extension
  // https://github.com/cawa-93/vite-electron-builder/issues/492
  // https://github.com/MarshallOfSound/electron-devtools-installer/issues/143
  /ExtensionLoadWarning/,
];

/**
 *
 * @param {{name: string; configFile: string; writeBundle: import('rollup').OutputPlugin['writeBundle'] }} param0
 * @returns {import('rollup').RollupWatcher}
 */
const getWatcher = ({ name, configFile, writeBundle }) => {
  return build({
    ...sharedConfig,
    configFile,
    plugins: [{ name, writeBundle }],
  });
};

/** @type {ChildProcessWithoutNullStreams | null} */
let mainSpawnProcess = null;

const restartMain = () => {
  const logger = createLogger(LOG_LEVEL, {
    prefix: '[main]',
  });

  if (mainSpawnProcess !== null) {
    mainSpawnProcess.kill('SIGINT');
    mainSpawnProcess = null;
  }

  mainSpawnProcess = spawn(String(electronPath), ['.']);

  mainSpawnProcess.stdout.on(
    'data',
    (d) => d.toString().trim() && logger.warn(d.toString(), { timestamp: true })
  );
  mainSpawnProcess.stderr.on('data', (d) => {
    const data = d.toString().trim();
    if (!data) return;
    const mayIgnore = stderrFilterPatterns.some((r) => r.test(data));
    if (mayIgnore) return;
    logger.error(data, { timestamp: true });
  });
};

/**
 * Start or restart App when main files are changed
 * @param {import('vite').ViteDevServer} viteDevServer
 * @returns {Promise<import('vite').RollupOutput | Array<import('vite').RollupOutput> | import('vite').RollupWatcher>}
 */
const setupMainPackageWatcher = (viteDevServer) => {
  // Write a value to an environment variable to pass it to the main process.
  {
    const protocol = `http${viteDevServer.config.server.https ? 's' : ''}:`;
    const host = viteDevServer.config.server.host || 'localhost';
    const port = viteDevServer.config.server.port; // Vite searches for and occupies the first free port: 3000, 3001, 3002 and so on
    const path = '/';
    process.env.VITE_DEV_SERVER_URL = `${protocol}//${host}:${port}${path}`;
  }

  return getWatcher({
    name: 'reload-app-on-main-package-change',
    configFile: 'packages/main/vite.config.ts',
    writeBundle() {
      restartMain();
    },
  });
};

// /**
//  * Start or restart App when core files are changed
//  * @param {import('vite').ViteDevServer} viteDevServer
//  * @returns {Promise<import('vite').RollupOutput | Array<import('vite').RollupOutput> | import('vite').RollupWatcher>}
//  */
// const setupCorePackageWatcher = () => {
//   return getWatcher({
//     name: 'reload-app-on-core-package-change',
//     configFile: 'packages/core/vite.config.ts',
//     writeBundle() {

//       if (!firstStartup) restartMain();
//     },
//   });
// };

/**
 * Reload web app when preload packages are changed
 * @param {import('vite').ViteDevServer} viteDevServer
 * @returns {Promise<import('vite').RollupOutput | Array<import('vite').RollupOutput> | import('vite').RollupWatcher>}
 */
const setupPreloadPackageWatcher = (viteDevServer) => {
  return getWatcher({
    name: 'reload-page-on-preload-package-change',
    configFile: 'packages/preload/vite.config.ts',
    writeBundle() {
      viteDevServer.ws.send({
        type: 'full-reload',
      });
    },
  });
};

(async () => {
  try {
    const viteDevServer = await createServer({
      ...sharedConfig,
      configFile: 'packages/renderer/vite.config.ts',
    });

    await viteDevServer.listen();

    await setupPreloadPackageWatcher(viteDevServer);
    await setupMainPackageWatcher(viteDevServer);
    // await setupCorePackageWatcher();
    // restartMain();

    firstStartup = false;
  } catch (e) {
    console.error(e);
    process.exit(1);
  }
})();
