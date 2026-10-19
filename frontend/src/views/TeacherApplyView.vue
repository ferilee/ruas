<template>
  <main class="teacher-apply-page">
    <section class="teacher-apply-card" aria-labelledby="teacher-apply-title">
      <router-link to="/auth" class="teacher-apply-back">← Kembali ke login</router-link>
      <div class="teacher-apply-mark" aria-hidden="true">G</div>
      <span class="teacher-apply-kicker">AKSES GURU</span>
      <h1 id="teacher-apply-title">Ajukan akses guru</h1>
      <p class="teacher-apply-intro">Isi data berikut. Admin akan meninjau pengajuan sebelum akun Editor diaktifkan.</p>

      <div v-if="submitted" class="teacher-apply-success" role="status">
        <strong>Pengajuan berhasil dikirim.</strong>
        <p>Admin akan memeriksa data Anda. Sandi yang Anda buat menjadi sandi awal dan wajib diganti saat akun pertama kali digunakan melalui halaman login utama.</p>
        <router-link to="/auth" class="teacher-apply-button">Kembali ke login</router-link>
      </div>

      <form v-else class="teacher-apply-form" @submit.prevent="submit">
        <label>Nama lengkap<input v-model.trim="form.display_name" required maxlength="150" autocomplete="name" placeholder="Nama lengkap" /></label>
        <label>Username<input v-model.trim="form.username" required minlength="3" maxlength="100" autocomplete="username" placeholder="Contoh: guru.matematika" /></label>
        <label>Kontak <span>(opsional)</span><input v-model.trim="form.contact" maxlength="150" autocomplete="email" placeholder="Email atau nomor WhatsApp" /></label>
        <div class="teacher-apply-grid">
          <label>Kelas yang diampu <span>(opsional)</span><input v-model.trim="form.requested_class" maxlength="150" placeholder="Contoh: XI TKJ" /></label>
          <label>Mata pelajaran <span>(opsional)</span><input v-model.trim="form.requested_subject" maxlength="150" placeholder="Contoh: Matematika" /></label>
        </div>
        <label>Sandi awal<input v-model="form.password" required minlength="8" maxlength="200" type="password" autocomplete="new-password" placeholder="Minimal 8 karakter" /></label>
        <label>Konfirmasi sandi<input v-model="form.confirm_password" required minlength="8" maxlength="200" type="password" autocomplete="new-password" placeholder="Ulangi sandi awal" /></label>
        <p v-if="error" class="teacher-apply-error" role="alert">{{ error }}</p>
        <button class="teacher-apply-button" type="submit" :disabled="loading">{{ loading ? 'Mengirim...' : 'Kirim pengajuan' }}</button>
      </form>

      <p class="teacher-apply-note">Setelah disetujui, Anda dapat membuat kelas, mata pelajaran, topik, soal, siswa, jadwal, dan melihat laporan workspace Anda.</p>
    </section>
  </main>
</template>

<script setup lang="ts">
import { reactive, ref } from 'vue';
import { submitTeacherAccessRequest } from '@/api/client';

const form = reactive({
  display_name: '',
  username: '',
  contact: '',
  requested_class: '',
  requested_subject: '',
  password: '',
  confirm_password: '',
});
const loading = ref(false);
const submitted = ref(false);
const error = ref('');

async function submit() {
  if (form.password !== form.confirm_password) {
    error.value = 'Konfirmasi sandi tidak sama.';
    return;
  }
  loading.value = true;
  error.value = '';
  try {
    await submitTeacherAccessRequest(form);
    submitted.value = true;
  } catch (submitError) {
    error.value = submitError instanceof Error ? submitError.message : 'Pengajuan gagal dikirim.';
  } finally {
    loading.value = false;
  }
}
</script>

<style scoped>
.teacher-apply-page { display: grid; min-height: 100vh; min-height: 100dvh; place-items: center; padding: 28px 18px; background: linear-gradient(145deg, #f3f7ff, #dce8ff); color: #18345d; }
.teacher-apply-card { width: min(100%, 520px); padding: 30px; border: 1px solid rgba(255,255,255,.9); border-radius: 24px; background: rgba(255,255,255,.94); box-shadow: 0 20px 55px rgba(42,78,132,.16); }
.teacher-apply-back { display: inline-block; margin-bottom: 22px; color: #3569a6; font-size: .82rem; font-weight: 700; text-decoration: none; }
.teacher-apply-mark { display: grid; width: 48px; height: 48px; margin-bottom: 16px; place-items: center; border-radius: 15px; color: #fff; background: linear-gradient(145deg, #6d28d9, #4c1d95); font-size: 1.25rem; font-weight: 800; }
.teacher-apply-kicker { color: #6d28d9; font-size: .7rem; font-weight: 800; letter-spacing: .13em; }
h1 { margin: 6px 0 8px; color: #183b76; font-size: clamp(1.5rem, 4vw, 2rem); }
.teacher-apply-intro, .teacher-apply-note { color: #6d82a0; font-size: .85rem; line-height: 1.55; }
.teacher-apply-form { display: flex; flex-direction: column; gap: 13px; margin-top: 22px; }
.teacher-apply-form label { display: flex; flex-direction: column; gap: 6px; color: #496482; font-size: .78rem; font-weight: 700; }
.teacher-apply-form label span { color: #8a9bb0; font-weight: 500; }
.teacher-apply-form input { width: 100%; padding: 11px 12px; border: 1px solid #ccdced; border-radius: 9px; color: #29486d; background: #fbfdff; font: inherit; font-size: .85rem; }
.teacher-apply-form input:focus { outline: 2px solid rgba(109,40,217,.25); border-color: #7c3aed; }
.teacher-apply-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
.teacher-apply-button { display: inline-flex; min-height: 44px; align-items: center; justify-content: center; margin-top: 5px; padding: 11px 16px; border: 0; border-radius: 10px; color: #fff; background: linear-gradient(110deg, #7c3aed, #4c1d95); font: inherit; font-size: .86rem; font-weight: 800; text-decoration: none; cursor: pointer; }
.teacher-apply-button:disabled { cursor: wait; opacity: .65; }
.teacher-apply-error { margin: 2px 0 0; color: #b6404c; font-size: .8rem; }
.teacher-apply-success { margin-top: 22px; padding: 16px; border: 1px solid #bfe7d2; border-radius: 12px; color: #236947; background: #effbf4; font-size: .86rem; line-height: 1.5; }
.teacher-apply-success strong, .teacher-apply-success p { display: block; }.teacher-apply-success p { margin: 6px 0 14px; }
.teacher-apply-note { margin: 20px 0 0; font-size: .74rem; }
@media (max-width: 520px) { .teacher-apply-card { padding: 24px 20px; }.teacher-apply-grid { grid-template-columns: 1fr; } }
</style>
