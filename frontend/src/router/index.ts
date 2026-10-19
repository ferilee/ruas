import { createRouter, createWebHistory } from 'vue-router';
import AuthView from '@/views/AuthView.vue';
import ChangePasswordView from '@/views/ChangePasswordView.vue';
import ProfileView from '@/views/ProfileView.vue';
import HomeView from '@/views/HomeView.vue';
import TopicView from '@/views/TopicView.vue';
import QuizView from '@/views/QuizView.vue';
import AdminView from '@/views/AdminView.vue';
import LandingView from '@/views/LandingView.vue';
import TeacherApplyView from '@/views/TeacherApplyView.vue';

async function getAuthEnabled(): Promise<boolean> {
  try {
    const res = await fetch('/api/auth');
    if (!res.ok) return true;
    const data = await res.json() as { auth_enabled?: boolean };
    return Boolean(data.auth_enabled);
  } catch {
    return true;
  }
}

const routes = [
  { path: '/auth', name: 'auth', component: AuthView },
  { path: '/ajukan-guru', name: 'teacher-apply', component: TeacherApplyView },
  { path: '/change-password', name: 'change-password', component: ChangePasswordView, meta: { requiresAuth: true } },
  { path: '/tentang', name: 'landing', component: LandingView },
  { path: '/profile', name: 'profile', component: ProfileView, meta: { requiresAuth: true } },
  { path: '/', name: 'home', component: HomeView, meta: { requiresAuth: true } },
  { path: '/topics/:id', name: 'topics', component: TopicView, meta: { requiresAuth: true } },
  { path: '/quiz/:id', name: 'quiz', component: QuizView, meta: { requiresAuth: true } },
  { path: '/admin', name: 'admin', component: AdminView },
];

export async function buildRouter() {
  const authEnabled = await getAuthEnabled();

  const router = createRouter({
    history: createWebHistory(),
    routes,
  });

  router.beforeEach((to, _from, next) => {
    const token = sessionStorage.getItem('auth_token');
    const needsAuth = to.matched.some((r) => r.meta.requiresAuth);

    if (to.path === '/auth' && !authEnabled) {
      next('/');
    } else if (needsAuth && authEnabled && !token) {
      next('/auth');
    } else {
      next();
    }
  });

  return router;
}
