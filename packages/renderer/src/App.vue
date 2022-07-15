<template>
  <div class="fixed inset-0 flex">
    <div class="absolute top-0 h-10 w-full [-webkit-app-region:_drag;]" />
    <div class="w-48 flex-none p-4 pt-10">
      <h1 class="text-xl font-bold">Spectral</h1>
    </div>
    <div class="relative flex-grow bg-white p-6 pt-10 dark:bg-zinc-900">
      <router-view />
    </div>
  </div>
  <span
    v-if="DEV"
    id="dev-indicator"
    class="fixed right-0 bottom-0 z-[99999] m-4 block select-none rounded-md bg-green-500 px-2 py-1 font-bold"
  >
    Dev
  </span>
</template>

<script lang="ts" setup>
const DEV = import.meta.env.DEV;
const IS_MACOS = window.electronAPI.platform === 'darwin';
</script>
