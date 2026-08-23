/**
 * tools/demo/store.js
 *
 * Almacen en memoria + archivo JSON para el MODO DEMO.
 * Solo se usa cuando DEMO_MODE=1 (nunca en produccion).
 *
 * La escritura es atomica (temporal + rename) y la lectura reintenta, porque
 * Next.js atiende varias requests en paralelo sobre el mismo archivo.
 */
const fs = require('fs')
const path = require('path')

const DB_PATH = process.env.DEMO_DB_PATH || path.join(process.cwd(), '.demo-db.json')
const SEED_PATH =
  process.env.DEMO_SEED_PATH || path.join(process.cwd(), 'tools/demo/seed.json')

function leerSeed() {
  return JSON.parse(fs.readFileSync(SEED_PATH, 'utf8'))
}

function load() {
  for (let intento = 0; intento < 5; intento++) {
    let crudo
    try {
      crudo = fs.readFileSync(DB_PATH, 'utf8')
    } catch {
      // Todavia no existe: sembramos desde el seed.
      const seed = leerSeed()
      save(seed)
      return seed
    }
    try {
      return JSON.parse(crudo)
    } catch {
      // Lectura de una escritura a medias: reintentamos, nunca re-sembramos
      // (perderiamos lo que se cargo durante la demo).
    }
  }
  return leerSeed()
}

function save(db) {
  const tmp = `${DB_PATH}.${process.pid}.${Math.random().toString(36).slice(2, 8)}.tmp`
  fs.writeFileSync(tmp, JSON.stringify(db, null, 2))
  fs.renameSync(tmp, DB_PATH)
}

function uid() {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0
    const v = c === 'x' ? r : (r & 0x3) | 0x8
    return v.toString(16)
  })
}

module.exports = { load, save, uid, DB_PATH }
