<template>
  <div class="profile-page">
    <header class="profile-hero">
      <div class="hero-shape hero-shape-left" aria-hidden="true"></div>
      <router-link to="/" class="profile-brand" aria-label="Ruas home">
        <span class="profile-brand-mark" aria-hidden="true">
          <svg viewBox="0 0 48 48">
            <path d="M7 18 24 8l17 10-17 10L7 18Z" />
            <path d="M13 23v9c6 5 16 5 22 0v-9" />
            <path d="M41 19v10" />
            <circle cx="41" cy="32" r="2" />
          </svg>
        </span>
        <span class="profile-brand-copy">
          <strong>RUAS</strong>
          <small>RUANG ASESMEN</small>
        </span>
      </router-link>
      <div class="participant-badge">
        <span class="participant-badge-icon" aria-hidden="true">♙</span>
        <span>Peserta baru</span>
      </div>
    </header>

    <main class="profile-main">
      <section class="session-card">
        <span class="session-kicker">Langkah 1 dari 1</span>
        <h2>Lengkapi data peserta</h2>
        <p>Data ini digunakan untuk menyiapkan sesi latihan Anda di Ruang Asesmen.</p>

        <div class="session-status">
          <span class="status-dot"></span>
          <span>Sesi login aktif</span>
        </div>

        <div class="session-note">
          <strong>Data tersimpan ke database.</strong>
          <span>Anda dapat memperbaruinya dari halaman ini kapan saja.</span>
        </div>
      </section>

      <section class="profile-card" aria-labelledby="profile-title">
        <div class="card-watermark" aria-hidden="true">RA</div>
        <h1 id="profile-title">Konfirmasi Data Peserta</h1>
        <p class="profile-intro">Periksa data dari admin, lalu lengkapi informasi yang masih diperlukan.</p>

        <form class="profile-form" @submit.prevent="submitProfile">
          <div class="profile-summary-grid">
            <div class="profile-readonly"><span>Username / kode peserta</span><strong>{{ form.username || form.participant_code || 'Memuat...' }}</strong></div>
            <div class="profile-readonly"><span>Nama lengkap</span><strong>{{ form.name || 'Memuat...' }}</strong></div>
          </div>

          <div class="profile-assignment">
            <span class="assignment-title">Penetapan dari admin</span>
            <div class="assignment-grid">
              <div class="profile-readonly"><span>Kelas</span><strong>{{ form.class_label || 'Belum ditetapkan' }}</strong></div>
              <div class="profile-readonly"><span>Jenis asesmen</span><strong>{{ form.assessment_type_label || 'Belum ditetapkan' }}</strong></div>
              <div class="profile-readonly assignment-subject"><span>Mata pelajaran</span><strong>{{ form.subject_label || 'Belum ditetapkan' }}</strong></div>
            </div>
          </div>

          <label class="profile-field">
            <span>Jenis kelamin</span>
            <RuasSelect v-model="form.gender" :options="genderOptions" placeholder="Pilih jenis kelamin" aria-label="Jenis kelamin" />
          </label>

          <label class="profile-field">
            <span>Tanggal lahir</span>
            <input v-model="form.birth_date" type="date" required />
          </label>

          <label class="profile-field">
            <span>Token sesi <small>(opsional)</small></span>
            <input v-model.trim="form.access_token" type="text" placeholder="Ketikkan token jika tersedia" autocomplete="off" />
          </label>

          <p v-if="error" class="profile-error" role="alert">{{ error }}</p>

          <button class="profile-submit" type="submit" :disabled="saving || profileLoading || !form.subject_id">
            {{ saving ? 'Menyimpan...' : 'Konfirmasi dan Mulai' }}
          </button>
        </form>
      </section>
    </main>
  </div>
</template>

<script setup lang="ts">
import { onMounted, reactive, ref } from 'vue';
import { useRouter } from 'vue-router';
import { fetchParticipantProfile, saveParticipantProfile } from '@/api/client';
import RuasSelect from '@/components/RuasSelect.vue';
import type { ParticipantProfileInput } from '@/types';

