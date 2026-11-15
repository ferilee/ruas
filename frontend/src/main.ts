import { createApp } from 'vue';
import App from './App.vue';
import { buildRouter } from './router';
import { consumeSessionBridge } from './lib/session-bridge';

async function bootstrap() {
  // Serah-terima dari SIMAK: simpan dulu token sesi dari fragmen URL agar
  // penjaga router melihat sesi yang sudah masuk.
  consumeSessionBridge();
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
