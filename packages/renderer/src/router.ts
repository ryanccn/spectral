import { createRouter, createWebHashHistory } from 'vue-router';

const router = createRouter({
  routes: [
    {
      path: '/',
      component: () => import('/@/pages/index.vue'),
    },
  ],

  history: createWebHashHistory(),
});

export { router };
