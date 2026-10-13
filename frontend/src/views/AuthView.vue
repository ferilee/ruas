<template>
  <div class="auth-page" :data-theme="resolvedTheme" @click="themeMenuOpen = false">
    <div class="orb orb-top-left" aria-hidden="true"></div>
    <div class="orb orb-top-right" aria-hidden="true"></div>
    <div class="orb orb-bottom-left" aria-hidden="true"></div>
    <div class="orb orb-bottom-right" aria-hidden="true"></div>

    <div class="auth-utility-bar">
      <div class="auth-utility-links">
        <router-link to="/admin" class="editor-access" aria-label="Akses editor">
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <path d="M4 5.5h16v13H4z" />
            <path d="M8 9h8M8 12h8M8 15h5" />
          </svg>
          <span>Akses Editor</span>
        </router-link>
        <router-link to="/tentang" class="landing-access" aria-label="Tentang dan layanan RUAS">Tentang &amp; Layanan</router-link>
      </div>

      <div class="theme-picker" @click.stop>
        <button
          type="button"
          class="theme-button"
          :aria-expanded="themeMenuOpen"
          aria-haspopup="menu"
          :aria-label="`Tema saat ini: ${themeModeLabel}. Ubah tema`"
          @click="themeMenuOpen = !themeMenuOpen"
        >
          <svg v-if="resolvedTheme === 'dark'" viewBox="0 0 24 24" aria-hidden="true">
            <path d="M20 15.2A8 8 0 0 1 8.8 4 8 8 0 1 0 20 15.2Z" />
          </svg>
          <svg v-else viewBox="0 0 24 24" aria-hidden="true">
            <circle cx="12" cy="12" r="4" />
            <path d="M12 2v2M12 20v2M4.93 4.93l1.42 1.42M17.65 17.65l1.42 1.42M2 12h2M20 12h2M4.93 19.07l1.42-1.42M17.65 6.35l1.42-1.42" />
          </svg>
          <span class="sr-only">{{ themeModeLabel }}</span>
        </button>

        <div v-if="themeMenuOpen" class="theme-menu" role="menu" aria-label="Pilihan tema">
          <p class="theme-menu-title">Tampilan</p>
          <button
            v-for="option in themeOptions"
            :key="option.value"
            type="button"
            class="theme-option"
            :class="{ selected: themeMode === option.value }"
            role="menuitemradio"
            :aria-checked="themeMode === option.value"
            @click="selectTheme(option.value)"
          >
            <span class="theme-option-icon" aria-hidden="true">{{ option.icon }}</span>
            <span>{{ option.label }}</span>
            <span v-if="themeMode === option.value" class="theme-option-check" aria-hidden="true">✓</span>
          </button>
        </div>
      </div>
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

      <div v-if="demoAvailable" class="demo-access">
        <div><strong>Ingin melihat cara kerja RUAS?</strong><small>Gunakan data contoh tanpa membuat akun.</small></div>
        <button type="button" :disabled="loading" @click="loginAsDemo"><span aria-hidden="true">▷</span> {{ loading && demoLoading ? 'Membuka demo...' : 'Coba mode demo' }}</button>
      </div>

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
import { computed, onBeforeUnmount, onMounted, ref } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { fetchDemoAvailability, fetchParticipantProfile, loginAsDemo as requestDemoLogin, saveParticipantProfile } from '@/api/client';
import { clearLegacyParticipantProfile, getLegacyParticipantProfile } from '@/lib/participant-profile';

const router = useRouter();
const username = ref('');
const password = ref('');
const showPassword = ref(false);
const loading = ref(false);
const error = ref('');
const demoAvailable = ref(false);
const demoLoading = ref(false);
const route = useRoute();
type ThemeMode = 'light' | 'dark' | 'system';

const themeOptions: Array<{ value: ThemeMode; label: string; icon: string }> = [
  { value: 'light', label: 'Terang', icon: '☼' },
  { value: 'dark', label: 'Gelap', icon: '☾' },
  { value: 'system', label: 'Otomatis', icon: '◐' },
];
const themeMode = ref<ThemeMode>('system');
const systemPrefersDark = ref(false);
const themeMenuOpen = ref(false);
let systemThemeMedia: MediaQueryList | null = null;

