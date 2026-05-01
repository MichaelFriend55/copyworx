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

  /**
   * Redirect rules.
   *
   * /pricing  ->  /#pricing
   *   The standalone /pricing page was retired; the homepage is now the
   *   single source of truth for pricing. We emit a 308 (permanent +
   *   method-preserving) so old bookmarks, search-engine results, and any
   *   stray external links land on the homepage with the URL fragment
   *   intact, which scrolls the user to the new pricing card.
   */
  async redirects() {
    return [
      {
        source: '/pricing',
        destination: '/#pricing',
        permanent: true,
      },
    ];
  },
};

module.exports = nextConfig;

