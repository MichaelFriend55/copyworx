/**
 * @file app/(marketing)/page.tsx
 * @description CopyWorx Studio™ landing page - professional marketing homepage
 * 
 * Sections:
 * - Hero with solid gray background and primary CTA
 * - The Challenge - problem statement
 * - The Story - founder narrative with gradient background
 * - Features - 2x2 grid of key capabilities
 * - How It Works - 4-step process
 * - Beta Access - final CTA section
 */

import Image from 'next/image';
import { 
  Wand2,
  Palette, 
  FileText, 
  FolderOpen,
  ArrowRight
} from 'lucide-react';
import { Button } from '@/components/ui/button';

/**
 * Features data for the features section
 */
const features = [
  {
    icon: Wand2,
    title: 'Copy Optimizer Tools',
    description: 'Refine your copy in real time. Shift tone, expand ideas, tighten language, generate headlines, or completely rewrite for different channels – all while maintaining your unique voice.',
  },
  {
    icon: FileText,
    title: 'AI@Worx Templates',
    description: "Strategic templates that ask the right questions to put you in the right direction fast. No more staring at a blank page. Answer a few prompts and get professional copy that's ready to refine.",
  },
  {
    icon: Palette,
    title: 'Brand Voice System',
    description: 'Define your brand voice once, and CopyWorx Studio™ ensures everything you write stays on brand. Create detailed personas, set approved phrases and forbidden words, and maintain consistency across every piece of content.',
  },
  {
    icon: FolderOpen,
    title: 'Smart Document Management',
    description: 'Organize projects by client, track versions, and manage your entire copywriting workflow in one intuitive worxspace. No more scattered Google Docs or lost revisions.',
  },
] as const;

/**
 * How it works steps
 */
const steps = [
  {
    number: '01',
    title: 'Define Your Brand',
    description: 'Define your brand voice and create customer personas (or skip this and start writing)',
  },
  {
    number: '02',
    title: 'Choose Your Starting Point',
    description: 'Choose a template or start from scratch in the editor',
  },
  {
    number: '03',
    title: 'Write & Optimize',
    description: 'Write, optimize, and refine with AI-powered tools – use as much or as little help as you need',
  },
  {
    number: '04',
    title: 'Export & Deliver',
    description: 'Export professional, on-brand copy in minutes',
  },
] as const;

/**
 * Homepage component - CopyWorx Studio™ landing page
 */
