import type { Env } from '../_lib/env'
import { serve } from '../_lib/serve'

export const onRequestPost: PagesFunction<Env> = ({ request, env }) => serve(request, env, 'submit')

// Anything other than POST is rejected (otherwise Pages falls through to the SPA's index.html)
export const onRequest: PagesFunction<Env> = () =>
  new Response(JSON.stringify({ ok: false, code: 'ERROR', message: 'Method not allowed' }), {
    status: 405,
    headers: { 'content-type': 'application/json', allow: 'POST' },
  })
