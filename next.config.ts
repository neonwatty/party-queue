import type { NextConfig } from 'next'

// Use static export only for Capacitor iOS builds (set STATIC_EXPORT=true)
// Vercel deployments need server mode for API routes
const useStaticExport = process.env.STATIC_EXPORT === 'true'

const nextConfig: NextConfig = {
  // Static export for Capacitor iOS builds only
  ...(useStaticExport && { output: 'export' }),

  // Disable image optimization for static export
  images: {
    unoptimized: true,
  },

  // Trailing slashes help with static hosting
  trailingSlash: true,

  // Security response headers (ignored during static export / Capacitor builds)
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'X-Frame-Options', value: 'DENY' },
          { key: 'X-XSS-Protection', value: '1; mode=block' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
        ],
      },
    ]
  },

  // Note: Redirects don't work with static export
  // Handle /?join=CODE -> /join/CODE client-side in the home page
}

export default nextConfig
