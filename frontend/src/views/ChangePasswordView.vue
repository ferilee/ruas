<template>
  <main class="change-password-page">
    <section class="change-password-card" aria-labelledby="change-password-title">
      <div class="change-password-mark" aria-hidden="true">🔐</div>
      <span class="change-password-kicker">KEAMANAN AKUN</span>
      <h1 id="change-password-title">Buat sandi baru</h1>
      <p class="change-password-intro">Sandi sementara hanya dapat digunakan untuk login pertama. Buat sandi pribadi sebelum melanjutkan.</p>

      <form @submit.prevent="submit">
        <label>
          Sandi baru
          <input v-model="newPassword" type="password" minlength="8" autocomplete="new-password" placeholder="Minimal 8 karakter" :disabled="saving" />
        </label>
        <label>
          Ulangi sandi baru
          <input v-model="confirmPassword" type="password" minlength="8" autocomplete="new-password" placeholder="Ketik ulang sandi baru" :disabled="saving" />
        </label>
        <p v-if="error" class="change-password-error" role="alert">{{ error }}</p>
        <button type="submit" :disabled="saving || newPassword.length < 8 || confirmPassword.length < 8">
          {{ saving ? 'Menyimpan...' : 'Simpan sandi dan lanjutkan' }}
        </button>
      </form>
    </section>
  </main>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { useRouter } from 'vue-router';
import { changePassword } from '@/api/client';

const router = useRouter();
const newPassword = ref('');
const confirmPassword = ref('');
const saving = ref(false);
const error = ref('');

async function submit() {
  error.value = '';
  if (newPassword.value.length < 8) {
    error.value = 'Sandi baru minimal 8 karakter.';
    return;
  }
  if (newPassword.value !== confirmPassword.value) {
    error.value = 'Konfirmasi sandi tidak sama.';
    return;
  }

  saving.value = true;
  try {
    await changePassword(newPassword.value, confirmPassword.value);
    await router.replace('/');
  } catch (changeError) {
    error.value = changeError instanceof Error ? changeError.message : 'Sandi gagal diperbarui.';
  } finally {
    saving.value = false;
  }
}
</script>

<style scoped>
.change-password-page { display: grid; min-height: 100vh; min-height: 100dvh; place-items: center; padding: 24px; background: linear-gradient(145deg, #f3f7ff, #dce9ff); color: #18345d; }
.change-password-card { width: min(100%, 460px); padding: 32px; border: 1px solid rgba(255,255,255,.8); border-radius: 22px; background: rgba(255,255,255,.92); box-shadow: 0 18px 48px rgba(47,87,145,.14); }
.change-password-mark { display: grid; width: 48px; height: 48px; margin-bottom: 18px; place-items: center; border-radius: 15px; background: #e8f1ff; font-size: 1.35rem; }
.change-password-kicker { color: #3475c9; font-size: .7rem; font-weight: 800; letter-spacing: .12em; }
h1 { margin: 9px 0 8px; color: #173b83; font-size: 1.7rem; }
.change-password-intro { margin: 0 0 24px; color: #6d82a0; font-size: .9rem; line-height: 1.55; }
form { display: flex; flex-direction: column; gap: 16px; }
label { display: flex; flex-direction: column; gap: 7px; color: #456587; font-size: .8rem; font-weight: 700; }
input { width: 100%; padding: 12px 13px; border: 1px solid #d4e2f1; border-radius: 10px; color: #243f64; background: #f8fbff; font: inherit; outline: none; }
input:focus { border-color: #3877d2; box-shadow: 0 0 0 3px rgba(56,119,210,.12); }
button { padding: 13px 16px; border: 0; border-radius: 11px; color: #fff; background: linear-gradient(110deg, #2378db, #2251b5); font: inherit; font-weight: 800; cursor: pointer; }
button:disabled { cursor: default; opacity: .6; }
.change-password-error { margin: 0; color: #b6404c; font-size: .8rem; }
</style>
