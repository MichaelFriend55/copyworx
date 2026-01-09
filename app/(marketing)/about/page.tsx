/**
 * @file app/(marketing)/about/page.tsx
 * @description About page for CopyWorx
 * 
 * Sections:
 * - Hero with mission statement
 * - Company story
 * - Team values
 * - Stats section
 */

import type { Metadata } from 'next';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { 
  Heart, 
  Lightbulb, 
  Users, 
  Rocket,
  Target,
  Shield
} from 'lucide-react';

export const metadata: Metadata = {
  title: 'About',
  description: 'Learn about CopyWorx and our mission to help copywriters create better content faster.',
};

/**
 * Company values data
 */
const values = [
  {
    icon: Heart,
    title: 'Customer First',
    description: 'Everything we build starts with understanding and solving real problems for copywriters.',
  },
  {
    icon: Lightbulb,
    title: 'Innovation',
    description: 'We constantly push the boundaries of what AI can do for creative writing.',
  },
  {
    icon: Users,
    title: 'Community',
    description: 'We believe in the power of collaboration and learning from each other.',
  },
  {
    icon: Rocket,
    title: 'Excellence',
    description: 'We hold ourselves to the highest standards in everything we create.',
  },
  {
    icon: Target,
    title: 'Results-Driven',
    description: 'We measure success by the outcomes our users achieve with our tools.',
  },
  {
    icon: Shield,
    title: 'Trust & Privacy',
    description: 'Your content is yours. We never use your data to train our models.',
  },
] as const;

/**
 * Company stats data
 */
const stats = [
  { value: '10,000+', label: 'Active Users' },
  { value: '2M+', label: 'Words Generated' },
  { value: '50+', label: 'Templates' },
  { value: '98%', label: 'Customer Satisfaction' },
] as const;

/**
 * About page component
 */
export default function AboutPage() {
  return (
    <>
      {/* Hero Section */}
      <section className="relative overflow-hidden py-24 md:py-32">
        {/* Background */}
        <div className="absolute inset-0 bg-gradient-to-b from-ink-50/50 via-transparent to-transparent" />
        <div className="absolute inset-0 bg-dots opacity-30" />
        
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 relative">
          <div className="max-w-3xl mx-auto text-center">
            <Badge variant="secondary" className="mb-6">About Us</Badge>
            <h1 className="font-sans text-4xl md:text-5xl lg:text-6xl font-bold text-ink-900 mb-6">
              Empowering writers to create their best work
            </h1>
            <p className="text-lg md:text-xl text-ink-600 leading-relaxed">
              CopyWorx was founded with a simple mission: help copywriters and marketers 
              create compelling content that drives results, without the blank page anxiety.
            </p>
          </div>
        </div>
      </section>

      {/* Story Section */}
      <section className="py-24 md:py-32 bg-white">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid lg:grid-cols-2 gap-12 lg:gap-16 items-center">
            {/* Image Placeholder */}
            <div className="relative">
              <div className="aspect-square rounded-2xl bg-gradient-to-br from-amber-100 via-amber-50 to-ink-50 flex items-center justify-center">
                <div className="w-3/4 h-3/4 rounded-xl bg-white shadow-2xl flex items-center justify-center">
                  <span className="font-sans text-6xl text-ink-200">✍️</span>
                </div>
              </div>
              {/* Decorative element */}
              <div className="absolute -bottom-6 -right-6 w-32 h-32 bg-amber-400 rounded-2xl -z-10" />
            </div>
            
            {/* Content */}
            <div>
              <Badge variant="amber" className="mb-4">Our Story</Badge>
              <h2 className="font-sans text-3xl md:text-4xl font-bold text-ink-900 mb-6">
                Built by copywriters, for copywriters
              </h2>
              <div className="space-y-4 text-ink-600 leading-relaxed">
                <p>
                  CopyWorx started in 2023 when our founders—experienced copywriters 
                  themselves—recognized a gap in the market. While AI writing tools existed, 
                  none truly understood the craft of copywriting.
                </p>
                <p>
                  We set out to build something different: an AI assistant that understands 
                  proven copywriting frameworks, conversion psychology, and brand voice. 
                  Not a replacement for human creativity, but a powerful amplifier of it.
                </p>
                <p>
                  Today, CopyWorx helps thousands of marketers and copywriters create 
                  better content faster. From startups to Fortune 500 companies, our users 
                  trust us to help them craft messages that resonate and convert.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="py-16 bg-ink-950">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            {stats.map((stat) => (
              <div key={stat.label} className="text-center">
                <div className="font-sans text-4xl md:text-5xl font-bold text-amber-400 mb-2">
                  {stat.value}
                </div>
                <div className="text-ink-400 text-sm">
                  {stat.label}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Values Section */}
      <section className="py-24 md:py-32 bg-gradient-to-b from-white to-ink-50/50">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          {/* Section Header */}
          <div className="max-w-3xl mx-auto text-center mb-16">
            <Badge variant="secondary" className="mb-4">Our Values</Badge>
            <h2 className="font-sans text-3xl md:text-4xl font-bold text-ink-900 mb-6">
              What we stand for
            </h2>
            <p className="text-lg text-ink-600">
              These core values guide everything we do at CopyWorx.
            </p>
          </div>
          
          {/* Values Grid */}
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 lg:gap-8">
            {values.map((value) => (
              <Card 
                key={value.title}
                className="border-border/50 bg-white"
              >
                <CardContent className="p-6">
                  <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-ink-100 text-ink-700 mb-4">
                    <value.icon className="h-6 w-6" />
                  </div>
                  <h3 className="font-sans text-xl font-semibold text-ink-900 mb-2">
                    {value.title}
                  </h3>
                  <p className="text-ink-600 leading-relaxed">
                    {value.description}
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>
    </>
  );
}

