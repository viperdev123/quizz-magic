import { MESSAGES } from '@shared/constants'
import type { ScoreErrorRes, ScoreReq, ScoreRes, SubmitReq, SubmitRes } from '@shared/schemas'

async function postJson<T>(path: string, body: unknown): Promise<T | ScoreErrorRes> {
  try {
    const res = await fetch(path, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(body),
    })
    return (await res.json()) as T
  } catch {
    return { ok: false, code: 'ERROR', message: MESSAGES.error }
  }
}

export const submitWorksheet = (req: SubmitReq) => postJson<SubmitRes>('/api/submit', req) as Promise<SubmitRes>
export const lookupScore = (req: ScoreReq) =>
  postJson<ScoreRes>('/api/score', req) as Promise<ScoreRes | ScoreErrorRes>
