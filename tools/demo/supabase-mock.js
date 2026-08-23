/**
 * tools/demo/supabase-mock.js
 *
 * Reemplazo de `@supabase/ssr` para el MODO DEMO (DEMO_MODE=1).
 * Implementa el subconjunto de la API que usa la app (query builder + auth +
 * storage) contra un JSON local, para poder correr la UI real sin credenciales.
 *
 * NO forma parte del build de producción: solo se aliasa desde next.config.js
 * cuando DEMO_MODE=1.
 */
const { load, save, uid } = require('./store')

const SESSION_COOKIE = 'demo-session'

/* ── Relaciones embebidas soportadas ─────────────────────────────────────── */
const RELATIONS = {
  turnos: {
    profiles:  { table: 'profiles',  fk: 'cliente_id' },
    barberos:  { table: 'barberos',  fk: 'barbero_id' },
    servicios: { table: 'servicios', fk: 'servicio_id' },
  },
  barberos: {
    profiles: { table: 'profiles', reverseFk: 'barbero_id', many: true },
  },
  pedidos: {
    items_pedido: { table: 'items_pedido', reverseFk: 'pedido_id', many: true },
  },
}

/** Extrae los nombres de relación de un string de select de PostgREST. */
function parseEmbeds(sel) {
  if (!sel) return []
  const out = []
  const re = /(?:([a-z_]+)\s*:\s*)?([a-z_]+)\s*\(/gi
  let m
  while ((m = re.exec(sel)) !== null) {
    out.push({ alias: m[1] || m[2], table: m[2] })
  }
  return out
}

function attachEmbeds(db, table, row, sel) {
  const embeds = parseEmbeds(sel)
  if (!embeds.length) return row
  const rels = RELATIONS[table] || {}
  const copy = { ...row }
  for (const e of embeds) {
    const rel = rels[e.table]
    if (!rel) continue
    const target = db[rel.table] || []
    if (rel.many) {
      copy[e.alias] = target.filter((r) => r[rel.reverseFk] === row.id)
    } else {
      copy[e.alias] = target.find((r) => r.id === row[rel.fk]) || null
    }
  }
  return copy
}

function cmp(a, b) {
  if (a === b) return 0
  if (a === null || a === undefined) return -1
  if (b === null || b === undefined) return 1
  if (typeof a === 'number' && typeof b === 'number') return a - b
  return String(a) < String(b) ? -1 : 1
}

class Query {
  constructor(table, opts) {
    this.table = table
    this.opts = opts || {}
    this.filters = []
    this.orders = []
    this._select = '*'
    this._count = null
    this._head = false
    this._limit = null
    this._single = null
    this._op = 'select'
    this._payload = null
  }

  select(sel, options) {
    this._select = sel || '*'
    if (options && options.count) this._count = options.count
    if (options && options.head) this._head = true
    if (this._op === 'insert' || this._op === 'update') this._returning = true
    return this
  }

  eq(col, val)  { this.filters.push((r) => r[col] === val); return this }
  neq(col, val) { this.filters.push((r) => r[col] !== val); return this }
  gt(col, val)  { this.filters.push((r) => cmp(r[col], val) > 0); return this }
  gte(col, val) { this.filters.push((r) => cmp(r[col], val) >= 0); return this }
  lt(col, val)  { this.filters.push((r) => cmp(r[col], val) < 0); return this }
  lte(col, val) { this.filters.push((r) => cmp(r[col], val) <= 0); return this }
  in(col, vals) { this.filters.push((r) => vals.includes(r[col])); return this }
  is(col, val)  { this.filters.push((r) => r[col] === val); return this }
  limit(n)      { this._limit = n; return this }
  order(col, options) {
    this.orders.push({ col, asc: !options || options.ascending !== false })
    return this
  }
  single()      { this._single = 'single'; return this }
  maybeSingle() { this._single = 'maybe'; return this }

  insert(payload) { this._op = 'insert'; this._payload = payload; return this }
  update(payload) { this._op = 'update'; this._payload = payload; return this }
  upsert(payload) { this._op = 'upsert'; this._payload = payload; return this }
  delete()        { this._op = 'delete'; return this }

  _rows(db) {
    let rows = (db[this.table] || []).slice()
    for (const f of this.filters) rows = rows.filter(f)
    return rows
  }

  _run() {
    const db = load()
    if (!db[this.table]) db[this.table] = []

    if (this._op === 'insert' || this._op === 'upsert') {
      const items = Array.isArray(this._payload) ? this._payload : [this._payload]
      const created = []
      for (const item of items) {
        const row = { id: item.id || uid(), created_at: new Date().toISOString(), ...item }
        const idx = db[this.table].findIndex((r) => r.id === row.id)
        if (idx >= 0 && this._op === 'upsert') db[this.table][idx] = { ...db[this.table][idx], ...row }
        else db[this.table].push(row)
        created.push(row)
      }
      save(db)
      const data = this._single ? created[0] ?? null : created
      return { data: this._returning ? data : null, error: null, count: created.length }
    }

    if (this._op === 'update') {
      const rows = this._rows(db)
      const updated = []
      for (const r of rows) {
        const idx = db[this.table].findIndex((x) => x.id === r.id)
        db[this.table][idx] = { ...db[this.table][idx], ...this._payload }
        updated.push(db[this.table][idx])
      }
      save(db)
      const data = this._single ? updated[0] ?? null : updated
      return { data: this._returning ? data : null, error: null, count: updated.length }
    }

    if (this._op === 'delete') {
      const rows = this._rows(db)
      const ids = new Set(rows.map((r) => r.id))
      db[this.table] = db[this.table].filter((r) => !ids.has(r.id))
      save(db)
      return { data: null, error: null, count: ids.size }
    }

    // select
    let rows = this._rows(db)
    for (let i = this.orders.length - 1; i >= 0; i--) {
      const o = this.orders[i]
      rows = rows.slice().sort((a, b) => (o.asc ? cmp(a[o.col], b[o.col]) : cmp(b[o.col], a[o.col])))
    }
    const total = rows.length
    if (this._limit !== null) rows = rows.slice(0, this._limit)
    if (this._head) return { data: null, error: null, count: total }

    rows = rows.map((r) => attachEmbeds(db, this.table, r, this._select))

    if (this._single === 'single') {
      if (rows.length !== 1) {
        return { data: null, error: { message: 'JSON object requested, multiple (or no) rows returned' }, count: total }
      }
      return { data: rows[0], error: null, count: total }
    }
    if (this._single === 'maybe') {
      return { data: rows[0] ?? null, error: null, count: total }
    }
    return { data: rows, error: null, count: total }
  }

  then(resolve, reject) {
    try {
      return Promise.resolve(this._run()).then(resolve, reject)
    } catch (e) {
      return Promise.resolve({ data: null, error: { message: String(e && e.message) } }).then(resolve, reject)
    }
  }
}

/* ── Auth ────────────────────────────────────────────────────────────────── */

function makeAuth(cookieAdapter) {
  const readCookie = (name) => {
    try {
      const all = cookieAdapter.getAll() || []
      const hit = all.find((c) => c.name === name)
      return hit ? hit.value : null
    } catch { return null }
  }
  const writeCookie = (name, value) => {
    try {
      cookieAdapter.setAll([{ name, value, options: { path: '/', httpOnly: false, sameSite: 'lax' } }])
    } catch { /* Server Components no pueden escribir cookies */ }
  }

  const userFromProfile = (p) =>
    p && {
      id: p.id,
      email: p.email,
      user_metadata: { nombre: p.nombre, apellido: p.apellido },
      app_metadata: {},
      aud: 'authenticated',
      created_at: p.created_at,
    }

  return {
    async getUser() {
      const id = readCookie(SESSION_COOKIE)
      if (!id) return { data: { user: null }, error: null }
      const db = load()
      const p = (db.profiles || []).find((r) => r.id === id)
      return { data: { user: userFromProfile(p) || null }, error: p ? null : { message: 'user not found' } }
    },
    async getSession() {
      const { data } = await this.getUser()
      return { data: { session: data.user ? { user: data.user } : null }, error: null }
    },
    async signInWithPassword({ email, password }) {
      const db = load()
      const p = (db.profiles || []).find((r) => r.email.toLowerCase() === String(email).toLowerCase())
      if (!p || (db.passwords || {})[p.email] !== password) {
        return { data: { user: null, session: null }, error: { message: 'Invalid login credentials' } }
      }
      writeCookie(SESSION_COOKIE, p.id)
      return { data: { user: userFromProfile(p), session: { user: userFromProfile(p) } }, error: null }
    },
    async signUp({ email, password, options }) {
      const db = load()
      if ((db.profiles || []).some((r) => r.email.toLowerCase() === String(email).toLowerCase())) {
        return { data: { user: null, session: null }, error: { message: 'User already registered' } }
      }
      const meta = (options && options.data) || {}
      const p = {
        id: uid(),
        email,
        nombre: meta.nombre || '',
        apellido: meta.apellido || '',
        role: 'client',
        barbero_id: null,
        created_at: new Date().toISOString(),
      }
      db.profiles.push(p)
      db.passwords = db.passwords || {}
      db.passwords[email] = password
      save(db)
      return { data: { user: userFromProfile(p), session: null }, error: null }
    },
    async signOut() {
      writeCookie(SESSION_COOKIE, '')
      return { error: null }
    },
    async updateUser() { return { data: { user: null }, error: null } },
    async resetPasswordForEmail() { return { data: {}, error: null } },
    async verifyOtp() { return { data: {}, error: null } },
    async exchangeCodeForSession() { return { data: {}, error: null } },
    admin: {
      async createUser({ email, password }) {
        const db = load()
        if ((db.profiles || []).some((r) => r.email.toLowerCase() === String(email).toLowerCase())) {
          return { data: null, error: { message: 'El email ya está registrado' } }
        }
        db.passwords = db.passwords || {}
        db.passwords[email] = password
        save(db)
        return { data: { user: { id: uid(), email } }, error: null }
      },
      async deleteUser() { return { data: {}, error: null } },
    },
  }
}

/* ── Storage ─────────────────────────────────────────────────────────────── */

const storage = {
  from() {
    return {
      async upload(path) { return { data: { path }, error: null } },
      getPublicUrl(path) { return { data: { publicUrl: `/images/demo/${path}` } } },
    }
  },
}

/* ── Cliente ─────────────────────────────────────────────────────────────── */

function buildClient(cookieAdapter) {
  return {
    from(table) { return new Query(table) },
    auth: makeAuth(cookieAdapter),
    storage,
    rpc() { return Promise.resolve({ data: null, error: null }) },
  }
}

function createServerClient(_url, _key, options) {
  const adapter = (options && options.cookies) || { getAll: () => [], setAll: () => {} }
  return buildClient(adapter)
}

function createBrowserClient() {
  return buildClient({ getAll: () => [], setAll: () => {} })
}

module.exports = { createServerClient, createBrowserClient }
