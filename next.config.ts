import type { NextConfig } from "next";

// Cabeceras de seguridad básicas. No se define Content-Security-Policy porque
// Next.js inyecta scripts en línea; añade una con nonces si la necesitas.
const cabecerasSeguridad = [
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
  { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains" },
];

const nextConfig: NextConfig = {
  async headers() {
    return [{ source: "/:path*", headers: cabecerasSeguridad }];
  },
};

export default nextConfig;
