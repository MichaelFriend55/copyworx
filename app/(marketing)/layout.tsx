/**
 * @file app/(marketing)/layout.tsx
 * @description Layout for marketing pages (public-facing)
 * 
 * Includes:
 * - Navbar with public navigation
 * - Footer
 * - Proper spacing for fixed navbar
 */

import { Navbar } from '@/components/layout/navbar';
import { Footer } from '@/components/layout/footer';

/**
 * Marketing layout component
 * 
 * Wraps all public-facing pages with the marketing navbar and footer.
 */
export default function MarketingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen flex-col">
      <Navbar />
      <main className="flex-1 pt-16">
        {children}
      </main>
      <Footer />
    </div>
  );
}

