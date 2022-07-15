import { chrome } from '../../.electron-vendors.cache.json';

import { defineConfig } from 'vite';

import { join } from 'path';
import { builtinModules } from 'module';

const PACKAGE_ROOT = __dirname;

const config = defineConfig({
  mode: process.env.MODE,
  root: PACKAGE_ROOT,
  envDir: process.cwd(),

  resolve: {
    alias: {
      '/@/': join(PACKAGE_ROOT, 'src') + '/',
    },
  },

  build: {
    sourcemap: 'inline',
    target: `chrome${chrome}`,
    outDir: 'dist',
    assetsDir: '.',
    minify: process.env.MODE !== 'development',

    lib: {
      entry: 'src/index.ts',
      formats: ['cjs'],
    },
    rollupOptions: {
      external: [
        'electron',
        ...builtinModules,
        ...builtinModules.map((k) => `node:${k}`),
      ],
      output: {
        entryFileNames: '[name].cjs',
      },
    },

    emptyOutDir: true,
  },
});

export default config;
