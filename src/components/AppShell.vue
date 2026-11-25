<script setup lang="ts">
import { computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import TabBar, { type TabItem } from './TabBar.vue'
import { useAuthStore } from '@/stores/auth'
import { ACTIVITY_LABEL } from '@shared/constants'
import { toThaiDigits } from '@shared/drawn'

const auth = useAuthStore()
const route = useRoute()
const router = useRouter()

async function logout() {
  await auth.signOut()
  await router.replace({ name: 'teacher-login' })
}

const tabs = computed<TabItem[]>(() => [
  { to: '/submit', label: 'ส่งงาน' },
  { to: '/score', label: 'ดูคะแนน' },
])
const rightLabel = computed(() => (route.path.startsWith('/teacher') ? 'สำหรับครู' : toThaiDigits(ACTIVITY_LABEL)))
</script>

<template>
  <div class="flex min-h-screen flex-col">
    <a
      href="#main"
      class="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:rounded-field focus:bg-white focus:px-4 focus:py-2"
    >
      ข้ามไปยังเนื้อหา
    </a>
    <header class="border-b border-line/60 bg-white">
      <div class="mx-auto flex max-w-6xl items-center justify-between px-4 pt-5 sm:px-8">
        <div class="flex items-center gap-2 text-lg font-bold">
          <svg aria-hidden="true" viewBox="0 0 24 24" class="h-6 w-6 text-primary" fill="currentColor">
            <path d="M12 0c.8 6.6 5.4 11.2 12 12-6.6.8-11.2 5.4-12 12-.8-6.6-5.4-11.2-12-12C6.6 11.2 11.2 6.6 12 0Z" />
          </svg>
          ห้องเรียนคำนาม
        </div>
        <div class="flex items-center gap-3">
          <span class="text-sm text-ink-soft">{{ rightLabel }}</span>
          <button v-if="auth.isTeacher" type="button" class="btn-outline !min-h-tap !px-4 text-sm" @click="logout">
            ออกจากระบบ
          </button>
        </div>
      </div>
      <div class="mx-auto max-w-6xl px-4 py-3 sm:px-8"><TabBar :tabs="tabs" /></div>
    </header>

    <main id="main" class="mx-auto w-full max-w-6xl flex-1 px-4 py-8 sm:px-8">
      <slot />
    </main>

    <footer class="bg-footer">
      <div class="mx-auto max-w-6xl px-4 py-6 sm:px-8">
        <p class="font-bold">ลุ้นทายเลข เสกคำนาม</p>
        <p class="text-ink-soft">กิจกรรมภาษาไทย • คำนามน่ารู้ ชั้นมัธยมศึกษาปีที่ ๑</p>
        <RouterLink v-if="!auth.isTeacher" to="/teacher/login" class="mt-2 inline-block text-sm text-ink-soft underline">
          สำหรับครู
        </RouterLink>
      </div>
    </footer>
  </div>
</template>
