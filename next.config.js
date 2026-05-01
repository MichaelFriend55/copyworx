/**
 * @file next.config.js
 * @description Next.js configuration for CopyWorx application
 */

/** @type {import('next').NextConfig} */
const nextConfig = {
  // Enable React Strict Mode for better development experience
  reactStrictMode: true,
  
  // Disable ESLint during production builds to avoid blocking deployment
  eslint: {
    ignoreDuringBuilds: true,
  },
  
  // Image optimization configuration
  images: {
    formats: ['image/avif', 'image/webp'],
    unoptimized: false,
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'img.clerk.com',
        port: '',
        pathname: '/**',
      },
    ],
  },
  
  // Experimental features for App Router optimization
  experimental: {
    // Enable server actions
    serverActions: {
      bodySizeLimit: '2mb',
    },
  },

  // NOTE: /pricing -> /#pricing is intentionally NOT handled here.
  // Next.js server-side redirects (both next.config.js redirects() and
  // NextResponse.redirect() in middleware) strip URL fragments before the
  // browser ever sees them, so a 308 to "/#pricing" loses the "#pricing"
  // anchor and lands the user at the top of the homepage. Instead, we
  // render a tiny client component at app/(marketing)/pricing/page.tsx
  // that calls router.replace('/#pricing') on mount — client-side
  // navigation preserves the fragment.
};

module.exports = nextConfig;

