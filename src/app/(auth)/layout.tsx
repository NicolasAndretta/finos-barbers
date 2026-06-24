import React from 'react'
import Link from 'next/link'
import Image from 'next/image'

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative min-h-screen flex flex-col justify-center items-center bg-zinc-950 text-zinc-100 px-4 py-12 overflow-hidden">
      {/* Textura diagonal sutil + glow amber */}
      <div
        className="absolute inset-0 opacity-[0.05] pointer-events-none"
        style={{
          backgroundImage:
            'repeating-linear-gradient(135deg, #f59e0b 0px, #f59e0b 2px, transparent 2px, transparent 16px)',
        }}
      />
      <div className="absolute -top-32 left-1/2 -translate-x-1/2 w-[600px] h-[400px] bg-amber-500/12 blur-[120px] rounded-full pointer-events-none" />
      <div className="absolute bottom-[-20%] right-[-10%] w-[50%] h-[50%] bg-zinc-800/30 blur-[120px] rounded-full pointer-events-none" />

      <div className="relative z-10 mb-8 flex flex-col items-center gap-3">
        <Link href="/">
          <Image src="/images/logo.png" alt="Finos Barbers" width={130} height={48} className="invert" />
        </Link>
        <span className="text-[10px] uppercase tracking-[0.35em] text-zinc-500">Barber Studio Premium</span>
      </div>

      <div className="relative z-10 w-full flex justify-center animate-fade-in">
        {children}
      </div>
    </div>
  )
}
