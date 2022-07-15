/* eslint-env node */

import { chrome } from '../../.electron-vendors.cache.json';

import { defineConfig } from 'vite';

import { join } from 'path';
import { builtinModules } from 'module';

import vue from '@vitejs/plugin-vue';

const PACKAGE_ROOT = __dirname;

const config = defineConfig({
  mode: process.env.MODE,
  root: PACKAGE_ROOT,
  resolve: {
    alias: {
      '/@/': join(PACKAGE_ROOT, 'src') + '/',
    },
  },
  plugins: [vue()],
  base: '',
  server: {
    fs: {
      strict: true,
    },
  },
  build: {
    sourcemap: true,
    target: `chrome${chrome}`,
    outDir: 'dist',
    assetsDir: '.',
    rollupOptions: {
      external: [...builtinModules],
    },
    emptyOutDir: true,
  },
});

export default config;
