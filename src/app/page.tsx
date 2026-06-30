import React from "react";
import Link from "next/link";
import Image from "next/image";
import { getProfile } from "@/lib/auth";
import { Logo } from "@/components/ui/Logo";
import { WhatsappFloat } from "@/components/ui/WhatsappFloat";
import { SITE, whatsappLink } from "@/lib/site";

export default async function HomePage() {
  const profile = await getProfile();

  const panelLink = profile
    ? profile.role === "admin"
      ? "/admin/dashboard"
      : "/dashboard"
    : null;

  const serviciosDestacados = [
    {
      nombre: "Corte de Autor",
      descripcion:
        "Asesoramiento de imagen, lavado premium, corte a tijera y máquina, y peinado con producto de alta gama.",
      precio: "$4.500",
      duracion: "45 min",
    },
    {
      nombre: "Corte & Barba Premium",
      descripcion:
        "El servicio completo. Corte + diseño de barba con ritual de toalla caliente y navaja.",
      precio: "$7.500",
      duracion: "75 min",
      destacado: true,
    },
    {
      nombre: "Perfilado & Afeitado",
      descripcion:
        "Recorte minucioso de barba con toalla caliente, aceites esenciales y afeitado tradicional a navaja.",
      precio: "$3.500",
      duracion: "30 min",
    },
  ];

  const barberos = [
    {
      nombre: "Leandro",
      rol: "Master Barber · Fundador",
      bio: "Más de una década detrás de la silla. Especialista en cortes clásicos y diseño de barba.",
    },
    {
      nombre: "Facundo",
      rol: "Barber · Sábados",
      bio: "Fades, texturizados y tendencias modernas. Atiende los sábados con turnos limitados.",
    },
  ];

  const resenas = [
    {
      texto:
        "El mejor corte que me hice en años. Te tratan como en casa y el resultado es impecable.",
      autor: "Martín G.",
    },
    {
      texto:
        "Ambiente increíble, puntualidad y un trabajo de barba que no encontrás en otro lado.",
      autor: "Joaquín R.",
    },
    {
      texto:
        "Reservé el turno online en un minuto. Profesionales de verdad, ya soy cliente fijo.",
      autor: "Diego M.",
    },
  ];

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 flex flex-col font-sans">
      {/* ── Header ─────────────────────────────────────────────── */}
      <header className="border-b border-white/5 bg-zinc-950/70 backdrop-blur-md sticky top-0 z-50">
        <div className="mx-auto max-w-6xl px-5 sm:px-6 h-16 flex items-center justify-between">
          <Link href="/" aria-label="Fino's Barber's — inicio">
            <Logo size={34} priority />
          </Link>

          <nav className="hidden md:flex items-center gap-8 text-sm font-medium text-zinc-300">
            <Link href="#servicios" className="hover:text-white transition-colors">
              Servicios
            </Link>
            <Link href="/tienda" className="hover:text-white transition-colors">
              Tienda
            </Link>
            <Link href="#barberos" className="hover:text-white transition-colors">
              Barberos
            </Link>
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
                {profile?.role === "admin" ? "Panel" : "Mi cuenta"}
              </Link>
            ) : (
              <>
                <Link
                  href="/login"
                  className="hidden sm:inline text-sm font-semibold text-zinc-300 hover:text-white transition-colors"
                >
                  Ingresar
                </Link>
                <Link
                  href="/reservar"
                  className="bg-amber-400 hover:bg-amber-300 text-zinc-950 text-sm font-bold px-4 py-2 rounded-lg transition-colors"
                >
                  Reservar
                </Link>
              </>
            )}
          </div>
        </div>
      </header>

      <main className="flex-1 flex flex-col items-center">
        {/* ── Hero ─────────────────────────────────────────────── */}
        <section className="w-full relative min-h-[88vh] flex items-center justify-center texture-grain overflow-hidden">
          <div className="absolute inset-0">
            <Image
              src="/images/demo/interior-1.jpg"
              alt="Interior de Fino's Barber's"
              fill
              className="object-cover"
              priority
            />
            <div className="absolute inset-0 bg-gradient-to-b from-zinc-950/80 via-zinc-950/70 to-zinc-950" />
          </div>

          <div className="relative z-10 w-full max-w-3xl mx-auto px-6 py-24 text-center flex flex-col items-center gap-7">
            <Logo size={88} priority className="drop-shadow-2xl" />

            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-amber-400/30 bg-amber-400/5 text-xs text-amber-200 font-medium tracking-wide">
              <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
              Barbería premium · {SITE.ciudad}
            </div>

            <h1 className="font-display text-4xl sm:text-6xl md:text-7xl text-white leading-[0.95] tracking-tight">
              El oficio de la
              <br />
              <span className="text-wood-gradient">barbería</span>, bien hecho
            </h1>

            <p className="text-zinc-300 text-base sm:text-lg max-w-xl leading-relaxed">
              Cortes, barba y afeitado tradicional a navaja. Reservá tu turno
              online en un minuto.
            </p>

            <div className="flex flex-col sm:flex-row items-center gap-3 w-full sm:w-auto">
              <Link
                href="/reservar"
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-xl bg-amber-400 hover:bg-amber-300 px-8 py-4 text-base font-bold text-zinc-950 transition-all hover:scale-[1.03] shadow-lg shadow-amber-950/30"
              >
                Reservar turno
              </Link>
              <Link
                href="/tienda"
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

        {/* ── Franja de confianza ──────────────────────────────── */}
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

        {/* ── Servicios ────────────────────────────────────────── */}
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
            {serviciosDestacados.map((s, i) => (
              <div
                key={i}
                className={`relative rounded-2xl p-6 flex flex-col justify-between transition-all duration-300 ${
                  s.destacado
                    ? "bg-gradient-to-b from-amber-400/10 to-transparent border border-amber-400/40"
                    : "bg-zinc-900/40 border border-white/5 hover:border-amber-400/30"
                }`}
              >
                {s.destacado && (
                  <span className="absolute -top-3 left-1/2 -translate-x-1/2 bg-amber-400 text-zinc-950 text-[10px] font-bold px-3 py-1 rounded-full tracking-wide uppercase">
                    El más pedido
                  </span>
                )}
                <div>
                  <h3 className="text-lg font-bold text-white">{s.nombre}</h3>
                  <p className="text-zinc-400 text-sm mt-2 leading-relaxed">
                    {s.descripcion}
                  </p>
                </div>
                <div className="mt-6 pt-4 border-t border-white/5 flex justify-between items-center">
                  <span className="text-xs text-zinc-500">{s.duracion}</span>
                  <span className="font-display text-xl text-amber-400">
                    {s.precio}
                  </span>
                </div>
              </div>
            ))}
          </div>
          <div className="text-center mt-10">
            <Link
              href="/reservar"
              className="inline-flex items-center gap-2 text-sm font-semibold text-amber-400 hover:text-amber-300 transition-colors"
            >
              Ver todos los servicios y reservar →
            </Link>
          </div>
        </section>

        {/* ── Barberos ─────────────────────────────────────────── */}
        <section
          id="barberos"
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
                title: "Elegí servicio y barbero",
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
                desc: `Dejás el ${SITE.senaPorcentaje}% de seña y tu turno queda confirmado. Te llega el recordatorio.`,
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

        {/* ── Reseñas ──────────────────────────────────────────── */}
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
                    ★★★★★
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

        {/* ── Nuestro espacio ──────────────────────────────────── */}
        <section className="w-full max-w-6xl px-6 py-20">
          <div className="text-center mb-12">
            <p className="text-amber-400 text-xs font-semibold tracking-[0.2em] uppercase mb-3">
              El local
            </p>
            <h2 className="font-display text-3xl sm:text-4xl text-white">
              Nuestro espacio
            </h2>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3 sm:gap-4">
            {[
              "interior-2.jpg",
              "interior-3.jpg",
              "interior-4.jpg",
              "interior-5.jpg",
              "interior-1.jpg",
            ].map((img, i) => (
              <div
                key={img}
                className={`relative aspect-square rounded-2xl overflow-hidden border border-white/5 ${
                  i === 0 ? "col-span-2 row-span-2 aspect-auto" : ""
                }`}
              >
                <Image
                  src={`/images/demo/${img}`}
                  alt="Fino's Barber's"
                  fill
                  className="object-cover hover:scale-105 transition-transform duration-500"
                />
              </div>
            ))}
          </div>
        </section>

        {/* ── Ubicación + horarios ─────────────────────────────── */}
        <section
          id="ubicacion"
          className="w-full bg-wood-texture border-t border-white/5 scroll-mt-20"
        >
          <div className="mx-auto max-w-6xl px-6 py-20 grid md:grid-cols-2 gap-10 items-start">
            <div>
              <p className="text-amber-400 text-xs font-semibold tracking-[0.2em] uppercase mb-3">
                Visitanos
              </p>
              <h2 className="font-display text-3xl sm:text-4xl text-white mb-6">
                Dónde estamos
              </h2>
              <div className="space-y-4 text-sm">
                <p className="text-zinc-300">
                  <span className="text-zinc-500 block text-xs uppercase tracking-wide mb-0.5">
                    Dirección
                  </span>
                  {SITE.direccion} — {SITE.ciudad}
                </p>
                <div className="text-zinc-300">
                  <span className="text-zinc-500 block text-xs uppercase tracking-wide mb-1">
                    Horarios
                  </span>
                  {SITE.horarios.map((h) => (
                    <div
                      key={h.dia}
                      className="flex justify-between max-w-xs border-b border-white/5 py-1.5"
                    >
                      <span>{h.dia}</span>
                      <span className="text-zinc-400">{h.horas}</span>
                    </div>
                  ))}
                </div>
                <p className="text-zinc-300">
                  <span className="text-zinc-500 block text-xs uppercase tracking-wide mb-0.5">
                    Medios de pago
                  </span>
                  {SITE.mediosPago.join(" · ")}
                </p>
              </div>
              <div className="flex gap-3 mt-7">
                <a
                  href={whatsappLink()}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center justify-center gap-2 rounded-xl bg-amber-400 hover:bg-amber-300 px-6 py-3 text-sm font-bold text-zinc-950 transition-colors"
                >
                  Escribinos
                </a>
                <a
                  href={SITE.instagramUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center justify-center gap-2 rounded-xl border border-white/15 bg-white/5 hover:bg-white/10 px-6 py-3 text-sm font-semibold text-white transition-colors"
                >
                  @{SITE.instagram}
                </a>
              </div>
            </div>
            <div className="relative aspect-[4/3] rounded-2xl overflow-hidden border border-white/10">
              <iframe
                title="Ubicación de Fino's Barber's"
                src={`https://www.google.com/maps?q=${encodeURIComponent(
                  SITE.direccion + ", " + SITE.ciudad,
                )}&output=embed`}
                className="absolute inset-0 w-full h-full grayscale"
                loading="lazy"
                referrerPolicy="no-referrer-when-downgrade"
              />
            </div>
          </div>
        </section>
      </main>

      {/* ── Footer ───────────────────────────────────────────── */}
      <footer className="border-t border-white/5 px-6 py-14 bg-zinc-950">
        <div className="max-w-6xl mx-auto grid sm:grid-cols-3 gap-10">
          <div>
            <Logo size={36} className="mb-4" />
            <p className="text-zinc-500 text-sm leading-relaxed max-w-xs">
              {SITE.descripcion}
            </p>
          </div>
          <div className="text-sm">
            <p className="text-white font-semibold mb-3">Contacto</p>
            <div className="space-y-2 text-zinc-400">
              <p>{SITE.direccion}</p>
              <p>{SITE.email}</p>
              <a
                href={SITE.instagramUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="block hover:text-white transition-colors"
              >
                Instagram @{SITE.instagram}
              </a>
              <a
                href={SITE.tiktokUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="block hover:text-white transition-colors"
              >
                TikTok @{SITE.tiktok}
              </a>
            </div>
          </div>
          <div className="text-sm">
            <p className="text-white font-semibold mb-3">Accesos</p>
            <div className="space-y-2 text-zinc-400">
              <Link
                href="/reservar"
                className="block hover:text-white transition-colors"
              >
                Reservar turno
              </Link>
              <Link
                href="/tienda"
                className="block hover:text-white transition-colors"
              >
                Tienda
              </Link>
              <Link
                href="/login"
                className="block hover:text-white transition-colors"
              >
                Ingresar
              </Link>
            </div>
          </div>
        </div>
        <div className="max-w-6xl mx-auto text-center text-xs text-zinc-600 pt-8 mt-10 border-t border-white/5">
          <p>
            &copy; {new Date().getFullYear()} {SITE.nombre}. Todos los derechos
            reservados.
          </p>
        </div>
      </footer>

      <WhatsappFloat />
    </div>
  );
}
