// vitest's reporter uses Map.groupBy (Node 21+). Loaded via `node --require` so failures print on Node 20.
if (typeof Map.groupBy !== 'function') {
  Map.groupBy = (items, keyFn) => {
    const out = new Map()
    let i = 0
    for (const item of items) {
      const k = keyFn(item, i++)
      if (!out.has(k)) out.set(k, [])
      out.get(k).push(item)
    }
    return out
  }
}
if (typeof Object.groupBy !== 'function') {
  Object.groupBy = (items, keyFn) => {
    const out = Object.create(null)
    let i = 0
    for (const item of items) {
      const k = keyFn(item, i++)
      ;(out[k] ||= []).push(item)
    }
    return out
  }
}
