// Node 20 has no global WebSocket, and supabase-js refuses to construct a client without one.
// These tests never open a realtime connection, so an inert stand-in is enough. Test-only:
// production runs on Cloudflare Workers / browsers, which provide a real WebSocket.
const g = globalThis as { WebSocket?: unknown }
if (typeof g.WebSocket === 'undefined') {
  g.WebSocket = class InertWebSocket {}
}
