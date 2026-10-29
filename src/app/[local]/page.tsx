import React from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getProfile, getUser } from "@/lib/auth";
import { getLocal, getPermisos } from "@/lib/local";
import { rutaLocal, whatsappLink } from "@/lib/local-datos";
import { conMayuscula } from "@/lib/rubros";
import { PRODUCTO } from "@/lib/producto";
import { formatPrecio } from "@/lib/format";
import { getBarberos } from "@/app/actions/barberos";
import { getResenasVisibles } from "@/app/actions/resenas";
import { getServicios } from "@/app/actions/reservas";
import { getHorariosSemana } from "@/app/actions/horarios";
import { Logo } from "@/components/ui/Logo";
import { WhatsappFloat } from "@/components/ui/WhatsappFloat";
import { MobileMenu } from "@/components/ui/MobileMenu";

/**
 * La home de un local (/roble, /otro-local).
 *
 * Todo lo que dice sale de la base: nombre, servicios con su precio, el
 * equipo, las reseñas, la dirección, los horarios y las redes. Antes era la
 * home de Roble escrita a mano.
 *
 * Dos bloques (la franja de "años de oficio" y "Nuestro espacio") son texto de
 * marketing INVENTADO para la demo de Roble, que es un local ficticio. Se
 * muestran solo en Roble: en un local real serían datos falsos sobre un
 * negocio que existe. Cuando cada local pueda personalizar su home (Fase 6),
 * ese contenido pasa a la base.
 */