type ProfileForm = {
  username: string;
  participant_code: string;
  name: string;
  gender: '' | 'male' | 'female';
  birth_date: string;
  subject_id: number | null;
  subject_label: string;
  class_label: string;
  assessment_type_label: string;
  access_token: string;
};

const genderOptions = [
  { value: 'male', label: 'Laki-laki' },
  { value: 'female', label: 'Perempuan' },
];

const router = useRouter();
const profileLoading = ref(true);
const saving = ref(false);
const error = ref('');
const form = reactive<ProfileForm>({
  username: '',
  participant_code: '',
  name: '',
  gender: '',
  birth_date: '',
  subject_id: null,
  subject_label: '',
  class_label: '',
  assessment_type_label: '',
  access_token: '',
});

async function loadProfile() {
  profileLoading.value = true;
  try {
    const profile = await fetchParticipantProfile();
    if (!profile) {
      error.value = 'Data peserta belum disiapkan oleh admin.';
      return;
    }
    Object.assign(form, profile);
  } catch (e) {
    error.value = e instanceof Error ? e.message : 'Profil peserta gagal dimuat.';
  } finally {
    profileLoading.value = false;
  }
}

async function submitProfile() {
  if (!form.subject_id || !form.gender || !form.birth_date) {
    error.value = 'Lengkapi semua data wajib terlebih dahulu.';
    return;
  }

  saving.value = true;
  try {
    const gender = form.gender;
    await saveParticipantProfile({
      participant_code: form.participant_code,
      name: form.name,
      gender,
      birth_date: form.birth_date,
      subject_id: form.subject_id,
      subject_label: form.subject_label,
      access_token: form.access_token,
      username: form.username,
      class_label: form.class_label,
      assessment_type_label: form.assessment_type_label,
    } satisfies ParticipantProfileInput);
    router.replace('/');
  } catch (e) {
    error.value = e instanceof Error ? e.message : 'Profil peserta gagal disimpan.';
  } finally {
    saving.value = false;
  }
}

onMounted(() => { void loadProfile(); });
</script>

<style scoped>
.profile-page {
  min-height: 100vh;
  min-height: 100svh;
  min-height: 100dvh;
  background: #f7f9fb;
  color: #203449;
}

.profile-hero {
  position: relative;
  height: 142px;
  overflow: hidden;
  background: #397bb8;
}

.hero-shape {
  position: absolute;
  pointer-events: none;
  transform: rotate(-27deg);
  background: rgba(38, 117, 181, 0.7);
}

.hero-shape-left {
  top: -100px;
  left: -45px;
  width: 300px;
  height: 220px;
  border-radius: 38% 52% 44% 35%;
}

.profile-brand {
  position: relative;
  z-index: 1;
  display: inline-flex;
  align-items: center;
  gap: 12px;
  margin: 16px 44px;
  color: #fff;
  text-decoration: none;
}

.profile-brand-mark {
  display: grid;
  width: 54px;
  height: 54px;
  place-items: center;
  border: 2px solid rgba(255, 255, 255, 0.9);
  border-radius: 50%;
  background: rgba(39, 116, 180, 0.65);
}

.profile-brand-mark svg {
  width: 34px;
  height: 34px;
  fill: none;
  stroke: #fff;
  stroke-linecap: round;
  stroke-linejoin: round;
  stroke-width: 2;
}

.profile-brand-copy {
  display: flex;
  flex-direction: column;
  line-height: 1.1;
}

.profile-brand-copy strong {
  font-size: 1.25rem;
  letter-spacing: 0.12em;
}

.profile-brand-copy small {
  margin-top: 5px;
  color: rgba(255, 255, 255, 0.78);
  font-size: 0.65rem;
  font-weight: 600;
  letter-spacing: 0.08em;
}

