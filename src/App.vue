<script setup lang="ts">
import { onMounted } from 'vue'
import AppShell from '@/components/AppShell.vue'
import { useRoute, useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'

const auth = useAuthStore()
const router = useRouter()
const route = useRoute()
onMounted(() => {
  void auth.refresh()
  try {
    // session ended (other tab / expiry) while on a teacher page -> back to login
    auth.watchSession(() => {
      if (route.meta.requiresTeacher) void router.replace({ name: 'teacher-login' })
    })
  } catch {
    /* Supabase not configured */
  }
})
</script>

<template>
  <AppShell>
    <RouterView />
  </AppShell>
</template>
