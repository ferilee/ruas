import { createApp } from 'vue';
import App from './App.vue';
import { buildRouter } from './router';

async function bootstrap() {
  const router = await buildRouter();
  const app = createApp(App);
  app.use(router);
  await router.isReady();
  app.mount('#app');

  if (import.meta.env.PROD && 'serviceWorker' in navigator) {
    window.addEventListener('load', () => {
      void navigator.serviceWorker.register('/sw.js');
    });
  }
}

bootstrap();
