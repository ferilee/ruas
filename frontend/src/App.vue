<template>
  <div :class="isExamRoute ? 'app-wrapper exam-wrapper' : 'app-wrapper'">
    <header v-if="!isExamRoute" class="app-header">
      <router-link to="/" class="app-logo">Ruang Asesmen</router-link>
      <router-link to="/admin" class="admin-link">Editor</router-link>
    </header>
    <main class="app-main">
      <router-view />
    </main>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { useRoute } from 'vue-router';

const route = useRoute();
const isExamRoute = computed(() => route.name === 'quiz');
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

.app-main {
  padding-bottom: 64px;
}

.exam-wrapper .app-main {
  padding-bottom: 0;
}
</style>
