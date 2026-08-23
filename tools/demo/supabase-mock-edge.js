/**
 * tools/demo/supabase-mock-edge.js
 *
 * Variante del mock de `@supabase/ssr` para el runtime edge (proxy.ts).
 * El proxy solo necesita saber si hay sesión, así que resuelve todo desde la
 * cookie y no toca el sistema de archivos.
 */
const SESSION_COOKIE = 'demo-session'

function buildClient(adapter) {
  return {
    auth: {
      async getUser() {
        let id = null
        try {
          const all = adapter.getAll() || []
          const hit = all.find((c) => c.name === SESSION_COOKIE)
          id = hit && hit.value ? hit.value : null
        } catch { id = null }
        return { data: { user: id ? { id, aud: 'authenticated' } : null }, error: null }
      },
      async getSession() { return { data: { session: null }, error: null } },
      async signOut() { return { error: null } },
    },
    from() { throw new Error('demo mock edge: sin acceso a datos en el proxy') },
  }
}

function createServerClient(_url, _key, options) {
  return buildClient((options && options.cookies) || { getAll: () => [], setAll: () => {} })
}
function createBrowserClient() { return buildClient({ getAll: () => [], setAll: () => {} }) }

module.exports = { createServerClient, createBrowserClient }
