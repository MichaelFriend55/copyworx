/**
 * @file app/(marketing)/page.tsx
 * @description Homepage for CopyWorx - the main landing page
 * 
 * Sections:
 * - Hero with animated headline and CTA
 * - Features grid
 * - Social proof / testimonials
 * - CTA section
 */

import Link from 'next/link';
import { 
  ArrowRight, 
  Sparkles, 
  Zap, 
  Target, 
  PenTool,
  BarChart3,
  Users,
  CheckCircle2
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';

/**
 * Features data for the features section
 */
const features = [
  {
    icon: Sparkles,
    title: 'AI-Powered Templates',
    description: 'Access 50+ professionally crafted templates powered by AI to generate copy that converts.',
  },
  {
    icon: Zap,
    title: 'Lightning Fast',
    description: 'Generate high-quality copy in seconds, not hours. Save time and boost your productivity.',
  },
  {
    icon: Target,
    title: 'Conversion Focused',
    description: 'Every template is optimized for conversions based on proven copywriting frameworks.',
  },
  {
    icon: PenTool,
    title: 'Brand Voice',
    description: 'Train the AI to match your unique brand voice for consistent messaging across all content.',
  },
  {
    icon: BarChart3,
    title: 'Performance Insights',
    description: 'Track and analyze your copy performance with built-in analytics and A/B testing.',
  },
  {
    icon: Users,
    title: 'Team Collaboration',
    description: 'Work together seamlessly with real-time collaboration and shared project workspaces.',
  },
] as const;

/**
 * Testimonials data
 */
const testimonials = [
  {
    quote: "CopyWorx has completely transformed how our team creates marketing content. We're producing 3x more copy with better results.",
    author: 'Sarah Chen',
    role: 'Marketing Director',
    company: 'TechFlow',
  },
  {
    quote: "The AI templates are incredibly well-crafted. It's like having a senior copywriter on demand 24/7.",
    author: 'Marcus Johnson',
    role: 'Founder',
    company: 'GrowthLab',
  },
  {
    quote: "Finally, a copywriting tool that actually understands conversion psychology. Our landing page conversions are up 47%.",
    author: 'Emily Rodriguez',
    role: 'Head of Growth',
    company: 'Scalify',
  },
] as const;

/**
 * Homepage component
 */
export default function HomePage() {
  return (
    <>
      {/* Hero Section */}
      <section className="relative overflow-hidden">
        {/* Background Pattern */}
        <div className="absolute inset-0 bg-gradient-to-b from-amber-50/50 via-transparent to-transparent" />
        <div className="absolute inset-0 bg-grid opacity-40" />
        
        {/* Decorative Elements */}
        <div className="absolute top-20 left-10 w-72 h-72 bg-amber-400/20 rounded-full blur-3xl" />
        <div className="absolute bottom-20 right-10 w-96 h-96 bg-ink-400/10 rounded-full blur-3xl" />
        
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 relative">
          <div className="py-24 md:py-32 lg:py-40">
            <div className="max-w-4xl mx-auto text-center">
              {/* Badge */}
              <div className="animate-fade-in opacity-0">
                <Badge variant="amber" className="mb-6 px-4 py-1.5">
                  <Sparkles className="w-3.5 h-3.5 mr-1.5" />
                  Now with GPT-4 Turbo
                </Badge>
              </div>
              
              {/* Headline */}
              <h1 className="font-sans text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-bold text-ink-900 leading-[1.1] tracking-tight animate-fade-in opacity-0 animation-delay-100">
                Write copy that
                <span className="relative">
                  <span className="relative z-10 text-gradient-amber"> converts</span>
                </span>
              </h1>
              
              {/* Subheadline */}
              <p className="mt-6 text-lg md:text-xl text-ink-600 max-w-2xl mx-auto leading-relaxed animate-fade-in opacity-0 animation-delay-200">
                CopyWorx helps marketers and copywriters create compelling, 
                high-converting copy in seconds using AI-powered templates 
                and proven copywriting frameworks.
              </p>
              
              {/* CTA Buttons */}
              <div className="mt-10 flex flex-col sm:flex-row gap-4 justify-center animate-fade-in opacity-0 animation-delay-300">
                <Button size="xl" variant="amber" asChild>
                  <Link href="/sign-up">
                    Start Writing Free
                    <ArrowRight className="ml-2 h-5 w-5" />
                  </Link>
                </Button>
                <Button size="xl" variant="outline" asChild>
                  <Link href="/templates">
                    Browse Templates
                  </Link>
                </Button>
              </div>
              
              {/* Trust Indicators */}
              <div className="mt-12 flex flex-wrap justify-center gap-x-8 gap-y-4 text-sm text-ink-500 animate-fade-in opacity-0 animation-delay-400">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-green-500" />
                  <span>Free to start</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-green-500" />
                  <span>No credit card required</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-green-500" />
                  <span>50+ templates included</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-24 md:py-32 bg-white">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          {/* Section Header */}
          <div className="max-w-3xl mx-auto text-center mb-16">
            <Badge variant="secondary" className="mb-4">Features</Badge>
            <h2 className="font-sans text-3xl md:text-4xl lg:text-5xl font-bold text-ink-900 mb-6">
              Everything you need to write better copy
            </h2>
            <p className="text-lg text-ink-600">
              From idea to published content, CopyWorx gives you all the tools 
              you need to create copy that drives results.
            </p>
          </div>
          
          {/* Features Grid */}
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 lg:gap-8">
            {features.map((feature, index) => (
              <Card 
                key={feature.title} 
                className="card-hover border-border/50 bg-gradient-to-br from-white to-ink-50/30"
                style={{ animationDelay: `${index * 100}ms` }}
              >
                <CardContent className="p-6">
                  <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-amber-100 text-amber-600 mb-4">
                    <feature.icon className="h-6 w-6" />
                  </div>
                  <h3 className="font-sans text-xl font-semibold text-ink-900 mb-2">
                    {feature.title}
                  </h3>
                  <p className="text-ink-600 leading-relaxed">
                    {feature.description}
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Testimonials Section */}
      <section className="py-24 md:py-32 bg-ink-950 text-white relative overflow-hidden">
        {/* Background Pattern */}
        <div className="absolute inset-0 bg-grid-dark opacity-30" />
        
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 relative">
          {/* Section Header */}
          <div className="max-w-3xl mx-auto text-center mb-16">
            <Badge variant="outline" className="mb-4 border-amber-500/30 text-amber-400">
              Testimonials
            </Badge>
            <h2 className="font-sans text-3xl md:text-4xl lg:text-5xl font-bold text-white mb-6">
              Loved by copywriters worldwide
            </h2>
            <p className="text-lg text-ink-300">
              Join thousands of marketers and copywriters who are creating 
              better content faster with CopyWorx.
            </p>
          </div>
          
          {/* Testimonials Grid */}
          <div className="grid md:grid-cols-3 gap-6 lg:gap-8">
            {testimonials.map((testimonial, index) => (
              <Card 
                key={testimonial.author}
                className="bg-ink-900/50 border-ink-800 backdrop-blur-sm"
                style={{ animationDelay: `${index * 100}ms` }}
              >
                <CardContent className="p-6">
                  <p className="text-ink-200 leading-relaxed mb-6 italic">
                    "{testimonial.quote}"
                  </p>
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-full bg-gradient-to-br from-amber-400 to-amber-600" />
                    <div>
                      <p className="font-medium text-white">{testimonial.author}</p>
                      <p className="text-sm text-ink-400">
                        {testimonial.role}, {testimonial.company}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-24 md:py-32 bg-gradient-to-br from-amber-50 via-white to-ink-50">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="max-w-4xl mx-auto text-center">
            <h2 className="font-sans text-3xl md:text-4xl lg:text-5xl font-bold text-ink-900 mb-6">
              Ready to write copy that converts?
            </h2>
            <p className="text-lg text-ink-600 mb-10 max-w-2xl mx-auto">
              Join over 10,000 marketers and copywriters who trust CopyWorx 
              to help them create compelling content every day.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button size="xl" variant="ink" asChild>
                <Link href="/sign-up">
                  Get Started for Free
                  <ArrowRight className="ml-2 h-5 w-5" />
                </Link>
              </Button>
              <Button size="xl" variant="outline" asChild>
                <Link href="/pricing">
                  View Pricing
                </Link>
              </Button>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}

