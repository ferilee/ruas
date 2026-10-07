<template>
  <div :class="wrapperClasses">
    <header v-if="!isExamRoute && !isAuthRoute && !isProfileRoute" :class="['app-header', { 'home-header': isHomeRoute || isTopicRoute }]">
      <router-link to="/" class="app-logo">
        <span v-if="isHomeRoute || isTopicRoute" class="brand-mark" aria-hidden="true">
          <svg viewBox="0 0 48 48">
            <path d="M7 18 24 8l17 10-17 10L7 18Z" />
            <path d="M13 23v9c6 5 16 5 22 0v-9" />
            <path d="M41 19v10" />
            <circle cx="41" cy="32" r="2" />
          </svg>
        </span>
        <span v-if="isHomeRoute || isTopicRoute" class="brand-copy">
          <strong>RUAS</strong>
          <small>RUANG ASESMEN</small>
        </span>
        <span v-else>Ruang Asesmen</span>
      </router-link>
      <router-link to="/admin" class="admin-link">Editor</router-link>
    </header>
    <main :class="['app-main', { 'home-main': isHomeRoute, 'auth-main': isAuthRoute, 'profile-main-shell': isProfileRoute, 'topic-main': isTopicRoute }]">
      <router-view />
    </main>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { useRoute } from 'vue-router';

const route = useRoute();
const isExamRoute = computed(() => route.name === 'quiz');
const isHomeRoute = computed(() => route.name === 'home');
const isAuthRoute = computed(() => route.name === 'auth');
const isProfileRoute = computed(() => route.name === 'profile');
const isTopicRoute = computed(() => route.name === 'topics');
const wrapperClasses = computed(() => {
  if (isExamRoute.value) return 'app-wrapper exam-wrapper';
  if (isAuthRoute.value) return 'auth-shell';
  if (isProfileRoute.value) return 'profile-shell';
  if (isHomeRoute.value) return 'home-shell';
  if (isTopicRoute.value) return 'topic-shell';
  return 'app-wrapper';
});
</script>

<style>
*,
*::before,
*::after {
  box-sizing: border-box;
  margin: 0;
  padding: 0;
}

body {
  font-family: 'Segoe UI', system-ui, -apple-system, sans-serif;
  background: #f0f4f8;
  color: #1a2b3c;
  line-height: 1.6;
  min-height: 100vh;
}

.app-wrapper {
  max-width: 800px;
  margin: 0 auto;
  padding: 0 16px;
}

.home-shell {
  min-height: 100vh;
  background: linear-gradient(145deg, #f3f7ff 0%, #e7efff 52%, #d6e4fc 100%);
}

.topic-shell {
  min-height: 100vh;
  background: linear-gradient(145deg, #f3f7ff 0%, #e7efff 52%, #d6e4fc 100%);
}

.auth-shell {
  min-height: 100vh;
  width: 100%;
}

.profile-shell {
  min-height: 100vh;
  width: 100%;
}

.exam-wrapper {
  max-width: none;
  padding: 0;
}

.app-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 20px 0;
  border-bottom: 1px solid #d4dde6;
  margin-bottom: 32px;
}

.home-header {
  position: relative;
  justify-content: center;
  min-height: 100px;
  margin: 0;
  padding: 18px 24px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.58);
  background: transparent;
}

.admin-link {
  color: #556677;
  font-size: 0.9rem;
  text-decoration: none;
}

.admin-link:hover {
  color: #1e40af;
}

.app-logo {
  font-size: 1.4rem;
  font-weight: 700;
  color: #1e40af;
  text-decoration: none;
}

.home-header .app-logo {
  display: inline-flex;
  align-items: center;
  gap: 14px;
  color: #10265e;
}

.brand-mark {
  display: grid;
  width: 52px;
  height: 52px;
  place-items: center;
  border: 2px solid rgba(255, 255, 255, 0.95);
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.48);
  box-shadow: 0 8px 18px rgba(119, 148, 203, 0.2), inset 2px 2px 8px rgba(255, 255, 255, 0.8);
}

.brand-mark svg {
  width: 34px;
  height: 34px;
  fill: none;
  stroke: #1760dc;
  stroke-linecap: round;
  stroke-linejoin: round;
  stroke-width: 2.2;
}

.brand-copy {
  display: flex;
  flex-direction: column;
  line-height: 1.1;
}

.brand-copy strong {
  font-size: 1.35rem;
  letter-spacing: 0.08em;
}

.brand-copy small {
  margin-top: 5px;
  color: #59709d;
  font-size: 0.66rem;
  font-weight: 600;
  letter-spacing: 0.1em;
}

.home-header .admin-link {
  position: absolute;
  right: 24px;
  color: #59709d;
}

.home-header .admin-link:hover {
  color: #236bdc;
}

.app-main {
  padding-bottom: 64px;
}

.home-main {
  padding-bottom: 0;
}

.topic-main {
  padding: 0;
}

.auth-main {
  padding: 0;
}

.profile-main-shell {
  padding: 0;
}

.exam-wrapper .app-main {
  padding-bottom: 0;
}
</style>
