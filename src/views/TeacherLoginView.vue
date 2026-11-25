<script setup lang="ts">
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'

const auth = useAuthStore()
const router = useRouter()
const email = ref('')
const password = ref('')
const loading = ref(false)
const error = ref('')

async function submit() {
  error.value = ''
  if (!email.value.trim() || !password.value) {
    error.value = 'กรอกอีเมลและรหัสผ่านให้ครบก่อนนะ'
    return
  }
  loading.value = true
  try {
    const result = await auth.signIn(email.value, password.value)
    if (result === 'ok') await router.replace({ name: 'teacher' })
    else if (result === 'not_teacher') error.value = 'บัญชีนี้ไม่ได้รับสิทธิ์ครู'
    else error.value = 'อีเมลหรือรหัสผ่านไม่ถูกต้อง'
  } catch {
    error.value = 'เข้าสู่ระบบไม่สำเร็จ กรุณาลองใหม่อีกครั้ง'
  } finally {
    loading.value = false
    password.value = ''
  }
}
</script>

<template>
  <section class="mx-auto max-w-md">
    <p class="font-semibold text-primary">พื้นที่สำหรับครู</p>
    <h1 class="mt-1 text-4xl font-extrabold">เข้าสู่ระบบครู</h1>
    <p class="mt-2 text-ink-soft">ลุ้นทายเลข เสกคำนาม • จัดการงานและส่งต่อกำลังใจ</p>

    <form novalidate class="mt-6 space-y-4 card p-5 sm:p-6" @submit.prevent="submit">
      <label class="block">
        <span class="mb-2 block font-semibold">อีเมล</span>
        <input v-model="email" type="email" autocomplete="username" class="field" placeholder="teacher@school.ac.th" />
      </label>
      <label class="block">
        <span class="mb-2 block font-semibold">รหัสผ่าน</span>
        <input v-model="password" type="password" autocomplete="current-password" class="field" placeholder="รหัสผ่าน" />
      </label>
      <p v-if="error" role="alert" class="rounded-field bg-tint-red px-4 py-3 text-bad">{{ error }}</p>
      <button type="submit" class="btn-primary w-full" :disabled="loading">
        {{ loading ? 'กำลังเข้าสู่ระบบ...' : 'เข้าสู่ระบบ' }}
      </button>
      <!-- Google sign-in hook: add a button here that calls auth.signInWithGoogle() (see stores/auth.ts) -->
    </form>
  </section>
</template>
