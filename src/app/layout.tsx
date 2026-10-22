import type { Metadata, Viewport } from "next";
import { Montserrat, Bevan } from "next/font/google";
import { PRODUCTO } from "@/lib/producto";
import "./globals.css";

// Tipografía secundaria de marca: Montserrat.
const montserrat = Montserrat({
  variable: "--font-body",
  subsets: ["latin"],
  display: "swap",
});

// Display tipo slab vintage, en sintonía con ChunkFive del logo.
const bevan = Bevan({
  variable: "--font-display",
  subsets: ["latin"],
  weight: "400",
  display: "swap",
});

export const viewport: Viewport = {
  themeColor: "#0a0a0a",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

// Lo general, para las páginas que no son de un local (el login, por
// ejemplo). Cada local pisa título, descripción y app instalable con los
// suyos (app/[local]/layout.tsx).
export const metadata: Metadata = {
  title: PRODUCTO.nombre,
  description: "Reservá tu turno online.",
  appleWebApp: {
    capable: true,
    title: PRODUCTO.nombre,
    statusBarStyle: "black-translucent",
  },
  formatDetection: {
    telephone: false,
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="es"
      className={`${montserrat.variable} ${bevan.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col bg-zinc-950 text-zinc-100">
        {children}
      </body>
    </html>
  );
}
