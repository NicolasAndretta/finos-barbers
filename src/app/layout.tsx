import type { Metadata, Viewport } from "next";
import { Montserrat, Bevan } from "next/font/google";
import { PwaInstallPrompt } from "@/components/ui/PwaInstallPrompt";
import "./globals.css";

// Tipografía secundaria de marca (manual Fino's): Montserrat.
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

export const metadata: Metadata = {
  title: "Fino's Barber's | Barbería premium en Buenos Aires",
  description:
    "Cortes, barba y afeitado tradicional. Reservá tu turno online y conocé nuestra tienda de productos. Ramón L. Falcón 4955.",
  appleWebApp: {
    capable: true,
    title: "Fino's Barber's",
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
        <PwaInstallPrompt />
      </body>
    </html>
  );
}