.participant-badge {
  position: absolute;
  top: 24px;
  right: 44px;
  display: flex;
  align-items: center;
  gap: 9px;
  color: rgba(255, 255, 255, 0.9);
  font-size: 0.78rem;
}

.participant-badge-icon {
  display: grid;
  width: 27px;
  height: 27px;
  place-items: center;
  border-radius: 4px;
  background: #8bc1f1;
  color: #27699f;
  font-size: 1.1rem;
}

.profile-main {
  display: grid;
  grid-template-columns: minmax(280px, 1fr) minmax(430px, 500px);
  gap: 26px;
  width: min(100% - 80px, 1280px);
  margin: -42px auto 0;
  padding-bottom: 60px;
}

.session-card,
.profile-card {
  position: relative;
  z-index: 2;
  align-self: start;
  border-radius: 10px;
  background: #fff;
  box-shadow: 0 18px 30px rgba(35, 53, 72, 0.16);
}

.session-card {
  min-height: 240px;
  padding: 28px 34px;
}

.session-kicker {
  display: inline-block;
  margin-bottom: 18px;
  color: #397bb8;
  font-size: 0.72rem;
  font-weight: 700;
  letter-spacing: 0.08em;
  text-transform: uppercase;
}

.session-card h2 {
  max-width: 300px;
  color: #263c52;
  font-size: 1.35rem;
  line-height: 1.25;
}

.session-card p {
  max-width: 360px;
  margin-top: 9px;
  color: #768695;
  font-size: 0.86rem;
  line-height: 1.6;
}

.session-status {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  margin-top: 30px;
  color: #397bb8;
  font-size: 0.8rem;
  font-weight: 600;
}

.status-dot {
  width: 9px;
  height: 9px;
  border-radius: 50%;
  background: #36b37e;
  box-shadow: 0 0 0 4px rgba(54, 179, 126, 0.12);
}

.session-note {
  display: flex;
  flex-direction: column;
  gap: 4px;
  margin-top: 28px;
  padding-top: 18px;
  border-top: 1px solid #edf1f4;
  color: #8a98a5;
  font-size: 0.73rem;
}

.session-note strong {
  color: #536a7d;
  font-weight: 600;
}

.profile-card {
  overflow: hidden;
  padding: 27px 40px 38px;
}

.card-watermark {
  position: absolute;
  top: 24px;
  right: -8px;
  color: rgba(57, 123, 184, 0.045);
  font-size: 8rem;
  font-weight: 800;
  line-height: 1;
  pointer-events: none;
}

.profile-card h1,
.profile-intro,
.profile-form {
  position: relative;
  z-index: 1;
}

.profile-card h1 {
  color: #27394a;
  font-size: 1.38rem;
  font-weight: 600;
}

.profile-intro {
  margin-top: 5px;
  color: #85929e;
  font-size: 0.78rem;
}

.profile-form {
  display: flex;
  flex-direction: column;
  gap: 15px;
  margin-top: 22px;
}

.profile-summary-grid,
.assignment-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 12px;
}

.profile-assignment {
  display: flex;
  flex-direction: column;
  gap: 10px;
  padding: 14px;
  border: 1px solid rgba(94, 130, 198, 0.18);
  border-radius: 15px;
  background: rgba(235, 243, 255, 0.52);
}

.assignment-title {
  color: #58709e;
  font-size: 0.68rem;
  font-weight: 800;
  letter-spacing: 0.08em;
  text-transform: uppercase;
}

.profile-readonly {
  display: flex;
  min-width: 0;
  flex-direction: column;
  gap: 6px;
  padding: 12px 13px;
  border-radius: 12px;
  background: rgba(255, 255, 255, 0.68);
}

.profile-readonly span {
  color: #7187ad;
  font-size: 0.66rem;
  font-weight: 700;
}

