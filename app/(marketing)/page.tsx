/**
 * @file app/(marketing)/page.tsx
 * @description CopyWorx Studio™ landing page - professional marketing homepage
 * 
 * Sections:
 * - Hero with solid gray background and primary CTA
 * - The Challenge - problem statement
 * - The Story - founder narrative with gradient background
 * - Product Showcase - alternating screenshot/text blocks
 * - Video - Streamable embed
 * - Final CTA section
 */

import Image from 'next/image';
import Link from 'next/link';
import { ArrowRight, Check } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import { SubscribeButton } from '@/components/marketing/SubscribeButton';

/**
 * Product showcase blocks – alternating screenshot/text layout.
 * imagePosition controls which side the screenshot appears on (desktop).
 */
const showcaseBlocks = [
  {
    screenshot: '/images/guide/03-workspace-three-column-layout.png',
    alt: 'CopyWorx Studio three-column workspace layout',
    headline: "A Copywriter's Workspace – Not a Chat Window",
    body: "CopyWorx Studio™ gives you a real writing environment – organized projects on the left, a professional editor in the center, and AI-powered tools on the right. Everything a copywriter needs, exactly where you'd expect to find it.",
    imagePosition: 'left' as const,
  },
  {
    screenshot: '/images/guide/11-templates-browser-categories.png',
    alt: 'CopyWorx Studio template browser with categories',
    headline: '15 Professional Templates. Zero Prompt Engineering.',
    body: "Every template is built around real copywriting frameworks – the same ones experienced copywriters use on every project. Choose your template, answer the guided questions, and generate copy that's strategically sound from the first draft.",
    imagePosition: 'right' as const,
  },
  {
    screenshot: '/images/guide/12-sales-email-form-completed.png',
    alt: 'Sales email template form with completed fields',
    headline: 'Answer a Few Guided Questions. Get Professional Copy.',
    body: "No blank prompts. No guessing what to type. Each template walks you through exactly what the AI needs to produce strong copy – product details, audience, pain points, tone. Fill in the fields, click Generate, and get results you can actually use.",
    imagePosition: 'left' as const,
  },
  {
    screenshot: '/images/guide/08-copy-optimizer-tone-shifter.png',
    alt: 'Copy optimizer tone shifter tool showing six professional tones',
    headline: 'Rewrite Any Copy in Six Professional Tones – In Seconds.',
    body: "The Tone Shifter rewrites your selected copy as Professional, Casual, Urgent, Friendly, Techy, or Playful – without losing the core message. Adapt any piece of copy for a different audience or channel in one click.",
    imagePosition: 'right' as const,
  },
  {
    screenshot: '/images/guide/28-brand-voice-fields-filled.png',
    alt: 'Brand voice configuration with all fields filled in',
    headline: "Define Your Brand's Voice Once. Every Piece of Copy Follows It.",
    body: "Set up your brand's tone, approved phrases, forbidden words, and values. Then apply it to any template – the AI writes in your brand's voice from the first draft. No more off-brand copy. No more starting over for every project.",
    imagePosition: 'left' as const,
  },
  {
    screenshot: '/images/guide/36-brand-check-alignment-score.png',
    alt: 'Brand Check analysis with a strong alignment score, matching phrases, and actionable recommendations',
    headline: 'Diagnose Off-Brand Copy. Fix It in One Click.',
    body: "Brand Check scores any copy against your Brand Voice, flags exactly where it misses – forbidden words, tone mismatches, missed opportunities – and gives you a one-click rewrite that preserves your formatting and fixes the issues. No more subjective \"this doesn't feel on brand\" feedback cycles. Just diagnosis, recommendation, and repair.",
    imagePosition: 'right' as const,
  },
  {
    screenshot: '/images/guide/37-persona-check-audience-alignment.png',
    alt: 'Persona Check showing a Strongly Aligned analysis against Sarah Donovan persona with pain points addressed and missed',
    headline: 'Check Copy Against Any Audience. Rewrite for That Person.',
    body: "Persona Check analyzes your copy against any persona you've built – pain points addressed, language patterns, emotional territory – and rewrites it to speak directly to that specific audience. Different persona, different rewrite. Same brand voice, different audience fit.",
    imagePosition: 'left' as const,
  },
  {
    screenshot: '/images/guide/word-advisor-screenshot.png',
    alt: 'MY WORD ADVISOR showing alternative word suggestions with copywriting rationales',
    headline: "Find the Right Word. Know Why It's Right.",
    body: 'Highlight any word in your copy and MY WORD ADVISOR gives you smarter alternatives \u2013 with real copywriting rationale behind each one. It\'s not a thesaurus. It tells you why "proven" hits harder than "innovative" when you\'re writing for CFOs, and which words align with your Brand Voice and Persona. One click and the new word drops right into your document.',
    imagePosition: 'right' as const,
  },
  {
    screenshot: '/images/guide/Version-Control-2.png',
    alt: 'Side-by-side version comparison showing word-level changes between two document versions',
    headline: 'Compare Any Two Versions. See Exactly What Changed.',
    body: "Every document in CopyWorx Studio\u2122 supports built-in version control \u2013 v1, v2, v3, as many as you need. Click Compare Versions and the editor splits into two side-by-side panes with word-level highlighting showing exactly what was added, removed, or rewritten. No more playing spot-the-difference across tabs. Perfect for client revisions, A/B testing copy approaches, or simply tracking how a piece evolved.",
    imagePosition: 'left' as const,
  },
  {
    screenshot: '/images/guide/competitive-analysis-screenshot.png',
    alt: 'Competitive Analysis tool showing strategic teardown of competitor copy',
    headline: "Tear Down Your Competitor's Copy. Find Your Edge.",
    body: "Paste any competitor's copy into Competitive Analysis and get a strategic teardown \u2013 messaging strategy, strengths, weaknesses, and specific opportunities for you to differentiate. It's the competitive intelligence tool that turns someone else's copy into your advantage.",
    imagePosition: 'right' as const,
  },
] as const;

