<template>
  <div class="auth-page">
    <div class="orb orb-top-left" aria-hidden="true"></div>
    <div class="orb orb-top-right" aria-hidden="true"></div>
    <div class="orb orb-bottom-left" aria-hidden="true"></div>
    <div class="orb orb-bottom-right" aria-hidden="true"></div>

    <div class="theme-button" aria-hidden="true">
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="M20 15.2A8 8 0 0 1 8.8 4 8 8 0 1 0 20 15.2Z" />
      </svg>
    </div>

    <main class="auth-card" aria-labelledby="auth-title">
      <router-link to="/" class="auth-logo-tile" aria-label="Ruas home">
        <svg viewBox="0 0 64 64" aria-hidden="true">
          <path d="M10 25 32 12l22 13-22 13L10 25Z" />
          <path d="M18 31v11c8 6 20 6 28 0V31" />
          <path d="M54 26v15" />
          <circle cx="54" cy="46" r="2.5" />
        </svg>
      </router-link>

      <h1 id="auth-title">Selamat Datang Kembali</h1>
      <p class="auth-subtitle">Masuk untuk melanjutkan</p>

      <form class="auth-form" @submit.prevent="login">
        <label class="auth-field">
          <span class="auth-field-icon" aria-hidden="true">
            <svg viewBox="0 0 24 24">
              <circle cx="12" cy="8" r="3.5" />
              <path d="M5 20a7 7 0 0 1 14 0" />
            </svg>
          </span>
          <input
            v-model.trim="username"
            type="text"
            class="auth-input"
            placeholder=" "
            aria-label="Username"
            autocomplete="username"
            autofocus
            :disabled="loading"
          />
          <span class="floating-label">Username</span>
        </label>

        <label class="auth-field">
          <span class="auth-field-icon" aria-hidden="true">
            <svg viewBox="0 0 24 24">
              <rect x="5" y="10" width="14" height="10" rx="2" />
              <path d="M8 10V7a4 4 0 0 1 8 0v3" />
            </svg>
          </span>
          <input
            v-model="password"
            :type="showPassword ? 'text' : 'password'"
            class="auth-input"
            placeholder=" "
            aria-label="Password"
            autocomplete="current-password"
            :disabled="loading"
          />
          <span class="floating-label">Password</span>
          <button
            type="button"
            class="password-toggle"
            :aria-label="showPassword ? 'Sembunyikan password' : 'Tampilkan password'"
            @click="showPassword = !showPassword"
          >
            <svg v-if="showPassword" viewBox="0 0 24 24" aria-hidden="true">
              <path d="M3 3 21 21" />
              <path d="M10.6 10.6a2 2 0 0 0 2.8 2.8" />
              <path d="M9.9 4.2A10.8 10.8 0 0 1 12 4c5 0 8.5 4 9.5 6-.4.8-1.3 2.2-2.8 3.5M6.2 6.2C4.5 7.5 3.4 9.1 2.5 10c1 2 4.5 6 9.5 6 1 0 2-.2 2.9-.5" />
            </svg>
            <svg v-else viewBox="0 0 24 24" aria-hidden="true">
              <path d="M2.5 12s3.5-6 9.5-6 9.5 6 9.5 6-3.5 6-9.5 6-9.5-6-9.5-6Z" />
              <circle cx="12" cy="12" r="2.5" />
            </svg>
          </button>
        </label>

        <p v-if="error" class="auth-error" role="alert">{{ error }}</p>

        <button type="submit" class="auth-btn" :disabled="loading || !username || !password">
          <span>{{ loading ? 'Memverifikasi...' : 'Masuk' }}</span>
          <span class="auth-btn-arrow" aria-hidden="true">→</span>
        </button>
      </form>

      <div class="auth-divider" aria-hidden="true">
        <span></span>
        <small>RUANG ASESMEN</small>
        <span></span>
      </div>
      <p class="auth-note">Latihan terarah untuk hasil terbaik.</p>
    </main>

    <footer class="auth-footer">Ruang Asesmen · Belajar, berlatih, berkembang.</footer>
  </div>
</template>

<script setup lang="ts">
import { onMounted, ref } from 'vue';
import { useRouter } from 'vue-router';
import { fetchParticipantProfile, saveParticipantProfile } from '@/api/client';
import { clearLegacyParticipantProfile, getLegacyParticipantProfile } from '@/lib/participant-profile';

const router = useRouter();
const username = ref('');
const password = ref('');
const showPassword = ref(false);
const loading = ref(false);
const error = ref('');

onMounted(async () => {
  try {
    const res = await fetch('/api/auth');
    if (!res.ok) return;
    const data = await res.json() as { auth_enabled?: boolean };
    if (!data.auth_enabled) {
      router.replace('/');
    }
  } catch {
    // Let the login form handle server connectivity issues when submitted.
  }
});

