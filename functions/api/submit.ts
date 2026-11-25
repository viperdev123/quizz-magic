import type { Env } from '../_lib/env'
import { serve } from '../_lib/serve'

export const onRequestPost: PagesFunction<Env> = ({ request, env }) => serve(request, env, 'submit')
