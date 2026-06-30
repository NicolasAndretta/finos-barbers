import React from 'react'
import Link from 'next/link'
import { Logo } from '@/components/ui/Logo'

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative min-h-screen flex flex-col justify-center items-center bg-zinc-950 font-sans text-zinc-100 px-4 py-12 overflow-hidden">
      <div className="absolute top-[-20%] left-[-10%] w-[50%] h-[50%] bg-gradient-to-br from-white/5 to-transparent rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-[-20%] right-[-10%] w-[50%] h-[50%] bg-gradient-to-tl from-zinc-800/20 to-transparent rounded-full blur-[120px] pointer-events-none" />
      
      <div className="relative z-10 mb-8 flex flex-col items-center">
        <Link href="/">
          <Logo size={52} priority />
        </Link>
      </div>

      <div className="relative z-10 w-full flex justify-center">
        {children}
      </div>
    </div>
  )
}