import { defineStore } from 'pinia'
import { ref } from 'vue'

export type SignInResult = 'ok' | 'invalid' | 'not_teacher'

// supabase-js is only for teachers. It is loaded on demand so student pages never download it.
const loadSupabase = async () => (await import('@/lib/supabase')).getSupabase()

/** True when this browser holds a Supabase session (i.e. it may be a teacher). */
function hasStoredSession(): boolean {
  try {
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i) ?? ''
      if (k.startsWith('sb-') && k.endsWith('-auth-token')) return true
    }
  } catch {
    /* storage blocked */
  }
  return false
}

export const useAuthStore = defineStore('auth', () => {
  const isTeacher = ref(false)
  const ready = ref(false)

  let onSignedOut: (() => void) | null = null
  let listening = false

  async function attachListener() {
    if (listening || !onSignedOut) return
    listening = true
    const sb = await loadSupabase()
    sb.auth.onAuthStateChange((event) => {
      if (event === 'SIGNED_OUT') {
        isTeacher.value = false
        onSignedOut?.()
      }
    })
  }

  /** Resolve the current session and confirm the user is listed in `teachers` (RLS: own row only). */
  async function refresh() {
    try {
      if (!hasStoredSession()) {
        isTeacher.value = false // a student: do not even load the Supabase client
        return
      }
      const sb = await loadSupabase()
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
    const sb = await loadSupabase()
    const { error } = await sb.auth.signInWithPassword({ email: email.trim(), password })
    if (error) return 'invalid'
    await refresh()
    if (!isTeacher.value) {
      await sb.auth.signOut() // valid account, but not a teacher: do not keep the session
      return 'not_teacher'
    }
    void attachListener()
    return 'ok'
  }

  async function signOut() {
    const sb = await loadSupabase()
    await sb.auth.signOut()
    isTeacher.value = false
  }

  /** Be told when the session ends elsewhere (other tab, expiry). Loads Supabase only if a session exists. */
  function watchSession(cb: () => void) {
    onSignedOut = cb
    if (hasStoredSession()) void attachListener()
  }

  return { isTeacher, ready, refresh, signIn, signOut, watchSession }
})