const resolvedTheme = computed<'light' | 'dark'>(() => {
  if (themeMode.value === 'system') return systemPrefersDark.value ? 'dark' : 'light';
  return themeMode.value;
});

const themeModeLabel = computed(() => themeOptions.find((option) => option.value === themeMode.value)?.label ?? 'Otomatis');

function applyThemePreference() {
  document.documentElement.style.colorScheme = resolvedTheme.value;
}

function selectTheme(mode: ThemeMode) {
  themeMode.value = mode;
  localStorage.setItem('ruas-theme', mode);
  themeMenuOpen.value = false;
  applyThemePreference();
}

function handleSystemThemeChange(event: MediaQueryListEvent) {
  systemPrefersDark.value = event.matches;
  applyThemePreference();
}

onMounted(async () => {
  const savedTheme = localStorage.getItem('ruas-theme');
  if (savedTheme === 'light' || savedTheme === 'dark' || savedTheme === 'system') {
    themeMode.value = savedTheme;
  }
  if (typeof window.matchMedia === 'function') {
    systemThemeMedia = window.matchMedia('(prefers-color-scheme: dark)');
    systemPrefersDark.value = systemThemeMedia.matches;
    systemThemeMedia.addEventListener('change', handleSystemThemeChange);
  }
  applyThemePreference();

  try {
    demoAvailable.value = await fetchDemoAvailability();
    const res = await fetch('/api/auth');
    if (!res.ok) return;
    const data = await res.json() as { auth_enabled?: boolean };
    if (!data.auth_enabled) {
      router.replace('/');
    }
    if (route.query.demo === '1' && demoAvailable.value) await loginAsDemo();
  } catch {
    // Let the login form handle server connectivity issues when submitted.
  }
});

