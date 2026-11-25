import { defineStore } from 'pinia'
import { ref } from 'vue'
import { getSupabase } from '@/lib/supabase'

export const useAuthStore = defineStore('auth', () => {
  const isTeacher = ref(false)
  const ready = ref(false)

  /** Resolve the current session and confirm the user is listed in `teachers` (RLS: own row only). */
  async function refresh() {
    try {
      const sb = getSupabase()
      const { data } = await sb.auth.getSession()
      const uid = data.session?.user.id
      if (!uid) {
        isTeacher.value = false
        return
      }
      const { data: row } = await sb.from('teachers').select('user_id').eq('user_id', uid).maybeSingle()
      isTeacher.value = !!row
    } catch {
      isTeacher.value = false
    } finally {
      ready.value = true
    }
  }

  async function signIn(email: string, password: string): Promise<boolean> {
    // Hook for later: add signInWithOAuth({ provider: 'google' }) here.
    const { error } = await getSupabase().auth.signInWithPassword({ email, password })
    if (error) return false
    await refresh()
    return isTeacher.value
  }

  async function signOut() {
    await getSupabase().auth.signOut()
    isTeacher.value = false
  }

  return { isTeacher, ready, refresh, signIn, signOut }
})