export default async function HomePage({ params }: { params: Promise<{ local: string }> }) {
  const local = await getLocal((await params).local);
  if (!local) notFound();
  const ruta = (r: string = "") => rutaLocal(local.slug, r);
  const { palabras } = local;
  const esDemoDeRoble = local.slug === PRODUCTO.localPorDefecto;

  // Servicios, equipo y reseñas, de la base. Si la base no responde, la home
  // igual se ve (sin esas secciones) en vez de mostrar un error.
  type ServicioRow = { id: string; nombre: string; descripcion: string | null; precio: number; duracion_minutos: number };
  type BarberoRow = { nombre: string; apellido: string | null; especialidad: string | null; bio: string | null; dias: string[] | null };
  type ResenaRow = { nombre: string; texto: string; rating: number };

  // Todo a la vez: quién mira (la sesión se verifica acá mismo, sin ir a la
  // base) y lo que muestra la página. Con sesión, el perfil y los permisos.
  const usuario = await getUser();
  const [profile, permisos, serviciosDb, barberosDb, resenasDb, horarios] = await Promise.all([
    usuario ? getProfile() : null,
    usuario ? getPermisos(local.id) : null,
    getServicios(local.slug).catch(() => [] as ServicioRow[]),
    getBarberos(local.slug).catch(() => [] as BarberoRow[]),
    getResenasVisibles(local.slug).catch(() => [] as ResenaRow[]),
    // Los mismos horarios que usa la reserva (Fase 3b): no pueden decir otra cosa.
    getHorariosSemana(local.slug).catch(() => [] as { dia: string; horas: string }[]),
  ]);

  // A qué panel lleva el botón de arriba, según lo que es en ESTE local.
  const panelLink = !profile
    ? null
    : permisos?.editaCatalogo
      ? ruta("/admin/dashboard")
      : permisos?.barberoId
        ? ruta("/barbero/calendario")
        : ruta("/dashboard");
  const panelLabel = permisos?.editaCatalogo ? "Panel" : "Mi cuenta";

  const servicios = (serviciosDb as ServicioRow[]).slice(0, 6);
  const Profesional = conMayuscula(palabras.profesional);
  const barberos = (barberosDb as BarberoRow[]).map((b) => ({
    nombre: b.nombre,
    rol: b.especialidad || (b.dias?.length ? `${Profesional} · ${b.dias.join(", ")}` : Profesional),
    bio: b.bio || "",
  }));
  const resenas = (resenasDb as ResenaRow[]).map((r) => ({ texto: r.texto, autor: r.nombre, rating: r.rating }));

  // El lema del local. Si nombra al rubro ("el oficio de la barbería"), esa
  // palabra va con el degradé de madera, como en el diseño original de Roble.
  const lema = local.lema || `Reservá tu turno en ${local.nombre}`;
  const corte = lema.toLowerCase().indexOf(palabras.negocio.toLowerCase());
  const lemaPartes = corte >= 0
    ? [lema.slice(0, corte), lema.slice(corte, corte + palabras.negocio.length), lema.slice(corte + palabras.negocio.length)]
    : null;

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 flex flex-col font-sans">
      {/* ── Header ─────────────────────────────────────────────── */}
      <header className="border-b border-white/5 bg-zinc-950/70 backdrop-blur-md sticky top-0 z-50">
        <div className="mx-auto max-w-6xl px-5 sm:px-6 h-16 flex items-center justify-between">
          <Link href={ruta()} aria-label={`${local.nombre} — inicio`}>
            <Logo size={34} priority />
          </Link>

          <nav className="hidden md:flex items-center gap-8 text-sm font-medium text-zinc-300">
            <Link href="#servicios" className="hover:text-white transition-colors">
              Servicios
            </Link>
            <Link href={ruta("/tienda")} className="hover:text-white transition-colors">
              Tienda
            </Link>
            {barberos.length > 0 && (
              <Link href="#equipo" className="hover:text-white transition-colors">
                {conMayuscula(palabras.profesionales)}
              </Link>
            )}
            <Link href="#ubicacion" className="hover:text-white transition-colors">
              Ubicación
            </Link>
          </nav>

          <div className="flex items-center gap-3">
            {panelLink ? (
              <Link
                href={panelLink}
                className="bg-white hover:bg-zinc-200 text-zinc-950 text-sm font-bold px-4 py-2 rounded-lg transition-colors"
              >
                {panelLabel}
              </Link>
            ) : (
              <>
                <Link
                  href={`/login?local=${local.slug}`}
                  className="hidden sm:inline text-sm font-semibold text-zinc-300 hover:text-white transition-colors"
                >
                  Ingresar
                </Link>
                <Link
                  href={ruta("/reservar")}
                  className="bg-amber-400 hover:bg-amber-300 text-zinc-950 text-sm font-bold px-4 py-2 rounded-lg transition-colors"
                >
                  Reservar
                </Link>
              </>
            )}

            <MobileMenu
              panelLink={panelLink}
              panelLabel={permisos?.editaCatalogo ? "Ir al panel" : "Mi cuenta"}
            />
          </div>
        </div>
      </header>

      <main className="flex-1 flex flex-col items-center">
        {/* ── Hero ─────────────────────────────────────────────── */}
        <section className="w-full relative min-h-[88vh] flex items-center justify-center texture-grain overflow-hidden">
          {/* Fondo compuesto: vetas de madera + bastón de barbero muy tenue.
              Es CSS puro a propósito — la demo no depende de ninguna foto. */}
          <div className="absolute inset-0 bg-wood-texture">
            <div className="absolute inset-0 bg-barber-pole" />
            <div className="absolute inset-0 bg-hero-glow" />
            <div className="absolute inset-0 bg-gradient-to-b from-zinc-950/70 via-zinc-950/60 to-zinc-950" />
          </div>

          <div className="relative z-10 w-full max-w-3xl mx-auto px-6 py-24 text-center flex flex-col items-center gap-7">
            <Logo size={88} priority className="drop-shadow-2xl" />

            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-amber-400/30 bg-amber-400/5 text-xs text-amber-200 font-medium tracking-wide">
              <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
              {[palabras.negocio, local.ciudad].filter(Boolean).join(" · ")}
            </div>

            <h1 className="font-display text-4xl sm:text-6xl md:text-7xl text-white leading-[0.95] tracking-tight">
              {lemaPartes ? (
                <>
                  {lemaPartes[0]}
                  <span className="text-wood-gradient">{lemaPartes[1]}</span>
                  {lemaPartes[2]}
                </>
              ) : (
                lema
              )}
            </h1>

            <p className="text-zinc-300 text-base sm:text-lg max-w-xl leading-relaxed">
              {local.descripcion ? `${local.descripcion} ` : ""}Reservá tu turno online en un minuto.
            </p>

            <div className="flex flex-col sm:flex-row items-center gap-3 w-full sm:w-auto">
              <Link
                href={ruta("/reservar")}
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-xl bg-amber-400 hover:bg-amber-300 px-8 py-4 text-base font-bold text-zinc-950 transition-all hover:scale-[1.03] shadow-lg shadow-amber-950/30"
              >
                Reservar turno
              </Link>
              <Link
                href={ruta("/tienda")}
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-xl border border-white/15 bg-white/5 hover:bg-white/10 px-8 py-4 text-base font-semibold text-white transition-all"
              >
                Ver tienda
              </Link>
            </div>
          </div>

          <div className="absolute bottom-6 left-1/2 -translate-x-1/2 text-zinc-500 text-xs tracking-widest uppercase animate-pulse">
            Scrolleá
          </div>
        </section>

        {/* ── Franja de confianza ──────────────────────────────────
            Números INVENTADOS de la demo: solo en Roble (ver arriba). */}
        {esDemoDeRoble && (
        <section className="w-full border-y border-white/5 bg-wood-texture">
          <div className="mx-auto max-w-6xl px-6 py-8 grid grid-cols-2 md:grid-cols-4 gap-6 text-center">
            {[
              { value: "+10", label: "Años de oficio" },
              { value: "+2.000", label: "Cortes al año" },
              { value: "4.9★", label: "Reseñas Google" },
              { value: "100%", label: "Turnos online" },
            ].map((s) => (
              <div key={s.label}>
                <p className="font-display text-2xl sm:text-3xl text-amber-400">
                  {s.value}
                </p>
                <p className="text-zinc-400 text-xs sm:text-sm mt-1">
                  {s.label}
                </p>
              </div>
            ))}
          </div>
        </section>
        )}

        {/* ── Servicios (los de la base, con su precio) ────────── */}
        {servicios.length > 0 && (
        <section
          id="servicios"
          className="w-full max-w-6xl px-6 py-20 scroll-mt-20"
        >
          <div className="text-center mb-12">
            <p className="text-amber-400 text-xs font-semibold tracking-[0.2em] uppercase mb-3">
              Servicios
            </p>
            <h2 className="font-display text-3xl sm:text-4xl text-white">
              Lo que hacemos
            </h2>
          </div>
          <div className="grid md:grid-cols-3 gap-5">
            {servicios.map((s) => (
              <div
                key={s.id}
                className="relative rounded-2xl p-6 flex flex-col justify-between transition-all duration-300 bg-zinc-900/40 border border-white/5 hover:border-amber-400/30"
              >
                <div>
                  <h3 className="text-lg font-bold text-white">{s.nombre}</h3>
                  {s.descripcion && (
                    <p className="text-zinc-400 text-sm mt-2 leading-relaxed">
                      {s.descripcion}
                    </p>
                  )}
                </div>
                <div className="mt-6 pt-4 border-t border-white/5 flex justify-between items-center">
                  <span className="text-xs text-zinc-500">{s.duracion_minutos} min</span>
                  <span className="font-display text-xl text-amber-400">
                    {formatPrecio(s.precio)}
                  </span>
                </div>
              </div>
            ))}
          </div>
          <div className="text-center mt-10">
            <Link
              href={ruta("/reservar")}
              className="inline-flex items-center gap-2 text-sm font-semibold text-amber-400 hover:text-amber-300 transition-colors"
            >
              Ver todos los servicios y reservar →
            </Link>
          </div>
        </section>
        )}

        {/* ── El equipo (barberos, manicuras... según el rubro) ─── */}
        {barberos.length > 0 && (
        <section
          id="equipo"
          className="w-full bg-wood-texture border-y border-white/5 scroll-mt-20"
        >
          <div className="mx-auto max-w-6xl px-6 py-20">
            <div className="text-center mb-12">
              <p className="text-amber-400 text-xs font-semibold tracking-[0.2em] uppercase mb-3">
                El equipo
              </p>
              <h2 className="font-display text-3xl sm:text-4xl text-white">
                Quiénes te atienden
              </h2>
            </div>
            <div className="grid sm:grid-cols-2 gap-5 max-w-3xl mx-auto">
              {barberos.map((b) => (
                <div
                  key={b.nombre}
                  className="rounded-2xl bg-zinc-900/50 border border-white/5 p-6 flex items-center gap-5"
                >
                  <div className="shrink-0 h-16 w-16 rounded-full bg-amber-400/10 border border-amber-400/30 flex items-center justify-center font-display text-2xl text-amber-400">
                    {b.nombre[0]}
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-white">{b.nombre}</h3>
                    <p className="text-amber-400/80 text-xs font-medium">
                      {b.rol}
                    </p>
                    <p className="text-zinc-400 text-sm mt-1.5 leading-relaxed">
                      {b.bio}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>
        )}

        {/* ── Cómo funciona ────────────────────────────────────── */}
        <section className="w-full max-w-6xl px-6 py-20">
          <div className="text-center mb-12">
            <p className="text-amber-400 text-xs font-semibold tracking-[0.2em] uppercase mb-3">
              Reservar es fácil
            </p>
            <h2 className="font-display text-3xl sm:text-4xl text-white">
              En 3 pasos
            </h2>
          </div>
          <div className="grid md:grid-cols-3 gap-8">
            {[
              {
                num: "01",
                title: `Elegí servicio y ${palabras.profesional}`,
                desc: "Mirá los servicios, precios y duración. Elegí con quién atenderte.",
              },
              {
                num: "02",
                title: "Elegí día y hora",
                desc: "Ves la disponibilidad real y reservás en el horario que te queda cómodo.",
              },
              {
                num: "03",
                title: "Confirmá con la seña",
                // Sin "te llega el recordatorio": todavía no hay recordatorios
                // automáticos (están en el mapa del producto, antes de vender).
                desc: `Dejás el ${local.senaPorcentaje}% de seña y tu turno queda confirmado.`,
              },
            ].map((p) => (
              <div key={p.num} className="text-center">
                <div className="font-display text-4xl text-amber-400/40 mb-3">
                  {p.num}
                </div>
                <h3 className="text-lg font-bold text-white mb-2">{p.title}</h3>
                <p className="text-zinc-400 text-sm leading-relaxed max-w-xs mx-auto">
                  {p.desc}
                </p>
              </div>
            ))}
          </div>
        </section>

        {/* ── Reseñas (las visibles de la base) ─────────────────── */}
        {resenas.length > 0 && (
        <section className="w-full bg-wood-texture border-y border-white/5">
          <div className="mx-auto max-w-6xl px-6 py-20">
            <div className="text-center mb-12">
              <p className="text-amber-400 text-xs font-semibold tracking-[0.2em] uppercase mb-3">
                Clientes
              </p>
              <h2 className="font-display text-3xl sm:text-4xl text-white">
                Lo que dicen de nosotros
              </h2>
            </div>
            <div className="grid md:grid-cols-3 gap-5">
              {resenas.map((r, i) => (
                <figure
                  key={i}
                  className="rounded-2xl bg-zinc-900/50 border border-white/5 p-6 flex flex-col gap-4"
                >
                  <div className="text-amber-400 text-sm tracking-widest">
                    {"★".repeat(r.rating)}
                  </div>
                  <blockquote className="text-zinc-300 text-sm leading-relaxed flex-1">
                    “{r.texto}”
                  </blockquote>
                  <figcaption className="text-white text-sm font-semibold">
                    {r.autor}
                  </figcaption>
                </figure>
              ))}
            </div>
          </div>
        </section>
        )}

        {/* ── Nuestro espacio ──────────────────────────────────
            Texto INVENTADO de la demo: solo en Roble (ver arriba).
            Sin fotos a propósito: la demo no muestra ningún local real. */}
        {esDemoDeRoble && (
        <section className="w-full max-w-6xl px-6 py-20">
          <div className="text-center mb-12">
            <p className="text-amber-400 text-xs font-semibold tracking-[0.2em] uppercase mb-3">
              El local
            </p>
            <h2 className="font-display text-3xl sm:text-4xl text-white">
              Nuestro espacio
            </h2>
            <p className="text-zinc-400 mt-4 max-w-xl mx-auto leading-relaxed">
              Cuatro sillones, música a buen volumen y el tiempo que hace falta
              para cada cliente. Nadie sale apurado de acá.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {[
              {
                titulo: "Toalla caliente",
                texto: "El ritual completo antes de la navaja. No se saltea nunca.",
                // Vapor subiendo
                d: "M8 21c0-2 1.5-2.5 1.5-4.5S8 13 8 11M12 21c0-2 1.5-2.5 1.5-4.5S12 13 12 11M16 21c0-2 1.5-2.5 1.5-4.5S16 13 16 11M4 7h16",
              },
              {
                titulo: "Turno respetado",
                texto: "Si reservaste a las 16, entrás a las 16. Sin sala de espera eterna.",
                // Reloj
                d: "M12 21a9 9 0 100-18 9 9 0 000 18zM12 7v5l3.5 2",
              },
              {
                titulo: "Café de la casa",
                texto: "Mientras esperás tu turno, o mientras te atienden. Va incluido.",
                // Taza
                d: "M4 9h12v6a4 4 0 01-4 4H8a4 4 0 01-4-4V9zM16 11h2a2 2 0 010 4h-2M7 5V3M11 5V3",
              },
              {
                titulo: "Producto de línea",
                texto: "Trabajamos con pomadas y ceras que después podés comprar acá.",
                // Pote de pomada
                d: "M5 9h14v9a2 2 0 01-2 2H7a2 2 0 01-2-2V9zM6 9V7a2 2 0 012-2h8a2 2 0 012 2v2M10 14h4",
              },
              {
                titulo: "Tijera y navaja",
                texto: "Corte a tijera donde hace falta. Máquina donde conviene.",
                // Tijera
                d: "M6.5 8a2.5 2.5 0 100-5 2.5 2.5 0 000 5zM6.5 21a2.5 2.5 0 100-5 2.5 2.5 0 000 5zM8.6 9.6L19 20M19 4L8.6 14.4",
              },
              {
                titulo: "Reserva online",
                texto: "Elegís barbero, día y hora desde el celular. Un minuto.",
                // Celular
                d: "M7 2h10a1 1 0 011 1v18a1 1 0 01-1 1H7a1 1 0 01-1-1V3a1 1 0 011-1zM11 18h2",
              },
            ].map((item) => (
              <div
                key={item.titulo}
                className="group rounded-2xl border border-white/8 bg-white/[0.02] p-6 transition-colors hover:border-amber-400/25 hover:bg-white/[0.04]"
              >
                <div className="mb-4 h-10 w-10 rounded-lg border border-amber-400/25 bg-amber-400/5 flex items-center justify-center">
                  <svg
                    viewBox="0 0 24 24"
                    aria-hidden="true"
                    className="h-5 w-5 stroke-amber-400"
                    fill="none"
                    strokeWidth="1.6"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d={item.d} />
                  </svg>
                </div>
                <h3 className="font-display text-lg text-white mb-2">
                  {item.titulo}
                </h3>
                <p className="text-sm text-zinc-400 leading-relaxed">
                  {item.texto}
                </p>
              </div>
            ))}
          </div>
        </section>
        )}

        {/* ── Ubicación + horarios ─────────────────────────────── */}
        <section
          id="ubicacion"
          className="w-full bg-wood-texture border-t border-white/5 scroll-mt-20"
        >
          <div className={`mx-auto max-w-6xl px-6 py-20 grid gap-10 items-start ${local.mapaQuery ? "md:grid-cols-2" : ""}`}>
            <div>
              <p className="text-amber-400 text-xs font-semibold tracking-[0.2em] uppercase mb-3">
                Visitanos
              </p>
              <h2 className="font-display text-3xl sm:text-4xl text-white mb-6">
                Dónde estamos
              </h2>
              <div className="space-y-4 text-sm">
                {(local.direccion || local.ciudad) && (
                  <p className="text-zinc-300">
                    <span className="text-zinc-500 block text-xs uppercase tracking-wide mb-0.5">
                      Dirección
                    </span>
                    {[local.direccion, local.ciudad].filter(Boolean).join(" — ")}
                  </p>
                )}
                <div className="text-zinc-300">
                  <span className="text-zinc-500 block text-xs uppercase tracking-wide mb-1">
                    Horarios
                  </span>
                  {horarios.length === 0 && (
                    <p className="text-zinc-400 py-1.5">Consultanos por WhatsApp.</p>
                  )}
                  {horarios.map((h) => (
                    <div
                      key={h.dia}
                      className="flex justify-between max-w-xs border-b border-white/5 py-1.5"
                    >
                      <span>{h.dia}</span>
                      <span className="text-zinc-400">{h.horas}</span>
                    </div>
                  ))}
                </div>
                {local.mediosPago.length > 0 && (
                  <p className="text-zinc-300">
                    <span className="text-zinc-500 block text-xs uppercase tracking-wide mb-0.5">
                      Medios de pago
                    </span>
                    {local.mediosPago.join(" · ")}
                  </p>
                )}
              </div>
              {(local.whatsapp || local.instagram) && (
              <div className="flex flex-wrap gap-3 mt-7">
                {local.whatsapp && (
                <a
                  href={whatsappLink(local)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center justify-center gap-2 rounded-xl bg-amber-400 hover:bg-amber-300 px-6 py-3 text-sm font-bold text-zinc-950 transition-colors"
                >
                  Escribinos
                </a>
                )}
                {local.instagram && (
                  <a
                    href={local.instagramUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center justify-center gap-2 rounded-xl border border-white/15 bg-white/5 hover:bg-white/10 px-6 py-3 text-sm font-semibold text-white transition-colors"
                  >
                    @{local.instagram}
                  </a>
                )}
              </div>
              )}
            </div>
            {local.mapaQuery && (
            <div className="relative aspect-[4/3] rounded-2xl overflow-hidden border border-white/10">
              <iframe
                title={`Ubicación de ${local.nombre}`}
                src={`https://www.google.com/maps?q=${encodeURIComponent(
                  local.mapaQuery,
                )}&output=embed`}
                className="absolute inset-0 w-full h-full grayscale"
                loading="lazy"
                referrerPolicy="no-referrer-when-downgrade"
              />
            </div>
            )}
          </div>
        </section>
      </main>

      {/* ── Footer ───────────────────────────────────────────── */}
      <footer className="border-t border-white/5 px-6 py-14 bg-zinc-950">
        <div className="max-w-6xl mx-auto grid sm:grid-cols-3 gap-10">
          <div>
            <Logo size={36} className="mb-4" />
            <p className="text-zinc-500 text-sm leading-relaxed max-w-xs">
              {local.descripcion}
            </p>
          </div>
          {(local.direccion || local.whatsapp || local.email || local.instagram || local.tiktok) && (
          <div className="text-sm">
            <p className="text-white font-semibold mb-3">Contacto</p>
            <div className="space-y-2 text-zinc-400">
              {local.direccion && <p>{local.direccion}</p>}
              {local.whatsapp && (
                <a
                  href={whatsappLink(local)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block hover:text-white transition-colors"
                >
                  WhatsApp {local.whatsappMostrar}
                </a>
              )}
              {local.email && <p>{local.email}</p>}
              {local.instagram && (
                <a
                  href={local.instagramUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block hover:text-white transition-colors"
                >
                  Instagram @{local.instagram}
                </a>
              )}
              {local.tiktok && (
                <a
                  href={local.tiktokUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block hover:text-white transition-colors"
                >
                  TikTok @{local.tiktok}
                </a>
              )}
            </div>
          </div>
          )}
          <div className="text-sm">
            <p className="text-white font-semibold mb-3">Accesos</p>
            <div className="space-y-2 text-zinc-400">
              <Link
                href={ruta("/reservar")}
                className="block hover:text-white transition-colors"
              >
                Reservar turno
              </Link>
              <Link
                href={ruta("/tienda")}
                className="block hover:text-white transition-colors"
              >
                Tienda
              </Link>
              <Link
                href={`/login?local=${local.slug}`}
                className="block hover:text-white transition-colors"
              >
                Ingresar
              </Link>
            </div>
          </div>
        </div>
        <div className="max-w-6xl mx-auto text-center text-xs text-zinc-600 pt-8 mt-10 border-t border-white/5">
          <p>
            &copy; {new Date().getFullYear()} {local.nombre}. Todos los derechos
            reservados.
          </p>
        </div>
      </footer>

      <WhatsappFloat />
    </div>
  );
}
