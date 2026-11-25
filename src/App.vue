<script setup lang="ts">
import { onMounted } from 'vue'
import AppShell from '@/components/AppShell.vue'
import { useAuthStore } from '@/stores/auth'

const auth = useAuthStore()
onMounted(() => void auth.refresh())
</script>

<template>
  <AppShell>
    <RouterView />
  </AppShell>
</template>
