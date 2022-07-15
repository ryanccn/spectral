<template>
  <div class="absolute inset-0 grid place-content-center">
    <button
      class="rounded-md px-4 py-3 text-lg font-semibold text-gray-700 transition-colors hover:text-gray-600 dark:text-gray-300 dark:hover:text-gray-400"
      @click="test"
    >
      Test
    </button>
  </div>
</template>

<script lang="ts" setup>
const test = () => {
  window.electronAPI.test();
};
</script>
