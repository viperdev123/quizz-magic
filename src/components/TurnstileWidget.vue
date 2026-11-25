<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref } from 'vue'

interface TurnstileApi {
  render(el: HTMLElement, opts: Record<string, unknown>): string
  reset(id?: string): void
  remove(id?: string): void
}
declare global {
  interface Window {
    turnstile?: TurnstileApi
  }
}

const emit = defineEmits<{ token: [value: string] }>()
const host = ref<HTMLElement | null>(null)
let widgetId: string | undefined

const SCRIPT_SRC = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit'

function loadScript(): Promise<void> {
  if (window.turnstile) return Promise.resolve()
  return new Promise((resolve, reject) => {
    const existing = document.querySelector<HTMLScriptElement>(`script[src="${SCRIPT_SRC}"]`)
    const s = existing ?? document.createElement('script')
    s.addEventListener('load', () => resolve())
    s.addEventListener('error', () => reject(new Error('turnstile')))
    if (!existing) {
      s.src = SCRIPT_SRC
      s.async = true
      document.head.appendChild(s)
    }
  })
}

onMounted(async () => {
  try {
    await loadScript()
    if (!host.value || !window.turnstile) return
    widgetId = window.turnstile.render(host.value, {
      sitekey: import.meta.env.VITE_TURNSTILE_SITE_KEY,
      language: 'th',
      callback: (t: string) => emit('token', t),
      'expired-callback': () => emit('token', ''),
      'error-callback': () => emit('token', ''),
    })
  } catch {
    emit('token', '')
  }
})
onBeforeUnmount(() => widgetId && window.turnstile?.remove(widgetId))

// Tokens are single-use: call after every submit attempt.
defineExpose({
  reset() {
    emit('token', '')
    if (widgetId) window.turnstile?.reset(widgetId)
  },
})
</script>

<template>
  <div ref="host" class="min-h-[65px]" aria-label="ตรวจสอบว่าไม่ใช่โปรแกรมอัตโนมัติ"></div>
</template>
