import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* Security Headers Configuration */
  async headers() {
    return [
      {
        // Apply security headers to all routes
        source: '/:path*',
        headers: [
          {
            key: 'X-DNS-Prefetch-Control',
            value: 'on',
          },
          {
            key: 'X-Frame-Options',
            value: 'DENY',
          },
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff',
          },
          {
            key: 'X-XSS-Protection',
            value: '1; mode=block',
          },
          {
            key: 'Referrer-Policy',
            value: 'strict-origin-when-cross-origin',
          },
          {
            key: 'Permissions-Policy',
            value: 'camera=(), microphone=(self), geolocation=()',
          },
        ],
      },
      {
        // API routes - no cache
        source: '/api/:path*',
        headers: [
          {
            key: 'Cache-Control',
            value: 'no-store, max-age=0',
          },
        ],
      },
      {
        // SSE streaming endpoint - special headers
        source: '/api/stream/:path*',
        headers: [
          {
            key: 'Cache-Control',
            value: 'no-cache, no-transform',
          },
          {
            key: 'Connection',
            value: 'keep-alive',
          },
          {
            key: 'X-Accel-Buffering',
            value: 'no',
          },
        ],
      },
      {
        // Static assets - aggressive caching
        source: '/static/:path*',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=31536000, immutable',
          },
        ],
      },
      {
        // Fonts - long cache
        source: '/fonts/:path*',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=31536000, immutable',
          },
        ],
      },
      {
        // Images - cache with revalidation
        source: '/images/:path*',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=86400, stale-while-revalidate=604800',
          },
        ],
      },
    ];
  },

  /* Redirect HTTP to HTTPS in production */
  async redirects() {
    // Only apply in production
    if (process.env.NODE_ENV === 'production') {
      return [
        // Add any necessary redirects here
      ];
    }
    return [];
  },

  /* Image optimization configuration */
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '**.supabase.co',
      },
    ],
  },

  /* Experimental features */
  experimental: {
    // Enable server actions with proper size limits
    serverActions: {
      bodySizeLimit: '10mb', // Limit request body size for security
    },
  },

  /* Webpack configuration for security */
  webpack: (config, { isServer }) => {
    // Prevent source map exposure in production
    if (!isServer && process.env.NODE_ENV === 'production') {
      config.devtool = false;
    }
    return config;
  },

  /* Powered by header removal for security */
  poweredByHeader: false,

  /* Strict mode for better security and performance */
  reactStrictMode: true,

  /* Turbopack configuration (Next.js 16+ default bundler) */
  turbopack: {},
};

export default nextConfig;
