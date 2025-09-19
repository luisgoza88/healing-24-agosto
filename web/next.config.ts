import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Configuraciones para mejorar estabilidad en desarrollo
  productionBrowserSourceMaps: false,
  
  // Turbopack desactivado temporalmente por errores de runtime
  // experimental: {
  //   turbo: {
  //     root: '/Users/marianatejada/Documents/GitHub/healing-24-agosto/web'
  //   }
  // },
  
  // Configuración para resolver problemas de CSP
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          {
            key: 'Content-Security-Policy',
            value: process.env.NODE_ENV === 'development' 
              ? "default-src 'self'; script-src 'self' 'unsafe-eval' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; font-src 'self' data:; connect-src 'self' https://*.supabase.co https://*.supabase.in wss://*.supabase.co wss://*.supabase.in;"
              : "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; font-src 'self' data:; connect-src 'self' https://*.supabase.co https://*.supabase.in wss://*.supabase.co wss://*.supabase.in;"
          }
        ]
      }
    ]
  }
};

export default nextConfig;