onBeforeUnmount(() => {
  systemThemeMedia?.removeEventListener('change', handleSystemThemeChange);
  document.documentElement.style.colorScheme = '';
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

async function loginAsDemo() {
  if (loading.value) return;
  loading.value = true;
  demoLoading.value = true;
  error.value = '';
  try {
    const data = await requestDemoLogin();
    sessionStorage.setItem('auth_token', data.token);
    const profile = await fetchParticipantProfile();
    await router.push(profile?.is_complete && profile.subject_id ? '/' : '/profile');
  } catch (demoError) {
    error.value = demoError instanceof Error ? demoError.message : 'Mode demo belum tersedia.';
  } finally {
    loading.value = false;
    demoLoading.value = false;
  }
}
</script>

<style scoped>
.auth-page {
  position: relative;
  display: grid;
  min-height: 100vh;
  min-height: 100svh;
  min-height: 100dvh;
  place-items: center;
  overflow: hidden;
  padding: calc(48px + env(safe-area-inset-top)) 20px calc(70px + env(safe-area-inset-bottom));
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

.auth-utility-bar {
  position: absolute;
  top: 32px;
  right: 34px;
  left: 34px;
  z-index: 2;
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  pointer-events: none;
}

.auth-utility-links {
  display: flex;
  align-items: center;
  gap: 10px;
  pointer-events: auto;
}

.editor-access,
.theme-button {
  pointer-events: auto;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border: 1px solid rgba(255, 255, 255, 0.82);
  background: rgba(255, 255, 255, 0.55);
  color: #10265e;
  box-shadow: 7px 9px 18px rgba(90, 122, 184, 0.13), inset 2px 2px 8px rgba(255, 255, 255, 0.7);
  transition: transform 0.15s ease, background 0.15s ease, box-shadow 0.15s ease;
}

.editor-access {
  gap: 8px;
  min-height: 46px;
  padding: 0 15px;
  border-radius: 15px;
  color: #236bdc;
  font-size: 0.78rem;
  font-weight: 700;
  text-decoration: none;
}

.landing-access {
  display: inline-flex;
  min-height: 46px;
  align-items: center;
  padding: 0 15px;
  border: 1px solid rgba(255, 255, 255, 0.82);
  border-radius: 15px;
  color: #236bdc;
  background: rgba(255, 255, 255, 0.42);
  box-shadow: 7px 9px 18px rgba(90, 122, 184, 0.11), inset 2px 2px 8px rgba(255, 255, 255, 0.65);
  font-size: 0.78rem;
  font-weight: 700;
  text-decoration: none;
  transition: transform 0.15s ease, background 0.15s ease, box-shadow 0.15s ease;
}

.landing-access:hover {
  transform: translateY(-2px);
  background: rgba(255, 255, 255, 0.78);
  box-shadow: 9px 12px 22px rgba(90, 122, 184, 0.16), inset 2px 2px 8px rgba(255, 255, 255, 0.75);
}

.editor-access svg {
  width: 18px;
  height: 18px;
  fill: none;
  stroke: currentColor;
  stroke-linecap: round;
  stroke-linejoin: round;
  stroke-width: 1.8;
}

.editor-access:hover,
.theme-button:hover {
  transform: translateY(-2px);
  background: rgba(255, 255, 255, 0.78);
  box-shadow: 9px 12px 22px rgba(90, 122, 184, 0.18), inset 2px 2px 8px rgba(255, 255, 255, 0.75);
}

.theme-picker {
  position: relative;
  pointer-events: auto;
}

.theme-button {
  display: grid;
  width: 54px;
  height: 54px;
  place-items: center;
  border-radius: 18px;
  cursor: pointer;
}

.theme-button svg {
  width: 22px;
  height: 22px;
  fill: none;
  stroke: currentColor;
  stroke-linecap: round;
  stroke-linejoin: round;
  stroke-width: 1.8;
}

.theme-menu {
  position: absolute;
  top: calc(100% + 10px);
  right: 0;
  width: 178px;
  padding: 9px;
  border: 1px solid rgba(255, 255, 255, 0.78);
  border-radius: 18px;
  background: rgba(248, 251, 255, 0.94);
  box-shadow: 0 15px 30px rgba(64, 96, 155, 0.2), inset 2px 2px 8px rgba(255, 255, 255, 0.8);
  backdrop-filter: blur(14px);
}

.theme-menu-title {
  padding: 4px 9px 7px;
  color: #6b80a8;
  font-size: 0.68rem;
  font-weight: 800;
  letter-spacing: 0.12em;
  text-transform: uppercase;
}

.theme-option {
  display: flex;
  width: 100%;
  align-items: center;
  gap: 9px;
  padding: 9px;
  border: 0;
  border-radius: 11px;
  background: transparent;
  color: #304a7a;
  font: inherit;
  font-size: 0.82rem;
  text-align: left;
  cursor: pointer;
}

.theme-option:hover,
.theme-option.selected {
  background: rgba(35, 107, 220, 0.11);
  color: #1d5fd0;
}

.theme-option-icon {
  width: 20px;
  color: #236bdc;
  font-size: 1.1rem;
  text-align: center;
}

.theme-option-check {
  margin-left: auto;
  color: #236bdc;
  font-weight: 800;
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

.auth-page[data-theme='dark'] {
  background:
    radial-gradient(circle at 50% 36%, rgba(37, 64, 119, 0.58), transparent 34%),
    linear-gradient(145deg, #0d1733 0%, #152956 52%, #203c72 100%);
  color: #edf3ff;
}

.auth-page[data-theme='dark'] .orb {
  border-color: rgba(153, 188, 255, 0.23);
  background: linear-gradient(145deg, rgba(85, 125, 205, 0.22), rgba(16, 31, 71, 0.34));
  box-shadow: inset 9px 9px 18px rgba(142, 179, 255, 0.08), 12px 18px 26px rgba(2, 8, 24, 0.2);
}

.auth-page[data-theme='dark'] .editor-access,
.auth-page[data-theme='dark'] .landing-access,
.auth-page[data-theme='dark'] .theme-button {
  border-color: rgba(156, 192, 255, 0.28);
  background: rgba(26, 49, 96, 0.72);
  color: #c5d9ff;
  box-shadow: 7px 9px 18px rgba(2, 8, 24, 0.22), inset 2px 2px 8px rgba(150, 188, 255, 0.08);
}

.auth-page[data-theme='dark'] .editor-access:hover,
.auth-page[data-theme='dark'] .landing-access:hover,
.auth-page[data-theme='dark'] .theme-button:hover {
  background: rgba(40, 72, 132, 0.88);
}

.auth-page[data-theme='dark'] .theme-menu {
  border-color: rgba(156, 192, 255, 0.25);
  background: rgba(20, 37, 76, 0.96);
  box-shadow: 0 15px 30px rgba(2, 8, 24, 0.38), inset 2px 2px 8px rgba(150, 188, 255, 0.07);
}

.auth-page[data-theme='dark'] .theme-menu-title,
.auth-page[data-theme='dark'] .theme-option {
  color: #b9cbed;
}

.auth-page[data-theme='dark'] .theme-option:hover,
.auth-page[data-theme='dark'] .theme-option.selected {
  background: rgba(98, 153, 255, 0.18);
  color: #eaf2ff;
}

.auth-page[data-theme='dark'] .auth-logo-tile {
  border-color: rgba(153, 188, 255, 0.25);
  background: linear-gradient(145deg, rgba(57, 89, 157, 0.52), rgba(19, 37, 78, 0.7));
  box-shadow: 10px 16px 25px rgba(2, 8, 24, 0.26), inset 6px 6px 14px rgba(157, 193, 255, 0.1);
}

.auth-page[data-theme='dark'] .auth-card h1 {
  color: #f1f5ff;
}

.auth-page[data-theme='dark'] .auth-subtitle,
.auth-page[data-theme='dark'] .auth-note,
.auth-page[data-theme='dark'] .auth-footer {
  color: #b9cbed;
}

.auth-page[data-theme='dark'] .auth-field {
  border-color: rgba(153, 188, 255, 0.25);
  background: rgba(21, 43, 87, 0.68);
  box-shadow: 8px 10px 18px rgba(2, 8, 24, 0.2), inset 2px 2px 8px rgba(157, 193, 255, 0.08);
}

.auth-page[data-theme='dark'] .auth-input {
  color: #eff4ff;
}

.auth-page[data-theme='dark'] .auth-field-icon,
.auth-page[data-theme='dark'] .password-toggle,
.auth-page[data-theme='dark'] .floating-label {
  color: #b6c9ed;
}

.auth-page[data-theme='dark'] .auth-field:focus-within .floating-label,
.auth-page[data-theme='dark'] .auth-input:not(:placeholder-shown) ~ .floating-label {
  background: #172d5c;
  color: #8db9ff;
}

.auth-page[data-theme='dark'] .auth-divider span {
  background: rgba(157, 193, 255, 0.3);
}

@media (prefers-reduced-motion: reduce) {
  .editor-access,
  .landing-access,
  .theme-button {
    transition: none;
  }
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

  .auth-utility-bar {
    top: 18px;
    right: 18px;
    left: 18px;
  }

  .editor-access {
    min-height: 45px;
    padding: 0 12px;
    border-radius: 14px;
    font-size: 0.72rem;
  }

  .auth-utility-links {
    gap: 5px;
  }

  .landing-access {
    min-height: 45px;
    padding: 0 10px;
    border-radius: 14px;
    font-size: 0.68rem;
  }

  .theme-button {
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
.demo-access { display: flex; align-items: center; justify-content: space-between; gap: 14px; margin-top: 22px; padding: 13px 14px; border: 1px solid rgba(67, 125, 215, .28); border-radius: 14px; background: rgba(255, 255, 255, .46); text-align: left; }.demo-access strong, .demo-access small { display: block; }.demo-access strong { color: #244d88; font-size: .75rem; }.demo-access small { margin-top: 3px; color: #7188ac; font-size: .67rem; line-height: 1.35; }.demo-access button { flex: 0 0 auto; padding: 9px 11px; border: 1px solid #8eb9ec; border-radius: 9px; color: #246ac5; background: #fff; font: inherit; font-size: .72rem; font-weight: 800; cursor: pointer; }.demo-access button:disabled { cursor: wait; opacity: .6; }
</style>