/**
 * Feature bullets displayed inside the homepage Pricing card.
 * Single source of truth for the marketing site (the standalone /pricing
 * page has been retired; this card is now the only pricing surface).
 */
const PRICING_FEATURES = [
  'Brand Voice creation and copy rewriting',
  'Persona creation and copy rewriting',
  '15 professional copywriting templates',
  'Tone Shifter – six professional tones',
  'My Word Advisor thesaurus',
  'Compare versions side-by-side',
  'Strategic Competitive Analysis tool',
  'Unlimited projects and documents',
  'Priority email support',
  'New features as they ship',
] as const;

/**
 * FAQ items for the homepage. Trust + product-differentiation questions.
 * Each answer renders inside a shadcn Accordion item.
 * Em dashes (—) and the ™ character are intentional and should render literally.
 */
const FAQ_ITEMS = [
  {
    question: 'How Does CopyWorx Studio™ Differ From ChatGPT Or Other AI Platforms?',
    answer:
      "ChatGPT and other AI platforms are great at general assistance. CopyWorx Studio™ is a copywriting worxspace. We've built everything around proven copywriting frameworks – not blank prompts – so the tools guide you toward copy that actually performs. You create your Brand Voices and Personas once, then every template, rewrite, and tone shift can be checked and rewritten around a particular Brand Voice or Persona. That's the critical CopyWorx Studio™ difference: structure and methodology built by a copywriter, not a generic AI doing its best to guess what you want.",
  },
  {
    question: 'How Does CopyWorx Studio™ Differ From Writing Platforms Like Copy.ai, Jasper, And Writesonic?',
    answer:
      'Those tools are built for speed and volume – generate as much content as possible, as fast as possible. CopyWorx Studio™ is built for strategic writing. Every template is grounded in proven copywriting frameworks, every output can be run through Brand Voice and Persona checks, and every rewrite is structured around the experienced decisions a real copywriter makes. The result isn\'t "more copy" – it\'s copy that actually performs. If you need to produce 200 generic blog posts a month, those tools are great. If you need copy that sounds like your brand and converts prospects like a pro wrote it, that\'s what we built.',
  },
  {
    question: 'Who Owns The Copy I Generate? Can I Use It Commercially?',
    answer:
      "You do. Anything you create in CopyWorx Studio™ is yours to use however you want – in ads, on your website, in emails, in client work, anywhere. We don't claim any ownership over your output. That's true whether you're a solo copywriter writing for clients or a marketing team writing for your own brand.",
  },
  {
    question: 'Is My Brand Data And Content Used To Train AI Models?',
    answer:
      "No. Your brand voice settings, the documents you create, and the content you put into CopyWorx Studio™ are not used to train any AI model – ours, or anyone else's. We use the Anthropic API under Commercial Terms of Service that explicitly prohibit training on customer content. Your brand voice, documents, and prompts stay yours – they're never used to improve any AI model, ours or Anthropic's.",
  },
  {
    question: 'Do You Require A Credit Card For The Free Trial?',
    answer:
      "Yes – and we think that's actually fair to both sides. Asking for a card upfront means the people trying CopyWorx Studio™ are serious about evaluating it, which lets us focus support and product attention where it matters. We never charge during your 7-day trial, and we'll send you a reminder two days before it ends. Cancel anytime in those 7 days and you'll never see a charge.",
  },
  {
    question: 'What Happens When My Trial Ends? Will I Be Charged Automatically?',
    answer:
      "If you don't cancel during the 7-day trial, your subscription starts at $39/month on day 8. We send a reminder email two days before that happens, so there are no surprises. You can cancel anytime from your account settings – before or after the trial ends.",
  },
  {
    question: 'Can I Cancel Anytime?',
    answer:
      "Yes. Cancel from your account settings anytime – we won't bury the button or make you call us. If CopyWorx Studio™ isn't working for you, we'd rather you go than make you stay. We'd also love to know why – but that's a request, not a requirement.",
  },
  {
    question: 'What Payment Methods Do You Accept?',
    answer:
      'We accept all major credit and debit cards (Visa, Mastercard, American Express, and Discover) through Stripe, our secure payment processor. Your card information is never stored on our servers.',
  },
  {
    question: 'Do You Offer Annual Billing?',
    answer:
      "Not yet – but it's on the roadmap. For now, CopyWorx Studio™ is monthly subscription only. We'll notify subscribers when annual plans are available.",
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
              The first AI-powered copywriting platform created by a professional copywriter for copywriters, content creators, and marketers.
            </p>
            
            {/* Primary CTA */}
            <div className="animate-fade-in animation-delay-300">
              <Button 
                size="xl" 
                className="bg-gradient-to-r from-[#006EE6] to-[#A755F7] text-white hover:opacity-90 font-semibold text-lg px-10 py-6 h-auto shadow-2xl transition-all duration-300"
                asChild
              >
                <Link href="/#pricing">
                  Start Your 7-Day Free Trial
                  <ArrowRight className="ml-2 h-5 w-5" />
                </Link>
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
              Writing Great Copy Just Got Easy
            </h2>
            
            <div className="prose prose-lg md:prose-xl max-w-none text-ink-600 leading-relaxed space-y-6">
              <p>
                You&apos;re juggling multiple clients and campaigns. Each one has its own brand voice, its own audience, its own expectations. Staying consistent is everything.
              </p>
              
              <p>
                Traditional writing tools don&apos;t understand your brand. AI tools generate copy that sounds like everyone else&apos;s. And the handful that claim to learn your voice can&apos;t actually diagnose when you&apos;ve drifted off it, let alone fix it.
              </p>
              
              <p>
                But now you can generate copy that&apos;s on brand, diagnose what&apos;s off, and rewrite it to fix. All in one tool. That&apos;s what makes CopyWorx Studio™ the strategic writer&apos;s worxspace.
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
                CopyWorx Studio™ leverages proven, time-tested copywriting tools and combines them with the power of AI to create a platform any marketing professional can use – regardless of writing experience – to create professional, high-converting copy in minutes.
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
                Start with a Brand Voice, start with a Persona, start with a template, or start on your own. The point is, it&apos;s easy to get started with real workflow-aware functionality.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ========================================================================
          PRODUCT SHOWCASE SECTION
          Alternating screenshot + text blocks showcasing key features
          ======================================================================== */}
      <section id="features" className="scroll-mt-24 py-24 md:py-32 bg-white">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          {/* Section Header */}
          <div className="max-w-3xl mx-auto text-center mb-20 md:mb-28">
            <p className="text-sm font-semibold tracking-widest uppercase text-ink-500 mb-4">
              Features
            </p>
            <h2 className="font-sans text-3xl sm:text-4xl md:text-5xl font-bold text-ink-900 mb-6">
              See What&apos;s Inside
            </h2>
            <p className="text-lg md:text-xl text-ink-600 leading-relaxed">
              Professional copywriting tools that work the way you work.
            </p>
          </div>

          {/* Showcase Blocks */}
          <div className="max-w-6xl mx-auto space-y-20 lg:space-y-28">
            {showcaseBlocks.map((block) => (
              <div
                key={block.headline}
                className={`flex flex-col ${
                  block.imagePosition === 'left' ? 'lg:flex-row' : 'lg:flex-row-reverse'
                } items-center gap-10 lg:gap-16`}
              >
                {/* Screenshot with browser chrome frame */}
                <div className="w-full lg:w-[58%] flex-shrink-0">
                  <div className="rounded-xl shadow-lg overflow-hidden border border-gray-200/80">
                    <div className="bg-gray-100 px-4 py-2.5 flex items-center border-b border-gray-200/80">
                      <div className="flex gap-1.5">
                        <div className="w-2.5 h-2.5 rounded-full bg-gray-300" />
                        <div className="w-2.5 h-2.5 rounded-full bg-gray-300" />
                        <div className="w-2.5 h-2.5 rounded-full bg-gray-300" />
                      </div>
                    </div>
                    <div className="aspect-[1200/750] w-full">
                      <Image
                        src={block.screenshot}
                        alt={block.alt}
                        width={1200}
                        height={750}
                        className="w-full h-full object-cover"
                      />
                    </div>
                  </div>
                </div>

                {/* Text content */}
                <div className="w-full lg:w-[42%]">
                  <h3 className="font-sans text-2xl md:text-[28px] font-bold text-ink-900 leading-tight mb-4">
                    {block.headline}
                  </h3>
                  <p className="text-base md:text-lg text-ink-600 leading-relaxed">
                    {block.body}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ========================================================================
          VIDEO SECTION
          Streamable video embed with responsive container
          ======================================================================== */}
      <section id="demo" className="scroll-mt-24 py-24 md:py-32 bg-[#F5F5F7]">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          {/* Section Header */}
          <div className="max-w-3xl mx-auto text-center mb-16">
            <p className="text-sm font-semibold tracking-widest uppercase text-ink-500 mb-4">
              Demo
            </p>
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
          FAQ SECTION
          Trust + product-differentiation questions in a shadcn Accordion.
          Sits between the gray Demo section and the gradient final CTA;
          uses bg-white to maintain the alternating section rhythm.
          ======================================================================== */}
      <section id="faq" className="scroll-mt-24 py-24 md:py-32 bg-white">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          {/* Section Header */}
          <div className="max-w-3xl mx-auto text-center mb-16">
            <p className="text-sm font-semibold tracking-widest uppercase text-ink-500 mb-4">
              FAQ
            </p>
            <h2 className="font-sans text-3xl sm:text-4xl md:text-5xl font-bold text-ink-900 mb-6">
              Frequently Asked Questions
            </h2>
            <p className="text-lg md:text-xl text-ink-600 leading-relaxed">
              Everything you need to know before you start your trial.
            </p>
          </div>

          {/* Accordion list */}
          <div className="max-w-3xl mx-auto">
            <Accordion type="multiple" className="w-full">
              {FAQ_ITEMS.map((item, index) => (
                <AccordionItem key={item.question} value={`item-${index}`}>
                  <AccordionTrigger className="text-left text-base md:text-lg font-semibold text-ink-900 hover:no-underline py-5">
                    {item.question}
                  </AccordionTrigger>
                  <AccordionContent className="text-base text-ink-600 leading-relaxed pb-5">
                    {item.answer}
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>

            <p className="text-base text-ink-500 text-center mt-12">
              Still have questions? Email us at{' '}
              <a
                href="mailto:support@copyworx.io"
                className="text-[#006EE6] hover:underline"
              >
                support@copyworx.io
              </a>
              .
            </p>
          </div>
        </div>
      </section>

      {/* ========================================================================
          PRICING SECTION
          Single $39/month plan with 7-day free trial. This card is the only
          pricing surface on the marketing site — the standalone /pricing
          route was retired and now redirects here. Sits between the white
          FAQ section and the gradient final CTA; bg-[#F5F5F7] keeps the
          alternating section rhythm intact.
          ======================================================================== */}
      <section id="pricing" className="scroll-mt-24 py-24 md:py-32 bg-[#F5F5F7]">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          {/* Section Header */}
          <div className="max-w-3xl mx-auto text-center mb-16">
            <p className="text-sm font-semibold tracking-widest uppercase text-ink-500 mb-4">
              Pricing
            </p>
            <h2 className="font-sans text-3xl sm:text-4xl md:text-5xl font-bold text-ink-900 mb-6">
              One Plan. Everything Included.
            </h2>
            <p className="text-lg md:text-xl text-ink-600 leading-relaxed">
              No tiers, no limits, no surprises. Try every feature free for 7 days, then $39/month.
            </p>
          </div>

          {/* Pricing Card */}
          <div className="max-w-[420px] mx-auto">
            <Card className="relative border-[#006EE6]/40 shadow-xl">
              <div className="absolute -top-4 left-1/2 -translate-x-1/2 bg-white rounded-full px-0.5">
                <Badge variant="brand" className="shadow-lg">
                  7-Day Free Trial
                </Badge>
              </div>

              <CardHeader className="pb-3 pt-6 text-center">
                <CardTitle className="font-sans text-2xl">
                  CopyWorx Studio™
                </CardTitle>
                <CardDescription>
                  Professional AI Copywriting Worxspace
                </CardDescription>
              </CardHeader>

              <CardContent>
                {/* Price */}
                <div className="mb-5 text-center">
                  <span className="font-sans text-6xl font-bold text-ink-900">
                    $39
                  </span>
                  <span className="text-ink-500 ml-2 text-lg">/month</span>
                  <p className="text-sm text-ink-500 mt-2">
                    Start with a 7-day free trial. Cancel anytime.
                  </p>
                </div>

                {/* Features */}
                <ul className="space-y-2">
                  {PRICING_FEATURES.map((feature) => (
                    <li key={feature} className="flex items-start gap-3">
                      <Check className="h-5 w-5 text-[#006EE6] shrink-0 mt-0.5" />
                      <span className="text-sm text-ink-700">{feature}</span>
                    </li>
                  ))}
                </ul>
              </CardContent>

              <CardFooter className="pt-2">
                <SubscribeButton />
              </CardFooter>
            </Card>
          </div>
        </div>
      </section>

      {/* ========================================================================
          FINAL CTA SECTION
          Gradient background matching "Built By A Copywriter" section
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
          <div className="max-w-3xl mx-auto text-center">
            <h2 className="font-sans text-3xl sm:text-4xl md:text-5xl font-bold text-white mb-6">
              Ready To Write To Win?
            </h2>
            
            <div className="text-lg md:text-xl text-white/90 leading-relaxed space-y-6 mb-10">
              <p>
                CopyWorx Studio™ is now available to marketing professionals and copywriters. Get full access to every AI copywriting tool with a 7-day free trial.
              </p>
              
              <p>
                Start your free trial today and experience every feature CopyWorx Studio™ has to offer. No commitment – cancel anytime.
              </p>
              
              <p className="text-white font-semibold text-xl md:text-2xl">
                Now let&apos;s get to worx!
              </p>
            </div>
            
            {/* CTA Button – white bg with bold blue text */}
            <Button 
              size="xl" 
              className="bg-white text-[#006EE6] hover:bg-white hover:shadow-[0_0_24px_rgba(255,255,255,0.45)] font-bold text-lg px-10 py-6 h-auto shadow-xl transition-all duration-300"
              asChild
            >
              <Link href="/#pricing">
                Start Your 7-Day Free Trial
                <ArrowRight className="ml-2 h-5 w-5" />
              </Link>
            </Button>
          </div>
        </div>
      </section>

    </div>
  );
}
