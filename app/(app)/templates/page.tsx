/**
 * @file app/(app)/templates/page.tsx
 * @description Templates page - browse and select copywriting templates
 * 
 * Features:
 * - Template categories
 * - Search and filter
 * - Template cards with previews
 */

import type { Metadata } from 'next';
import Link from 'next/link';
import { Search, Filter, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

export const metadata: Metadata = {
  title: 'Templates',
  description: 'Browse our collection of AI-powered copywriting templates.',
};

/**
 * Template categories
 */
const categories = [
  { id: 'all', name: 'All Templates', count: 50 },
  { id: 'email', name: 'Email', count: 12 },
  { id: 'landing', name: 'Landing Pages', count: 8 },
  { id: 'social', name: 'Social Media', count: 15 },
  { id: 'ads', name: 'Advertising', count: 10 },
  { id: 'website', name: 'Website Copy', count: 5 },
] as const;

/**
 * Template data (placeholder)
 */
const templates = [
  {
    id: '1',
    name: 'Email Welcome Sequence',
    description: 'A 5-part welcome email series to onboard new subscribers and build trust.',
    category: 'Email',
    popular: true,
    icon: '✉️',
  },
  {
    id: '2',
    name: 'SaaS Landing Page',
    description: 'High-converting landing page copy for software products with benefit-driven headlines.',
    category: 'Landing Pages',
    popular: true,
    icon: '🚀',
  },
  {
    id: '3',
    name: 'Facebook Ad Copy',
    description: 'Scroll-stopping Facebook ad copy with multiple hook variations.',
    category: 'Advertising',
    popular: false,
    icon: '📢',
  },
  {
    id: '4',
    name: 'LinkedIn Post Series',
    description: 'Thought leadership posts optimized for LinkedIn engagement.',
    category: 'Social Media',
    popular: true,
    icon: '💼',
  },
  {
    id: '5',
    name: 'Product Description',
    description: 'Compelling product descriptions that highlight benefits and drive purchases.',
    category: 'Website Copy',
    popular: false,
    icon: '🏷️',
  },
  {
    id: '6',
    name: 'Cold Email Outreach',
    description: 'Personalized cold email templates with proven open rate optimization.',
    category: 'Email',
    popular: true,
    icon: '🎯',
  },
  {
    id: '7',
    name: 'Twitter/X Thread',
    description: 'Viral-worthy Twitter threads that educate and engage your audience.',
    category: 'Social Media',
    popular: false,
    icon: '🐦',
  },
  {
    id: '8',
    name: 'Google Ads Copy',
    description: 'High-CTR Google Ads copy with keyword optimization.',
    category: 'Advertising',
    popular: false,
    icon: '🔍',
  },
  {
    id: '9',
    name: 'About Page',
    description: 'Tell your brand story with compelling about page copy.',
    category: 'Website Copy',
    popular: false,
    icon: '📖',
  },
] as const;

/**
 * Templates page component
 */
export default function TemplatesPage() {
  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="font-display text-3xl font-bold text-ink-900">
          Templates
        </h1>
        <p className="text-ink-600 mt-1">
          Choose from 50+ AI-powered copywriting templates.
        </p>
      </div>

      {/* Search and Filter */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-ink-400" />
          <Input 
            placeholder="Search templates..." 
            className="pl-10"
          />
        </div>
        <Button variant="outline">
          <Filter className="h-4 w-4 mr-2" />
          Filter
        </Button>
      </div>

      {/* Categories */}
      <div className="flex flex-wrap gap-2">
        {categories.map((category) => (
          <button
            key={category.id}
            className={`
              px-4 py-2 rounded-full text-sm font-medium transition-colors
              ${category.id === 'all' 
                ? 'bg-ink-900 text-white' 
                : 'bg-white border border-border hover:bg-ink-50 text-ink-700'
              }
            `}
          >
            {category.name}
            <span className="ml-2 text-xs opacity-60">
              {category.count}
            </span>
          </button>
        ))}
      </div>

      {/* Templates Grid */}
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {templates.map((template) => (
          <Card 
            key={template.id} 
            className="border-border/50 hover:shadow-lg hover:-translate-y-1 transition-all duration-300 group"
          >
            <CardHeader>
              <div className="flex items-start justify-between">
                <div className="h-12 w-12 rounded-xl bg-amber-100 flex items-center justify-center text-2xl">
                  {template.icon}
                </div>
                {template.popular && (
                  <Badge variant="amber">Popular</Badge>
                )}
              </div>
              <CardTitle className="text-lg mt-4">{template.name}</CardTitle>
              <CardDescription className="line-clamp-2">
                {template.description}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Badge variant="secondary">{template.category}</Badge>
            </CardContent>
            <CardFooter>
              <Button 
                variant="ghost" 
                className="w-full group-hover:bg-amber-50 group-hover:text-amber-700"
                asChild
              >
                <Link href={`/templates/${template.id}`}>
                  Use Template
                  <ArrowRight className="h-4 w-4 ml-2" />
                </Link>
              </Button>
            </CardFooter>
          </Card>
        ))}
      </div>
    </div>
  );
}

