import React from "react";
import Link from "next/link";
import Image from "next/image";
import { getProfile } from "@/lib/auth";
import { WhatsAppFab } from "@/components/ui/WhatsAppFab";

export default async function HomePage() {
  const profile = await getProfile();

  let ctaLink = "/login";
  let ctaText = "Reservar turno";

  if (profile) {
    if (profile.role === "admin") {
      ctaLink = "/admin/dashboard";
      ctaText = "Panel de administración";
    } else {
      ctaLink = "/dashboard";
      ctaText = "Mi dashboard";
    }
  }

  const serviciosDestacados = [
    {
      nombre: "Corte de Autor",
      descripcion:
        "Asesoramiento de imagen, lavado premium, corte a tijera/máquina y peinado con cera de alta gama.",
      precio: "$4.500",
      duracion: "45 min",
    },
    {
      nombre: "Corte & Barba Premium",
      descripcion:
        "El servicio completo. Corte de cabello + diseño de barba con ritual de toalla caliente y navaja.",
      precio: "$7.500",
      duracion: "75 min",
    },
    {
      nombre: "Perfilado de Barba",
      descripcion:
        "Recorte minucioso de barba con toalla caliente, aceites esenciales para la piel y afeitado tradicional.",
      precio: "$3.500",
      duracion: "30 min",
    },
  ];

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 flex flex-col">
      {/* ─── Header ─────────────────────────────────────── */}
      <header className="border-b border-zinc-800/60 bg-zinc-950/80 backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-6xl mx-auto px-5 sm:px-6 h-16 flex justify-between items-center">
          <Link href="/" className="flex items-center">
            <Image
              src="/images/logo.png"
              alt="Finos Barbers"
              width={104}
              height={38}
              className="invert"
              priority
            />
          </Link>
          <div className="flex items-center gap-3 sm:gap-5">
            {profile ? (
              <>
                <span className="text-sm text-zinc-400 hidden sm:inline">
                  Hola,{" "}
                  <span className="text-white font-semibold">
                    {profile.nombre}
                  </span>
                </span>
                <Link
                  href={ctaLink}
                  className="bg-amber-500 hover:bg-amber-400 text-zinc-950 text-sm font-bold px-4 py-2 rounded-lg transition-colors shadow-lg shadow-amber-500/20"
                >
                  {ctaText}
                </Link>
              </>
            ) : (
              <>
                <Link
                  href="/login"
                  className="text-sm font-semibold text-zinc-300 hover:text-white transition-colors"
                >
                  Ingresar
                </Link>
                <Link
                  href="/register"
                  className="bg-amber-500 hover:bg-amber-400 text-zinc-950 text-sm font-bold px-4 py-2 rounded-lg transition-colors shadow-lg shadow-amber-500/20"
                >
                  Registrarse
                </Link>
              </>
            )}
          </div>
        </div>
      </header>

      <main className="flex-1 flex flex-col items-center">
        {/* ─── Hero ──────────────────────────────────────── */}
        <section className="w-full relative overflow-hidden">
          {/* Fondo robusto: degrada con elegancia aunque la foto no cargue */}
          <div className="absolute inset-0 bg-gradient-to-b from-zinc-900 via-zinc-950 to-zinc-950" />
          <div
            className="absolute inset-0 opacity-[0.07]"
            style={{
              backgroundImage:
                "repeating-linear-gradient(135deg, #f59e0b 0px, #f59e0b 2px, transparent 2px, transparent 14px)",
            }}
          />
          <div className="absolute inset-0">
            <Image
              src="/images/local/IMG-20250618-WA0009.jpg"
              alt=""
              fill
              className="object-cover opacity-40"
              priority
            />
            <div className="absolute inset-0 bg-gradient-to-t from-zinc-950 via-zinc-950/80 to-zinc-950/60" />
          </div>
          <div className="absolute -top-40 left-1/2 -translate-x-1/2 w-[700px] h-[400px] bg-amber-500/15 blur-[120px] rounded-full pointer-events-none" />

          <div className="relative z-10 w-full max-w-5xl mx-auto px-5 sm:px-6 py-24 sm:py-32 flex flex-col items-center text-center gap-7">
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-amber-500/10 border border-amber-500/30 text-xs font-semibold uppercase tracking-[0.2em] text-amber-400">
              <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />
              Barber Studio · Est. 2020
            </div>

            <h1 className="font-display uppercase text-6xl sm:text-7xl md:text-8xl font-extrabold leading-[0.9] tracking-tight text-white max-w-4xl">
              El arte de lucir
              <br />
              <span className="text-amber-500">impecable</span>
            </h1>

            <p className="text-zinc-300 text-base sm:text-lg max-w-xl leading-relaxed">
              Técnicas tradicionales de navaja combinadas con los cortes
              modernos de mayor tendencia. Una experiencia, no un trámite.
            </p>

            <div className="flex flex-col sm:flex-row items-center gap-3 mt-2 w-full sm:w-auto">
              <Link
                href={ctaLink}
                className="group w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-xl bg-amber-500 hover:bg-amber-400 px-8 py-4 text-base font-bold text-zinc-950 transition-all hover:scale-[1.03] active:scale-95 shadow-xl shadow-amber-500/25"
              >
                {ctaText}
                <svg className="w-5 h-5 transition-transform group-hover:translate-x-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M9 5l7 7-7 7" />
                </svg>
              </Link>
              <a
                href="#servicios"
                className="w-full sm:w-auto inline-flex items-center justify-center rounded-xl border border-zinc-700 hover:border-zinc-500 bg-zinc-900/50 px-8 py-4 text-base font-semibold text-zinc-200 transition-colors"
              >
                Ver servicios
              </a>
            </div>
          </div>
        </section>

        {/* ─── Servicios ─────────────────────────────────── */}
        <section id="servicios" className="w-full max-w-6xl px-5 sm:px-6 py-20 scroll-mt-16">
          <SectionHeading eyebrow="01 — Carta" title="Nuestros servicios" subtitle="Atención personalizada con los más altos estándares." />
          <div className="grid md:grid-cols-3 gap-5 stagger">
            {serviciosDestacados.map((s) => (
              <div
                key={s.nombre}
                className="group relative bg-zinc-900/40 border border-zinc-800 rounded-2xl p-7 flex flex-col justify-between hover:border-amber-500/40 hover:bg-zinc-900/70 transition-all duration-300 animate-fade-in"
              >
                <div className="absolute top-0 left-7 right-7 h-px bg-gradient-to-r from-transparent via-amber-500/0 to-transparent group-hover:via-amber-500/50 transition-all duration-500" />
                <div>
                  <h3 className="font-display uppercase text-2xl font-bold text-white tracking-wide">{s.nombre}</h3>
                  <p className="text-zinc-400 text-sm mt-3 leading-relaxed">
                    {s.descripcion}
                  </p>
                </div>
                <div className="mt-7 pt-5 border-t border-zinc-800 flex justify-between items-center">
                  <span className="text-xs uppercase tracking-wider text-zinc-500">{s.duracion}</span>
                  <span className="font-display text-2xl font-bold text-amber-500">
                    {s.precio}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* ─── Cómo funciona ─────────────────────────────── */}
        <section className="w-full bg-zinc-900/30 border-y border-zinc-800/60">
          <div className="max-w-6xl mx-auto px-5 sm:px-6 py-20">
            <SectionHeading eyebrow="02 — Proceso" title="Cómo funciona" subtitle="Reservá tu turno en 3 simples pasos." />
            <div className="grid md:grid-cols-3 gap-8 md:gap-6 stagger">
              {[
                { num: "01", title: "Elegí tu servicio", desc: "Seleccioná entre nuestros cortes premium y servicios de barba." },
                { num: "02", title: "Elegí tu barbero", desc: "Conocé a nuestros expertos y elegí tu preferido." },
                { num: "03", title: "Confirmá tu turno", desc: "Elegí fecha y hora disponible, y listo." },
              ].map((p) => (
                <div key={p.num} className="relative text-center md:text-left animate-fade-in">
                  <span className="font-display text-7xl font-extrabold text-zinc-800 leading-none select-none">
                    {p.num}
                  </span>
                  <h3 className="font-display uppercase text-xl font-bold text-white mt-3 tracking-wide">{p.title}</h3>
                  <p className="text-zinc-400 text-sm mt-2 leading-relaxed max-w-xs mx-auto md:mx-0">{p.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ─── Stats ─────────────────────────────────────── */}
        <section className="w-full max-w-6xl px-5 sm:px-6 py-20">
          <div className="grid grid-cols-3 gap-4 divide-x divide-zinc-800">
            {[
              { value: "500+", label: "Clientes" },
              { value: "5", label: "Años" },
              { value: "4", label: "Barberos" },
            ].map((s) => (
              <div key={s.label} className="text-center px-2">
                <p className="font-display text-5xl sm:text-6xl font-extrabold text-amber-500">{s.value}</p>
                <p className="text-zinc-400 text-xs sm:text-sm mt-2 uppercase tracking-widest">{s.label}</p>
              </div>
            ))}
          </div>
        </section>

        {/* ─── Espacio ───────────────────────────────────── */}
        <section className="w-full max-w-6xl px-5 sm:px-6 pb-20">
          <SectionHeading eyebrow="03 — El local" title="Nuestro espacio" subtitle="Conocé el ambiente donde trabajamos tu estilo." />
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3 sm:gap-4">
            {[
              "/images/local/IMG-20250618-WA0008 - copia.jpg",
              "/images/local/IMG-20250618-WA0010.jpg",
              "/images/local/IMG-20250618-WA0012.jpg",
            ].map((src, i) => (
              <div
                key={src}
                className={`relative aspect-square rounded-2xl overflow-hidden border border-zinc-800 bg-gradient-to-br from-zinc-900 to-zinc-950 group ${i === 2 ? "col-span-2 md:col-span-1 aspect-video md:aspect-square" : ""}`}
              >
                <Image
                  src={src}
                  alt="Interior de Finos Barbers"
                  fill
                  className="object-cover opacity-90 group-hover:opacity-100 group-hover:scale-105 transition-all duration-500"
                />
                <div className="absolute inset-0 ring-1 ring-inset ring-white/5 rounded-2xl" />
              </div>
            ))}
          </div>
        </section>

        {/* ─── CTA final ─────────────────────────────────── */}
        <section className="w-full max-w-6xl px-5 sm:px-6 pb-24">
          <div className="relative overflow-hidden rounded-3xl border border-amber-500/20 bg-gradient-to-br from-zinc-900 to-zinc-950 px-6 sm:px-12 py-14 text-center">
            <div className="absolute -bottom-20 left-1/2 -translate-x-1/2 w-[500px] h-[300px] bg-amber-500/10 blur-[100px] rounded-full pointer-events-none" />
            <div className="relative z-10 flex flex-col items-center gap-5">
              <h2 className="font-display uppercase text-4xl sm:text-5xl font-extrabold text-white tracking-tight">
                Tu próximo corte te espera
              </h2>
              <p className="text-zinc-400 max-w-md">
                Reservá en menos de un minuto. Sin llamadas, sin esperas.
              </p>
              <Link
                href={ctaLink}
                className="group inline-flex items-center gap-2 rounded-xl bg-amber-500 hover:bg-amber-400 px-8 py-4 text-base font-bold text-zinc-950 transition-all hover:scale-[1.03] active:scale-95 shadow-xl shadow-amber-500/25"
              >
                {ctaText}
                <svg className="w-5 h-5 transition-transform group-hover:translate-x-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M9 5l7 7-7 7" />
                </svg>
              </Link>
            </div>
          </div>
        </section>
      </main>

      {/* ─── Footer ──────────────────────────────────────── */}
      <footer className="border-t border-zinc-800/60 px-5 sm:px-6 py-12 bg-zinc-950">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row justify-between items-start gap-8">
          <div>
            <Image
              src="/images/logo.png"
              alt="Finos Barbers"
              width={94}
              height={34}
              className="invert mb-4"
            />
            <div className="space-y-1.5 text-sm text-zinc-400">
              <p>Ramón L. Falcón 4955</p>
              <p>finos_barbers@outlook.com</p>
              <a
                href="https://instagram.com/finos_barbers"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 hover:text-amber-400 transition-colors"
              >
                @finos_barbers
              </a>
            </div>
          </div>
          <div className="flex gap-6 text-sm">
            <Link href="/login" className="text-zinc-400 hover:text-white transition-colors">
              Ingresar
            </Link>
            <Link href="/register" className="text-zinc-400 hover:text-white transition-colors">
              Registrarse
            </Link>
          </div>
        </div>
        <div className="max-w-6xl mx-auto text-center text-xs text-zinc-600 pt-8 mt-8 border-t border-zinc-800/60">
          <p>
            &copy; {new Date().getFullYear()} Finos Barbers. Todos los derechos
            reservados.
          </p>
        </div>
      </footer>

      <WhatsAppFab />
    </div>
  );
}

function SectionHeading({ eyebrow, title, subtitle }: { eyebrow: string; title: string; subtitle: string }) {
  return (
    <div className="mb-12 text-center">
      <span className="text-xs font-semibold uppercase tracking-[0.25em] text-amber-500">{eyebrow}</span>
      <h2 className="font-display uppercase text-4xl sm:text-5xl font-extrabold text-white tracking-tight mt-2">
        {title}
      </h2>
      <p className="text-zinc-400 text-sm mt-3">{subtitle}</p>
    </div>
  );
}
