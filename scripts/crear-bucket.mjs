/**
 * Crea (idempotente) el bucket público "imagenes" en Supabase Storage.
 * Lee NEXT_PUBLIC_SUPABASE_URL y SUPABASE_SERVICE_ROLE_KEY de .env.local
 * (gitignoreado — el secreto nunca se commitea ni pasa por el chat).
 *
 * Uso:  node scripts/crear-bucket.mjs
 */
import { readFileSync } from "fs";

function loadEnv() {
  const env = {};
  for (const line of readFileSync(".env.local", "utf8").split(/\r?\n/)) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*?)\s*$/);
    if (m) env[m[1]] = m[2].replace(/^["']|["']$/g, "").trim();
  }
  return env;
}

const env = loadEnv();
const url = env.NEXT_PUBLIC_SUPABASE_URL;
const key = env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) {
  console.error("✗ Falta NEXT_PUBLIC_SUPABASE_URL o SUPABASE_SERVICE_ROLE_KEY en .env.local");
  process.exit(1);
}

const res = await fetch(`${url}/storage/v1/bucket`, {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
    apikey: key,
    Authorization: `Bearer ${key}`,
  },
  body: JSON.stringify({
    id: "imagenes",
    name: "imagenes",
    public: true,
    file_size_limit: 5242880, // 5 MB
    allowed_mime_types: ["image/png", "image/jpeg", "image/webp", "image/gif"],
  }),
});

const body = await res.json().catch(() => ({}));

if (res.ok) {
  console.log("✓ Bucket 'imagenes' creado (público, 5 MB máx).");
} else if (body?.error === "Duplicate" || /already exists/i.test(body?.message || "")) {
  console.log("✓ El bucket 'imagenes' ya existía. Nada que hacer.");
} else {
  console.error("✗ Error creando el bucket:", res.status, body);
  process.exit(1);
}
