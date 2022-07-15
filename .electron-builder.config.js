// @ts-check

const packageJsonVersion = require('./package.json').version;

if (process.env.VITE_APP_VERSION === undefined) {
  process.env.VITE_APP_VERSION = packageJsonVersion;
}

/**
 * @type {import('electron-builder').Configuration}
 * @see https://www.electron.build/configuration/configuration
 */
const config = {
  appId: 'dev.ryanccn.spectral',
  remoteBuild: false,

  directories: {
    output: 'dist',
    buildResources: 'buildResources',
  },
  files: ['packages/**/dist/**'],
  extraMetadata: {
    version: packageJsonVersion,
  },

  mac: {
    artifactName: '${productName}-${version}-${arch}.${ext}',
    target: 'zip',
    category: 'public.app-category.games',
    darkModeSupport: true,
  },

  // win: {
  //   artifactName: '${productName}-${version}-${os}-${arch}.${ext}',
  // },
  // linux: {
  //   artifactName: '${productName}-${version}-${os}-${arch}.${ext}',
  // },

  // snap: {
  //   publish: 'github',
  // },
};

module.exports = config;
