import { defineStore } from 'pinia'
import { ref } from 'vue'
import { getSupabase } from '@/lib/supabase'

export type SignInResult = 'ok' | 'invalid' | 'not_teacher'

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

  async function signIn(email: string, password: string): Promise<SignInResult> {
    // Hook for later: add signInWithOAuth({ provider: 'google' }) here.
    const sb = getSupabase()
    const { error } = await sb.auth.signInWithPassword({ email: email.trim(), password })
    if (error) return 'invalid'
    await refresh()
    if (!isTeacher.value) {
      await sb.auth.signOut() // valid account, but not a teacher: do not keep the session
      return 'not_teacher'
    }
    return 'ok'
  }

  async function signOut() {
    await getSupabase().auth.signOut()
    isTeacher.value = false
  }

  /** Keep the UI in sync when the session ends elsewhere (other tab, expiry). */
  function watchSession(onSignedOut: () => void) {
    const { data } = getSupabase().auth.onAuthStateChange((event) => {
      if (event === 'SIGNED_OUT') {
        isTeacher.value = false
        onSignedOut()
      }
    })
    return () => data.subscription.unsubscribe()
  }

  return { isTeacher, ready, refresh, signIn, signOut, watchSession }
})