async function login() {
  if (!username.value || !password.value) return;
  loading.value = true;
  error.value = '';

  try {
    const res = await fetch('/api/auth', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: username.value, password: password.value }),
    });

    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      error.value = body.message || 'Gagal login.';
      return;
    }

    const data = await res.json() as { token: string };
    sessionStorage.setItem('auth_token', data.token);
    let profile = await fetchParticipantProfile();
    const legacyProfile = profile ? null : getLegacyParticipantProfile();
    if (legacyProfile) {
      profile = await saveParticipantProfile(legacyProfile);
      clearLegacyParticipantProfile();
    }
    router.push(profile?.is_complete && profile.subject_id ? '/' : '/profile');
  } catch {
    error.value = 'Tidak dapat terhubung ke server.';
  } finally {
    loading.value = false;
  }
}
</script>

<style scoped>
.auth-page {
  position: relative;
  display: grid;
  min-height: 100vh;
  place-items: center;
  overflow: hidden;
  padding: 48px 20px 70px;
  background:
    radial-gradient(circle at 50% 36%, rgba(255, 255, 255, 0.92), transparent 34%),
    linear-gradient(145deg, #f3f7ff 0%, #e6efff 52%, #d6e4fc 100%);
  color: #10265e;
}

.orb {
  position: absolute;
  border: 1px solid rgba(255, 255, 255, 0.72);
  border-radius: 50%;
  background: linear-gradient(145deg, rgba(255, 255, 255, 0.62), rgba(172, 201, 255, 0.38));
  box-shadow:
    inset 9px 9px 18px rgba(255, 255, 255, 0.5),
    12px 18px 26px rgba(86, 124, 190, 0.1);
  pointer-events: none;
}

.orb-top-left {
  top: -245px;
  left: -205px;
  width: 470px;
  height: 470px;
}

.orb-top-right {
  top: 190px;
  right: -115px;
  width: 260px;
  height: 260px;
}

.orb-bottom-left {
  bottom: -255px;
  left: -170px;
  width: 380px;
  height: 380px;
}

.orb-bottom-right {
  right: -220px;
  bottom: -235px;
  width: 500px;
  height: 500px;
}

.theme-button {
  position: absolute;
  top: 32px;
  right: 34px;
  z-index: 2;
  display: grid;
  width: 54px;
  height: 54px;
  place-items: center;
  border: 1px solid rgba(255, 255, 255, 0.82);
  border-radius: 18px;
  background: rgba(255, 255, 255, 0.55);
  color: #10265e;
  box-shadow: 7px 9px 18px rgba(90, 122, 184, 0.13), inset 2px 2px 8px rgba(255, 255, 255, 0.7);
}

.theme-button svg {
  width: 22px;
  height: 22px;
  fill: currentColor;
}

.auth-card {
  position: relative;
  z-index: 1;
  width: min(100%, 520px);
  padding: 34px 40px 30px;
  border: 0;
  border-radius: 0;
  background: transparent;
  box-shadow: none;
  text-align: center;
}

.auth-logo-tile {
  display: grid;
  width: 126px;
  height: 126px;
  margin: 0 auto 27px;
  place-items: center;
  border: 1px solid rgba(255, 255, 255, 0.85);
  border-radius: 34px;
  background: linear-gradient(145deg, rgba(255, 255, 255, 0.78), rgba(205, 224, 255, 0.56));
  box-shadow: 10px 16px 25px rgba(90, 122, 184, 0.16), inset 6px 6px 14px rgba(255, 255, 255, 0.72);
}

.auth-logo-tile svg {
  width: 78px;
  height: 78px;
  fill: none;
  stroke: #1760dc;
  stroke-linecap: round;
  stroke-linejoin: round;
  stroke-width: 2.2;
  filter: drop-shadow(0 7px 8px rgba(22, 96, 220, 0.2));
}

.auth-card h1 {
  color: #0d2058;
  font-size: clamp(1.8rem, 4vw, 2.4rem);
  font-weight: 800;
  letter-spacing: -0.04em;
  line-height: 1.15;
}

.auth-subtitle {
  margin-top: 8px;
  color: #59709d;
  font-size: 0.9rem;
  letter-spacing: 0.24em;
  text-transform: uppercase;
}

.auth-form {
  display: flex;
  flex-direction: column;
  gap: 16px;
  margin-top: 31px;
}

.auth-field {
  position: relative;
  display: flex;
  align-items: center;
  min-height: 65px;
  padding: 0 17px;
  border: 1px solid rgba(255, 255, 255, 0.92);
  border-radius: 22px;
  background: rgba(245, 249, 255, 0.56);
  box-shadow: 8px 10px 18px rgba(98, 130, 190, 0.12), inset 2px 2px 8px rgba(255, 255, 255, 0.75);
}

.auth-field:focus-within {
  border-color: rgba(43, 119, 238, 0.6);
  box-shadow: 0 0 0 4px rgba(43, 119, 238, 0.1), 8px 10px 18px rgba(98, 130, 190, 0.12);
}

.auth-field-icon {
  display: grid;
  width: 30px;
  place-items: center;
  color: #58709e;
}

.auth-field-icon svg,
.password-toggle svg {
  width: 25px;
  height: 25px;
  fill: none;
  stroke: currentColor;
  stroke-linecap: round;
  stroke-linejoin: round;
  stroke-width: 1.8;
}

.auth-input {
  min-width: 0;
  flex: 1;
  padding: 0 14px;
  border: 0;
  outline: none;
  background: transparent;
  color: #203969;
  font: inherit;
  font-size: 1rem;
}

.floating-label {
  position: absolute;
  top: 50%;
  left: 61px;
  padding: 0 5px;
  color: #6b80a8;
  font-size: 1rem;
  pointer-events: none;
  transform: translateY(-50%);
  transition: top 0.16s ease, color 0.16s ease, font-size 0.16s ease, background 0.16s ease;
}

.auth-field:focus-within .floating-label,
.auth-input:not(:placeholder-shown) ~ .floating-label {
  top: 0;
  background: #eaf2ff;
  color: #236bdc;
  font-size: 0.7rem;
  font-weight: 700;
  transform: translateY(-50%);
}

.password-toggle {
  display: grid;
  width: 35px;
  height: 35px;
  place-items: center;
  border: 0;
  background: transparent;
  color: #58709e;
  cursor: pointer;
}

.auth-error {
  margin: -2px 0 0;
  color: #c33b57;
  font-size: 0.82rem;
}

.auth-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 65px;
  margin-top: 2px;
  padding: 0 12px 0 25px;
  border: 1px solid rgba(255, 255, 255, 0.7);
  border-radius: 25px;
  background: linear-gradient(110deg, #238bff, #1649dc);
  color: #fff;
  font: inherit;
  font-size: 1.15rem;
  font-weight: 800;
  box-shadow: 0 12px 22px rgba(35, 91, 224, 0.3), inset 2px 2px 8px rgba(255, 255, 255, 0.28);
  cursor: pointer;
  transition: transform 0.15s, box-shadow 0.15s;
}

.auth-btn:hover:not(:disabled) {
  transform: translateY(-2px);
  box-shadow: 0 16px 26px rgba(35, 91, 224, 0.35), inset 2px 2px 8px rgba(255, 255, 255, 0.3);
}

.auth-btn:disabled {
  background: linear-gradient(110deg, #9dbce6, #7899d1);
  box-shadow: none;
  cursor: not-allowed;
}

.auth-btn-arrow {
  display: grid;
  width: 43px;
  height: 43px;
  margin-left: auto;
  place-items: center;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.2);
  font-size: 1.65rem;
  font-weight: 400;
}

.auth-divider {
  display: flex;
  align-items: center;
  gap: 14px;
  margin-top: 29px;
  color: #6076a2;
}

.auth-divider span {
  height: 1px;
  flex: 1;
  background: rgba(95, 122, 174, 0.45);
}

.auth-divider small {
  font-size: 0.62rem;
  font-weight: 700;
  letter-spacing: 0.3em;
}

.auth-note {
  margin-top: 22px;
  color: #6076a2;
  font-size: 0.72rem;
  letter-spacing: 0.14em;
  text-transform: uppercase;
}

.auth-footer {
  position: absolute;
  right: 0;
  bottom: 19px;
  left: 0;
  z-index: 1;
  color: #6279a7;
  font-size: 0.72rem;
  text-align: center;
}

.sr-only {
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  white-space: nowrap;
  border: 0;
}

@media (max-width: 560px) {
  .auth-page {
    padding: 35px 16px 62px;
  }

  .theme-button {
    top: 18px;
    right: 18px;
    width: 45px;
    height: 45px;
    border-radius: 15px;
  }

  .auth-card {
    padding: 28px 20px 25px;
    border-radius: 25px;
  }

  .auth-logo-tile {
    width: 100px;
    height: 100px;
    margin-bottom: 22px;
    border-radius: 28px;
  }

  .auth-logo-tile svg {
    width: 62px;
    height: 62px;
  }

  .auth-card h1 {
    font-size: 1.75rem;
  }

  .auth-subtitle {
    font-size: 0.73rem;
    letter-spacing: 0.17em;
  }

  .auth-field,
  .auth-btn {
    min-height: 58px;
    border-radius: 19px;
  }
}
</style>