export default function HomePage() {
  return (
    <div className="scroll-smooth">
      {/* ========================================================================
          HERO SECTION
          Full viewport height with solid gray background
          ======================================================================== */}
      <section className="relative min-h-screen flex items-center justify-center overflow-hidden bg-[#F5F5F7]">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <div className="max-w-4xl mx-auto text-center">
            {/* Logo - Large (reduced 10% from previous) */}
            <div className="flex justify-center mb-14 animate-fade-in">
              <Image
                src="/copyworx-logo-v2.png"
                alt="CopyWorx Studio™"
                width={720}
                height={200}
                className="h-44 sm:h-56 md:h-[17rem] w-auto"
                priority
              />
            </div>
            
            {/* Headline */}
            <h1 className="font-sans text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-bold text-ink-900 leading-[1.1] tracking-tight mb-6 animate-fade-in animation-delay-100">
              Write To Win With
              <br />
              <span className="bg-gradient-to-r from-[#006EE6] to-[#A755F7] bg-clip-text text-transparent">CopyWorx Studio™</span>
            </h1>
            
            {/* Subheadline */}
            <p className="text-lg sm:text-xl md:text-2xl text-ink-600 max-w-3xl mx-auto leading-relaxed mb-10 animate-fade-in animation-delay-200">
              The first AI-powered platform built by a professional copywriter, for copywriters and marketers.
            </p>
            
            {/* Primary CTA */}
            <div className="animate-fade-in animation-delay-300">
              <Button 
                size="xl" 
                className="bg-gradient-to-r from-[#006EE6] to-[#A755F7] text-white hover:opacity-90 font-semibold text-lg px-10 py-6 h-auto shadow-2xl transition-all duration-300"
                asChild
              >
                <a href="https://tally.so/r/Xx4yxV">
                  Request Beta Access
                  <ArrowRight className="ml-2 h-5 w-5" />
                </a>
              </Button>
            </div>
          </div>
        </div>
        
        {/* Scroll Indicator */}
        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 animate-bounce">
          <div className="w-6 h-10 rounded-full border-2 border-ink-400/50 flex items-start justify-center p-2">
            <div className="w-1.5 h-3 bg-ink-400/70 rounded-full" />
          </div>
        </div>
      </section>

      {/* ========================================================================
          THE CHALLENGE SECTION
          Problem statement with clean typography
          ======================================================================== */}
      <section className="py-24 md:py-32 bg-white">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="max-w-4xl mx-auto">
            <h2 className="font-sans text-3xl sm:text-4xl md:text-5xl font-bold text-ink-900 mb-8 text-center">
              Writing Great Copy Shouldn&apos;t Be So Hard
            </h2>
            
            <div className="prose prose-lg md:prose-xl max-w-none text-ink-600 leading-relaxed space-y-6">
              <p>
                Whether you&apos;re a seasoned copywriter juggling multiple clients or a marketing team trying to maintain brand consistency across campaigns, the challenge is the same: How do you write professional, strategic copy quickly without sacrificing quality?
              </p>
              
              <p>
                Traditional writing tools aren&apos;t built for copywriters. AI tools promise speed but deliver generic fluff. And hiring out? Expensive and slow.
              </p>
              
              <p className="text-ink-900 font-semibold text-xl md:text-2xl">
                CopyWorx Studio™ changes that.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ========================================================================
          THE STORY SECTION
          Founder narrative with gradient background and white text
          ======================================================================== */}
      <section className="py-24 md:py-32 bg-gradient-to-br from-[#006EE6] via-[#4B3F99] to-[#A755F7] relative overflow-hidden">
        {/* Subtle Pattern Overlay */}
        <div className="absolute inset-0 opacity-10">
          <div className="absolute inset-0" style={{
            backgroundImage: 'radial-gradient(circle at 1px 1px, white 1px, transparent 1px)',
            backgroundSize: '40px 40px'
          }} />
        </div>
        
        {/* Decorative Glow Elements */}
        <div className="absolute top-0 left-0 w-72 h-72 bg-[#EFBF04]/10 rounded-full blur-3xl" />
        <div className="absolute bottom-0 right-0 w-96 h-96 bg-white/5 rounded-full blur-3xl" />
        
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <div className="max-w-4xl mx-auto">
            <h2 className="font-sans text-3xl sm:text-4xl md:text-5xl font-bold text-white mb-8 text-center">
              Built By A Copywriter Who Gets It
            </h2>
            
            <div className="prose prose-lg md:prose-xl max-w-none text-white/90 leading-relaxed space-y-6">
              <p>
                CopyWorx Studio™ leverages proven, time-tested copywriting tools and combines them with the power of AI to create a platform any marketing professional can use — regardless of writing experience — to create professional, high-converting copy in minutes.
              </p>
              
              <p>
                CopyWorx Studio™ was created by a professional copywriter, creative director, and branding expert with over 40 years of experience. He and his team have packed CopyWorx Studio™ with all of the features and functions a copywriter needs in one, clean, intuitive worxspace.
              </p>
              
              <p>
                CopyWorx Studio™ utilizes AI in all the ways that are important to writers – inspiring ideas, finessing copy, offering strategic suggestions, checking and changing tone and style, and always reviewing copy through the lens of brand standards and customer personas. And of course, just being a solid writing app with the features, functions and worxflows you expect in today&apos;s writing tools.
              </p>
              
              {/* Highlighted sentence */}
              <p className="bg-white/10 border-l-4 border-[#EFBF04] pl-6 py-4 rounded-r-lg backdrop-blur-sm">
                <strong className="text-white text-xl md:text-2xl">
                  With CopyWorx Studio™, you can use as much or as little AI as you like.
                </strong>
              </p>
              
              <p>
                Start with a template, start with a brand voice, start on your own. The point is, it&apos;s easy to get started with real workflow-aware functionality.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ========================================================================
          FEATURES SECTION
          2x2 grid of key capabilities
          ======================================================================== */}
      <section className="py-24 md:py-32 bg-white">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          {/* Section Header */}
          <div className="max-w-3xl mx-auto text-center mb-16">
            <h2 className="font-sans text-3xl sm:text-4xl md:text-5xl font-bold text-ink-900 mb-6">
              What Makes CopyWorx Studio™ Different
            </h2>
          </div>
          
          {/* Features Grid - 2x2 */}
          <div className="max-w-5xl mx-auto grid md:grid-cols-2 gap-8">
            {features.map((feature, index) => (
              <div 
                key={feature.title}
                className="group relative bg-white rounded-2xl border border-ink-200 p-8 shadow-sm hover:shadow-xl hover:border-[#006EE6]/30 transition-all duration-300"
                style={{ animationDelay: `${index * 100}ms` }}
              >
                {/* Icon */}
                <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-gradient-to-br from-[#006EE6] to-[#A755F7] text-white mb-6 group-hover:scale-110 transition-transform duration-300">
                  <feature.icon className="h-7 w-7" />
                </div>
                
                {/* Content */}
                <h3 className="font-sans text-xl md:text-2xl font-semibold text-ink-900 mb-3">
                  {feature.title}
                </h3>
                <p className="text-ink-600 leading-relaxed">
                  {feature.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ========================================================================
          VIDEO SECTION
          Streamable video embed with responsive container
          ======================================================================== */}
      <section className="py-24 md:py-32 bg-[#F5F5F7]">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          {/* Section Header */}
          <div className="max-w-3xl mx-auto text-center mb-16">
            <h2 className="font-sans text-3xl sm:text-4xl md:text-5xl font-bold text-ink-900 mb-6">
              Discover How To Write To Win
            </h2>
          </div>
          
          {/* Video Container */}
          <div className="max-w-[800px] mx-auto">
            <div className="relative w-full" style={{ paddingBottom: '56.25%' }}>
              <iframe
                src="https://streamable.com/e/wy9jxv"
                frameBorder="0"
                allowFullScreen
                className="absolute top-0 left-0 w-full h-full rounded-xl shadow-2xl"
                allow="autoplay; fullscreen"
              />
            </div>
          </div>
        </div>
      </section>

      {/* ========================================================================
          HOW IT WORKS SECTION
          4-step process with numbered steps
          ======================================================================== */}
      <section className="py-24 md:py-32 bg-ink-950 text-white">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          {/* Section Header */}
          <div className="max-w-3xl mx-auto text-center mb-16">
            <h2 className="font-sans text-3xl sm:text-4xl md:text-5xl font-bold text-white mb-6">
              How It Works
            </h2>
          </div>
          
          {/* Steps */}
          <div className="max-w-4xl mx-auto">
            <div className="grid md:grid-cols-2 gap-8 md:gap-12">
              {steps.map((step, index) => (
                <div 
                  key={step.number}
                  className="relative flex gap-6"
                  style={{ animationDelay: `${index * 100}ms` }}
                >
                  {/* Step Number */}
                  <div className="flex-shrink-0">
                    <div className="flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-br from-[#006EE6] to-[#A755F7] text-white font-bold text-xl">
                      {step.number}
                    </div>
                  </div>
                  
                  {/* Step Content */}
                  <div className="pt-2">
                    <h3 className="font-sans text-xl font-semibold text-white mb-2">
                      {step.title}
                    </h3>
                    <p className="text-ink-300 leading-relaxed">
                      {step.description}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ========================================================================
          BETA ACCESS SECTION
          Final CTA with gradient background
          ======================================================================== */}
      <section className="py-24 md:py-32 bg-[#F5F5F7] relative overflow-hidden">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <div className="max-w-3xl mx-auto text-center">
            <h2 className="font-sans text-3xl sm:text-4xl md:text-5xl font-bold text-ink-900 mb-6">
              Ready To Write To Win?
            </h2>
            
            <div className="text-lg md:text-xl text-ink-600 leading-relaxed space-y-6 mb-10">
              <p>
                CopyWorx Studio™ is currently in closed beta. We&apos;re carefully selecting marketing professionals and copywriters to test the platform and help shape its future.
              </p>
              
              <p>
                Request access below and tell us why you want in. We review every application and send invites to approved beta testers.
              </p>
              
              <p className="bg-gradient-to-r from-[#006EE6] to-[#A755F7] bg-clip-text text-transparent font-semibold text-xl md:text-2xl">
                Now let&apos;s get to worx!
              </p>
            </div>
            
            {/* CTA Button */}
            <Button 
              size="xl" 
              className="bg-gradient-to-r from-[#006EE6] to-[#A755F7] text-white hover:opacity-90 font-semibold text-lg px-10 py-6 h-auto shadow-2xl transition-all duration-300"
              asChild
            >
              <a href="https://tally.so/r/Xx4yxV">
                Request Beta Access
                <ArrowRight className="ml-2 h-5 w-5" />
              </a>
            </Button>
          </div>
        </div>
      </section>

    </div>
  );
}
