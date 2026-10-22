import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import RegistrarSW from "@/components/RegistrarSW";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Dashboard Freelancer Pro",
  description: "Panel de control profesional para freelancers - Gestión de clientes, proyectos y finanzas",
  applicationName: "Freelancer Pro",
  // iPhone: al añadirla a la pantalla de inicio se abre como app, con este nombre
  appleWebApp: { capable: true, title: "Freelancer Pro" },
};

export const viewport: Viewport = {
  themeColor: "#1a2a3a",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="es"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        {children}
        <RegistrarSW />
      </body>
    </html>
  );
}