.profile-readonly strong {
  overflow: hidden;
  color: #203969;
  font-size: 0.82rem;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.profile-field {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.profile-field > span {
  color: #536273;
  font-size: 0.72rem;
  font-weight: 700;
}

.profile-field small {
  color: #9ba7b1;
  font-size: 0.68rem;
  font-weight: 400;
}

.profile-field input,
.profile-field select {
  min-height: 40px;
  padding: 8px 10px;
  border: 0;
  border-bottom: 1px solid #dce3e9;
  outline: none;
  background: transparent;
  color: #344a5d;
  font: inherit;
  font-size: 0.82rem;
}

.profile-field input:focus,
.profile-field select:focus {
  border-bottom-color: #397bb8;
}

.profile-field input::placeholder {
  color: #a2adb6;
}

.profile-field select:disabled {
  color: #9aa7b2;
}

.profile-error {
  margin-top: -4px;
  color: #cf4242;
  font-size: 0.76rem;
  text-align: center;
}

.profile-submit {
  min-height: 43px;
  margin-top: 8px;
  border: 0;
  border-radius: 4px;
  background: #1684f4;
  color: #fff;
  font: inherit;
  font-size: 0.84rem;
  font-weight: 600;
  cursor: pointer;
  box-shadow: 0 4px 10px rgba(22, 132, 244, 0.2);
  transition: background 0.15s, transform 0.15s;
}

.profile-submit:hover:not(:disabled) {
  background: #0874df;
  transform: translateY(-1px);
}

.profile-submit:disabled {
  background: #a8bdd0;
  box-shadow: none;
  cursor: not-allowed;
}

@media (max-width: 800px) {
  .profile-hero {
    height: 126px;
  }

  .profile-brand {
    margin-left: 20px;
  }

  .participant-badge {
    top: 18px;
    right: 20px;
    font-size: 0.7rem;
  }

  .profile-main {
    grid-template-columns: 1fr;
    width: min(100% - 32px, 520px);
    margin-top: -28px;
  }

  .session-card {
    min-height: 0;
  }
}

@media (max-width: 520px) {
  .participant-badge span:last-child {
    display: none;
  }

  .profile-card {
    padding: 25px 24px 31px;
  }

  .profile-summary-grid,
  .assignment-grid {
    grid-template-columns: 1fr;
  }
}
</style>

<style scoped>
.profile-page {
  position: relative;
  overflow: hidden;
  background:
    radial-gradient(circle at 50% 36%, rgba(255, 255, 255, 0.92), transparent 34%),
    linear-gradient(145deg, #f3f7ff 0%, #e6efff 52%, #d6e4fc 100%);
}

.profile-page::before,
.profile-page::after {
  position: absolute;
  border: 1px solid rgba(255, 255, 255, 0.72);
  border-radius: 50%;
  background: linear-gradient(145deg, rgba(255, 255, 255, 0.62), rgba(172, 201, 255, 0.38));
  box-shadow: inset 9px 9px 18px rgba(255, 255, 255, 0.5), 12px 18px 26px rgba(86, 124, 190, 0.1);
  content: '';
  pointer-events: none;
}

.profile-page::before {
  top: -220px;
  left: -180px;
  width: 430px;
  height: 430px;
}

.profile-page::after {
  right: -230px;
  bottom: -250px;
  width: 500px;
  height: 500px;
}

.profile-hero {
  position: absolute;
  top: 0;
  right: 0;
  left: 0;
  z-index: 2;
  height: 112px;
  overflow: visible;
  background: transparent;
}

.profile-hero .hero-shape {
  display: none;
}

.profile-brand {
  margin: 23px 34px;
  color: #10265e;
}

.profile-brand-mark {
  border-color: rgba(255, 255, 255, 0.85);
  background: rgba(255, 255, 255, 0.52);
  box-shadow: 7px 9px 18px rgba(90, 122, 184, 0.13), inset 2px 2px 8px rgba(255, 255, 255, 0.7);
}

.profile-brand-mark svg {
  stroke: #1760dc;
}

.profile-brand-copy small {
  color: #59709d;
}

.participant-badge {
  top: 30px;
  right: 34px;
  color: #59709d;
}

.participant-badge-icon {
  background: rgba(255, 255, 255, 0.58);
  color: #236bdc;
  box-shadow: 4px 5px 10px rgba(90, 122, 184, 0.1);
}

.profile-main {
  position: relative;
  z-index: 1;
  width: min(100% - 68px, 1120px);
  margin: 112px auto 0;
  grid-template-columns: minmax(250px, 0.8fr) minmax(430px, 520px);
  gap: 64px;
}

.session-card,
.profile-card {
  border-radius: 0;
  background: transparent;
  box-shadow: none;
}

.session-card {
  padding: 54px 0 30px;
}

.session-kicker {
  color: #236bdc;
}

.session-card h2 {
  color: #10265e;
  font-size: 1.8rem;
}

.session-card p,
.session-note {
  color: #6076a2;
}

.session-status {
  color: #236bdc;
}

.session-note {
  border-top-color: rgba(95, 122, 174, 0.24);
}

.session-note strong {
  color: #3d5788;
}

.profile-card {
  padding: 32px 0 42px;
}

.card-watermark {
  top: 18px;
  right: -20px;
  color: rgba(42, 102, 210, 0.045);
}

.profile-card h1 {
  color: #10265e;
  font-size: 1.8rem;
  font-weight: 800;
  letter-spacing: -0.03em;
}

.profile-intro {
  color: #6076a2;
}

.profile-form {
  gap: 16px;
  margin-top: 27px;
}

.profile-field {
  gap: 7px;
}

.profile-field > span {
  padding-left: 8px;
  color: #58709e;
  font-size: 0.72rem;
  letter-spacing: 0.02em;
}

.profile-field input,
.profile-field select {
  min-height: 58px;
  padding: 0 18px;
  border: 1px solid rgba(255, 255, 255, 0.92);
  border-radius: 20px;
  background: rgba(245, 249, 255, 0.58);
  color: #203969;
  box-shadow: 8px 10px 18px rgba(98, 130, 190, 0.12), inset 2px 2px 8px rgba(255, 255, 255, 0.75);
}

.profile-field input:focus,
.profile-field select:focus {
  border-color: rgba(43, 119, 238, 0.6);
  box-shadow: 0 0 0 4px rgba(43, 119, 238, 0.1), 8px 10px 18px rgba(98, 130, 190, 0.12);
}

.profile-field input::placeholder {
  color: #6b80a8;
}

.profile-field select:disabled {
  background: rgba(220, 232, 250, 0.65);
  color: #8093b8;
}

.profile-error {
  color: #c33b57;
}

.profile-submit {
  min-height: 60px;
  margin-top: 5px;
  border-radius: 22px;
  background: linear-gradient(110deg, #238bff, #1649dc);
  box-shadow: 0 12px 22px rgba(35, 91, 224, 0.3), inset 2px 2px 8px rgba(255, 255, 255, 0.28);
  font-size: 1rem;
}

.profile-submit:hover:not(:disabled) {
  background: linear-gradient(110deg, #238bff, #1649dc);
  box-shadow: 0 16px 26px rgba(35, 91, 224, 0.35), inset 2px 2px 8px rgba(255, 255, 255, 0.3);
}

.profile-submit:disabled {
  background: linear-gradient(110deg, #9dbce6, #7899d1);
}

@media (max-width: 800px) {
  .profile-hero {
    height: 96px;
  }

  .profile-brand {
    margin: 16px 20px;
  }

  .participant-badge {
    top: 22px;
    right: 20px;
  }

  .profile-main {
    grid-template-columns: 1fr;
    width: min(100% - 36px, 560px);
    margin-top: 94px;
    gap: 10px;
  }

  .session-card,
  .profile-card {
    padding: 26px 0;
  }

  .session-card h2,
  .profile-card h1 {
    font-size: 1.5rem;
  }
}
</style>
