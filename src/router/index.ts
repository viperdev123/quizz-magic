import { createRouter, createWebHistory } from 'vue-router'
import { useAuthStore } from '@/stores/auth'

export const router = createRouter({
  history: createWebHistory(),
  routes: [
    { path: '/', redirect: '/submit' },
    { path: '/submit', name: 'submit', component: () => import('@/views/SubmitView.vue') },
    { path: '/score', name: 'score', component: () => import('@/views/ScoreView.vue') },
    {
      path: '/teacher/login',
      name: 'teacher-login',
      component: () => import('@/views/TeacherLoginView.vue'),
      meta: { guestOnly: true },
    },
    {
      path: '/teacher',
      name: 'teacher',
      component: () => import('@/views/TeacherGradingView.vue'),
      meta: { requiresTeacher: true },
    },
    { path: '/:pathMatch(.*)*', redirect: '/submit' },
  ],
})

// UX guard only. Real enforcement is Row Level Security in Postgres.
router.beforeEach(async (to) => {
  if (!to.meta.requiresTeacher && !to.meta.guestOnly) return true
  const auth = useAuthStore()
  if (!auth.ready) await auth.refresh()
  if (to.meta.requiresTeacher && !auth.isTeacher) return { name: 'teacher-login' }
  if (to.meta.guestOnly && auth.isTeacher) return { name: 'teacher' }
  return true
})
