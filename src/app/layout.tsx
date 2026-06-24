import type { Metadata, Viewport } from "next";
import { Barlow, Barlow_Condensed } from "next/font/google";
import { PwaInstallPrompt } from "@/components/ui/PwaInstallPrompt";
import "./globals.css";

const barlow = Barlow({
  variable: "--font-barlow",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

const barlowCondensed = Barlow_Condensed({
  variable: "--font-barlow-condensed",
  subsets: ["latin"],
  weight: ["600", "700", "800"],
});

export const viewport: Viewport = {
  themeColor: "#f59e0b",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

export const metadata: Metadata = {
  title: "Finos Barbers | Barber Studio Premium",
  description: "Agenda tu turno con los mejores barberos de la ciudad.",
  appleWebApp: {
    capable: true,
    title: "Finos Barbers",
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
    <html lang="es" className={`${barlow.variable} ${barlowCondensed.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col">
        {children}
        <PwaInstallPrompt />
      </body>
    </html>
  );
}
