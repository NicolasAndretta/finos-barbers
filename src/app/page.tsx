import React from "react";
import Link from "next/link";
import Image from "next/image";
import { getProfile } from "@/lib/auth";

export default async function HomePage() {
  const profile = await getProfile();

  let ctaLink = "/login";
  let ctaText = "Reservar Turno";

  if (profile) {
    if (profile.role === "admin") {
      ctaLink = "/admin/dashboard";
      ctaText = "Panel de Administración";
    } else {
      ctaLink = "/dashboard";
      ctaText = "Mi Dashboard";
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
      nombre: "Perfilado de Barba & Afeitado",
      descripcion:
        "Recorte minucioso de barba con toalla caliente, aceites esenciales para la piel y afeitado tradicional.",
      precio: "$3.500",
      duracion: "30 min",
    },
  ];

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 flex flex-col font-sans">
      <header className="border-b border-zinc-900 bg-zinc-950/70 backdrop-blur-md sticky top-0 z-50 px-6 py-4 flex justify-between items-center">
        <Link href="/">
          <Image
            src="/images/logo.png"
            alt="Finos Barbers"
            width={100}
            height={36}
            className="invert"
            priority
          />
        </Link>
        <div className="flex items-center gap-4">
          {profile ? (
            <div className="flex items-center gap-3">
              <span className="text-xs text-zinc-400 hidden sm:inline">
                Hola,{" "}
                <span className="text-white font-semibold">
                  {profile.nombre}
                </span>
              </span>
              <Link
                href={ctaLink}
                className="bg-white hover:bg-zinc-200 text-zinc-950 text-xs font-bold px-4 py-2 rounded-lg transition-colors"
              >
                {ctaText}
              </Link>
            </div>
          ) : (
            <>
              <Link
                href="/login"
                className="text-xs font-semibold text-zinc-300 hover:text-white transition-colors"
              >
                Iniciar Sesión
              </Link>
              <Link
                href="/register"
                className="bg-zinc-900 hover:bg-zinc-800 border border-zinc-700 text-xs font-bold text-white px-4 py-2 rounded-lg"
              >
                Registrarse
              </Link>
            </>
          )}
        </div>
      </header>

      <main className="flex-1 flex flex-col items-center">
        <section className="w-full relative min-h-[600px] flex items-center justify-center">
          <div className="absolute inset-0">
            <Image
              src="/images/local/IMG-20250618-WA0009.jpg"
              alt="Fachada"
              fill
              className="object-cover"
              priority
            />
            <div className="absolute inset-0 bg-zinc-950/75" />
          </div>
          <div className="relative z-10 w-full max-w-5xl mx-auto px-6 py-24 text-center flex flex-col items-center gap-8">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 border border-white/20 text-xs text-zinc-200 font-medium">
              <span className="w-2 h-2 rounded-full bg-white animate-pulse" />
              Experiencia de Barbería Exclusiva
            </div>
            <h1 className="text-5xl md:text-7xl font-extrabold tracking-tight text-white max-w-3xl leading-tight">
              El arte de lucir impecable en{" "}
              <span className="text-zinc-300">Finos Barbers</span>
            </h1>
            <p className="text-zinc-300 text-lg max-w-2xl leading-relaxed">
              Combinamos técnicas tradicionales de navaja con los cortes
              modernos de mayor tendencia.
            </p>
            <Link
              href={ctaLink}
              className="inline-flex items-center gap-2 rounded-xl bg-white hover:bg-zinc-200 px-8 py-4 text-base font-black text-zinc-950 transition-all hover:scale-105 shadow-lg"
            >
              {ctaText}
            </Link>
          </div>
        </section>

        <section className="w-full max-w-5xl px-6 py-16 border-t border-zinc-900">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-extrabold text-white">
              Nuestros Servicios
            </h2>
            <p className="text-zinc-500 text-sm mt-2">
              Atención personalizada con los más altos estándares.
            </p>
          </div>
          <div className="grid md:grid-cols-3 gap-6">
            {serviciosDestacados.map((s, i) => (
              <div
                key={i}
                className="bg-zinc-900/50 border border-zinc-800 rounded-2xl p-6 flex flex-col justify-between hover:border-zinc-600 transition-all"
              >
                <div>
                  <h3 className="text-xl font-bold text-white">{s.nombre}</h3>
                  <p className="text-zinc-400 text-sm mt-2 leading-relaxed">
                    {s.descripcion}
                  </p>
                </div>
                <div className="mt-6 pt-4 border-t border-zinc-800 flex justify-between items-center">
                  <span className="text-xs text-zinc-500">{s.duracion}</span>
                  <span className="text-lg font-black text-white">
                    {s.precio}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </section>

        <section className="w-full max-w-5xl px-6 py-16 border-t border-zinc-900">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-extrabold text-white">
              Cómo Funciona
            </h2>
            <p className="text-zinc-500 text-sm mt-2">
              Reserva tu turno en 3 simples pasos.
            </p>
          </div>
          <div className="grid md:grid-cols-3 gap-8">
            {[
              {
                num: "1",
                title: "Elegí tu servicio",
                desc: "Seleccioná entre nuestros cortes premium y servicios de barba.",
              },
              {
                num: "2",
                title: "Elegí tu barbero",
                desc: "Conocé a nuestros expertos y elegí tu preferido.",
              },
              {
                num: "3",
                title: "Confirmá tu turno",
                desc: "Elegí fecha y hora, y listo.",
              },
            ].map((p) => (
              <div key={p.num} className="text-center">
                <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-white flex items-center justify-center text-2xl font-black text-zinc-950">
                  {p.num}
                </div>
                <h3 className="text-lg font-bold text-white mb-2">{p.title}</h3>
                <p className="text-zinc-400 text-sm">{p.desc}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="w-full max-w-5xl px-6 py-16 border-t border-zinc-900">
          <div className="grid md:grid-cols-3 gap-8 text-center">
            {[
              { value: "500+", label: "Clientes Satisfechos" },
              { value: "5", label: "Años de Experiencia" },
              { value: "4", label: "Barberos Expertos" },
            ].map((s) => (
              <div key={s.label}>
                <p className="text-5xl font-black text-white">{s.value}</p>
                <p className="text-zinc-400 text-sm mt-2">{s.label}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="w-full max-w-5xl px-6 py-16 border-t border-zinc-900">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-extrabold text-white">
              Nuestro Espacio
            </h2>
            <p className="text-zinc-500 text-sm mt-2">
              Conocé el ambiente donde trabajamos tu estilo.
            </p>
          </div>
          <div className="grid md:grid-cols-3 gap-6">
            <div className="relative aspect-square rounded-2xl overflow-hidden border border-zinc-800">
              <Image
                src="/images/local/IMG-20250618-WA0008 - copia.jpg"
                alt="Interior"
                fill
                className="object-cover hover:scale-105 transition-transform duration-500"
              />
            </div>
            <div className="relative aspect-square rounded-2xl overflow-hidden border border-zinc-800">
              <Image
                src="/images/local/IMG-20250618-WA0010.jpg"
                alt="Interior"
                fill
                className="object-cover hover:scale-105 transition-transform duration-500"
              />
            </div>
            <div className="relative aspect-square rounded-2xl overflow-hidden border border-zinc-800">
              <Image
                src="/images/local/IMG-20250618-WA0012.jpg"
                alt="Herramientas"
                fill
                className="object-cover hover:scale-105 transition-transform duration-500"
              />
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t border-zinc-900 px-6 py-12 bg-zinc-950">
        <div className="max-w-5xl mx-auto flex flex-col md:flex-row justify-between items-start gap-8">
          <div>
            <Image
              src="/images/logo.png"
              alt="Finos Barbers"
              width={90}
              height={32}
              className="invert mb-4"
            />
            <div className="space-y-2 text-sm text-zinc-400">
              <p>Ramón L. Falcón 4955</p>
              <p>finos_barbers@outlook.com</p>
              <a
                href="https://instagram.com/finos_barbers"
                target="_blank"
                rel="noopener noreferrer"
                className="hover:text-white transition-colors block"
              >
                @finos_barbers
              </a>
            </div>
          </div>
          <div className="flex gap-6 text-sm">
            <Link
              href="/login"
              className="text-zinc-400 hover:text-white transition-colors"
            >
              Iniciar Sesión
            </Link>
            <Link
              href="/register"
              className="text-zinc-400 hover:text-white transition-colors"
            >
              Registrarse
            </Link>
          </div>
        </div>
        <div className="max-w-5xl mx-auto text-center text-xs text-zinc-600 pt-8 mt-8 border-t border-zinc-900">
          <p>
            &copy; {new Date().getFullYear()} Finos Barbers. Todos los derechos
            reservados.
          </p>
        </div>
      </footer>
    </div>
  );
}
