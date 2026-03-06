/**
 * @file app/(app)/worxspace/guide/page.tsx
 * @description Full user guide for CopyWorx Studio™
 *
 * Two-panel layout: sticky section nav (left) + main scrollable content (right).
 * Active section is tracked via IntersectionObserver.
 *
 * Callout styles:
 *   PRO TIP  – blue left border, light blue background
 *   NOTE     – amber left border, light amber background
 *
 * Images use Next.js <Image> with lazy loading. All screenshots live in
 * /public/images/guide/ and are served as static assets.
 */

'use client';

import { useState, useEffect, useCallback } from 'react';
import Image from 'next/image';
import {
  Rocket,
  Wand2,
  FileText,
  Palette,
  Users,
  FolderOpen,
  CreditCard,
  Menu,
  X,
} from 'lucide-react';
import { cn } from '@/lib/utils';

// ─── Section registry ─────────────────────────────────────────────────────────

const SECTIONS = [
  { id: 'getting-started',    icon: Rocket,     label: 'Getting Started' },
  { id: 'copy-optimizer',     icon: Wand2,      label: 'Copy Optimizer Suite' },
  { id: 'templates',          icon: FileText,   label: 'AI@Worx Templates' },
  { id: 'brand-voice',        icon: Palette,    label: 'Brand Voice' },
  { id: 'personas',           icon: Users,      label: 'Personas' },
  { id: 'projects-documents', icon: FolderOpen, label: 'Projects & Documents' },
  { id: 'account-billing',    icon: CreditCard, label: 'Account & Billing' },
] as const;

type SectionId = (typeof SECTIONS)[number]['id'];

// ─── Callout sub-components ───────────────────────────────────────────────────

/**
 * PRO TIP callout – blue left border with light blue background.
 */
function ProTip({ children }: { children: React.ReactNode }) {
  return (
    <div className="my-5 flex gap-3 rounded-r-xl border-l-4 border-[#006EE6] bg-[#006EE6]/[0.06] px-4 py-3.5">
      <span className="mt-0.5 shrink-0 select-none text-[#006EE6]">✦</span>
      <div>
        <p className="mb-1 text-[10px] font-bold uppercase tracking-widest text-[#006EE6]">
          Pro Tip
        </p>
        <p className="text-sm text-ink-700 leading-relaxed">{children}</p>
      </div>
    </div>
  );
}

/**
 * NOTE callout – amber left border with light amber background.
 */
function Note({ children }: { children: React.ReactNode }) {
  return (
    <div className="my-5 flex gap-3 rounded-r-xl border-l-4 border-amber-400 bg-amber-50 px-4 py-3.5">
      <span className="mt-0.5 shrink-0 select-none text-amber-500">★</span>
      <div>
        <p className="mb-1 text-[10px] font-bold uppercase tracking-widest text-amber-700">
          Note
        </p>
        <p className="text-sm text-amber-900 leading-relaxed">{children}</p>
      </div>
    </div>
  );
}

/**
 * Screenshot with caption, responsive width, rounded corners, and subtle shadow.
 * size="half" constrains the image to ~50% width, centered – good for narrow screenshots.
 */
function GuideImage({
  src,
  alt,
  caption,
  size = 'full',
}: {
  src: string;
  alt: string;
  caption: string;
  size?: 'full' | 'half';
}) {
  return (
    <figure className="my-7">
      <div className={size === 'half' ? 'max-w-xs mx-auto' : undefined}>
        <div className="overflow-hidden rounded-xl border border-ink-200 bg-ink-50 shadow-sm">
          <Image
            src={src}
            alt={alt}
            width={1400}
            height={900}
            className="w-full h-auto"
            loading="lazy"
          />
        </div>
      </div>
      <figcaption className="mt-2 text-center text-xs text-ink-400 italic">{caption}</figcaption>
    </figure>
  );
}

// ─── Section 1: Getting Started ───────────────────────────────────────────────

function SectionGettingStarted() {
  return (
    <section id="getting-started" className="guide-section scroll-mt-6">
      <h2>Getting Started</h2>

      <h3>Signing In</h3>
      <p>
        CopyWorx Studio™ uses Clerk for secure authentication. Go to copyworx.io, click Sign In,
        and log in with your email and password or a social login option (such as Google). Once
        authenticated, you&apos;ll land directly in the CopyWorx Studio™ Workspace.
      </p>
      <GuideImage
        src="/images/guide/02-clerk-authentication-login.png"
        alt="CopyWorx Studio™ sign-in page"
        caption="CopyWorx Studio™ sign-in page"
      />

      <h3>The Workspace at a Glance</h3>
      <p>The CopyWorx Studio™ workspace is organized into three columns:</p>
      <ul>
        <li>
          <strong>Left Panel</strong> – Your navigation hub. This is where you access Projects,
          Folders, Documents, Brand Voices, and Personas.
        </li>
        <li>
          <strong>Center Editor</strong> – The main writing area, powered by the TipTap rich-text
          editor. All your copy lives here.
        </li>
        <li>
          <strong>Right Sidebar (AI@Worx ToolBox)</strong> – Houses all AI tools: Templates, Copy
          Optimizer tools, Brand Alignment, and Insights.
        </li>
      </ul>
      <GuideImage
        src="/images/guide/03-workspace-three-column-layout.png"
        alt="The three-column workspace layout"
        caption="The three-column workspace layout"
      />

      <h3>Creating Your First Project</h3>
      <p>
        Everything in CopyWorx Studio™ is organized within Projects. Think of a Project as a
        container for a client, brand, or campaign. All documents, Brand Voices, and Personas
        associated with that work live inside the Project.
      </p>
      <ol>
        <li>In the Left Panel, click the <strong>New (+)</strong> button in the menu bar.</li>
        <li>Select <strong>New Project</strong> from the dropdown.</li>
        <li>
          Give your project a name (e.g., &quot;Acme Corp Q3 Campaign&quot; or
          &quot;My Agency – Client Name&quot;).
        </li>
        <li>Your new project appears in the Left Panel and becomes your active workspace.</li>
      </ol>
      <ProTip>
        Create a separate Project for each client or major campaign. This keeps your Brand Voices,
        Personas, and Documents organized and prevents cross-contamination between clients.
      </ProTip>
      <GuideImage
        src="/images/guide/04-my-projects-new-document-button.png"
        alt="Creating a new project in the Left Panel"
        caption="Creating a new project in the Left Panel"
      />

      <h3>Creating Documents and Folders</h3>
      <p>
        Inside each Project, you can create Folders and Documents to organize your work however
        makes sense for your workflow.
      </p>
      <ul>
        <li>
          <strong>To create a document:</strong> With a Project selected, click{' '}
          <strong>New (+)</strong> &rarr; <strong>New Document</strong> &rarr; give it a title.
          The new document opens automatically in the Editor.
        </li>
        <li>
          <strong>To create a folder:</strong> Click <strong>New (+)</strong> &rarr;{' '}
          <strong>New Folder</strong> &rarr; name the folder and press Enter. Drag documents into
          the folder to organize them, or create new documents directly within a folder.
        </li>
      </ul>
      <GuideImage
        src="/images/guide/05-project-tree-folders-documents.png"
        alt="Project tree with folders and documents"
        caption="Project tree with folders and documents"
      />

      <h3>The Editor</h3>
      <p>
        The Editor is the heart of CopyWorx Studio™ – a professional rich-text editor where you
        write, refine, and perfect your copy. All content generated by AI tools is delivered
        directly into the Editor, where you can edit it freely.
      </p>
      <p>
        The Editor toolbar gives you full control over formatting: Bold, Italic, Underline,
        Headings (H1–H3), Ordered and Unordered Lists, Block Quotes, Undo/Redo, and text
        alignment controls.
      </p>
      <GuideImage
        src="/images/guide/06-editor-rewrite-for-channel.png"
        alt="The Editor with Rewrite for Channel open"
        caption="The Editor with Rewrite for Channel open"
      />

      <h3>Saving Your Work</h3>
      <p>
        CopyWorx Studio™ auto-saves your documents continuously to Supabase cloud storage. Your
        work syncs across devices – start on a laptop and pick up on another machine without
        losing anything. There is no manual save required.
      </p>
      <Note>
        Auto-save happens continuously as you type. If you see a status indicator next to the
        document title, it shows the current save state.
      </Note>

      <h3>Working With AI-Generated Content</h3>
      <p>
        When you generate copy using any AI@Worx tool or Template, the content appears in the
        Editor. From there:
      </p>
      <ul>
        <li>
          Edit freely – the AI output is just a starting point. Rewrite, cut, or expand as needed.
        </li>
        <li>
          Select specific text and run it through Copy Optimizer tools to refine tone, length, or
          channel fit.
        </li>
        <li>Use Brand Alignment to score the content against your Brand Voice guidelines.</li>
        <li>Run Headline Generator on any headline in the document to generate alternatives.</li>
      </ul>
      <GuideImage
        src="/images/guide/07-editor-shorten-copy-optimizer.png"
        alt="Refining copy with the Shorten tool"
        caption="Refining copy with the Shorten tool"
      />
    </section>
  );
}

// ─── Section 2: Copy Optimizer Suite ─────────────────────────────────────────

function SectionCopyOptimizer() {
  return (
    <section id="copy-optimizer" className="guide-section scroll-mt-6">
      <h2>Copy Optimizer Suite</h2>

      <h3>Overview</h3>
      <p>
        The Copy Optimizer Suite is a set of precision tools for refining copy you&apos;ve already
        written – or copy generated by AI@Worx Templates. Unlike Templates, which generate copy
        from scratch, the Optimizer tools work on selected text in the Editor and apply a specific
        transformation.
      </p>
      <p><strong>To use any Copy Optimizer tool:</strong></p>
      <ol>
        <li>Write or generate copy in the Editor.</li>
        <li>Select the specific text you want to optimize.</li>
        <li>Open the AI@Worx ToolBox in the Right Sidebar.</li>
        <li>Choose the appropriate Optimizer tool.</li>
        <li>Set any options (tone, channel, etc.) and click to run the tool.</li>
        <li>Review the result and accept it into the Editor.</li>
      </ol>
      <GuideImage
        src="/images/guide/08-copy-optimizer-tone-shifter.png"
        alt="The Tone Shifter tool in the AI@Worx ToolBox"
        caption="The Tone Shifter tool in the AI@Worx ToolBox"
      />

      <h3>Tone Shifter</h3>
      <p>
        Tone Shifter rewrites your selected copy in a different professional tone while preserving
        the core message. This is ideal when you need to adapt copy for a different context,
        audience, or channel without losing the substance.
      </p>
      <p><strong>Available tones:</strong></p>
      <ul>
        <li>
          <strong>Professional</strong> – Polished, authoritative, and business-appropriate.
          Removes informality and tightens structure.
        </li>
        <li>
          <strong>Casual</strong> – Conversational and approachable. Reads like a human talking,
          not a marketing department.
        </li>
        <li>
          <strong>Urgent</strong> – Creates a sense of time-sensitivity and action. Useful for
          limited-time offers and calls to action.
        </li>
        <li>
          <strong>Friendly</strong> – Warm, personal, and welcoming. Great for onboarding copy,
          customer communications, and relationship-building content.
        </li>
        <li>
          <strong>Techy</strong> – Technical, precise, and knowledgeable. Appropriate for
          software, SaaS, and technically sophisticated audiences.
        </li>
        <li>
          <strong>Playful</strong> – Light, energetic, and fun. Adds personality and levity to
          content that can afford to be less serious.
        </li>
      </ul>

      <h3>Expand</h3>
      <p>
        Expand intelligently lengthens your selected copy – adding supporting detail, elaborating
        on benefits, deepening the argument, or developing the narrative. It adds content without
        repeating what&apos;s already there.
      </p>
      <p><strong>Use Expand when:</strong></p>
      <ul>
        <li>A key point feels underdeveloped.</li>
        <li>You need a longer word count for a specific placement.</li>
        <li>You want the AI to add supporting proof points or examples to a claim.</li>
      </ul>
      <GuideImage
        src="/images/guide/09-copy-optimizer-expand.png"
        alt="The Expand tool with My Insights panel"
        caption="The Expand tool with My Insights panel"
      />

      <h3>Shorten</h3>
      <p>
        Shorten distills your selected copy to its essential message – removing redundancy,
        tightening structure, and cutting words without cutting meaning. The result is sharper,
        more impactful copy that respects the reader&apos;s time.
      </p>
      <p><strong>Use Shorten when:</strong></p>
      <ul>
        <li>Copy is exceeding a character or word count limit.</li>
        <li>The original reads as wordy or padded.</li>
        <li>
          You need a shorter version for a different format (e.g., a long email paragraph condensed
          for an ad).
        </li>
      </ul>

      <h3>Rewrite for Channel</h3>
      <p>
        Rewrite for Channel takes your existing copy and restructures it to perform optimally on a
        specific marketing channel. Each channel has different conventions, character constraints,
        audience expectations, and content norms – this tool handles all of that automatically.
      </p>
      <p><strong>Available channels:</strong></p>
      <ul>
        <li>
          <strong>LinkedIn</strong> – Professional tone, thought-leadership framing, paragraph
          breaks, and hooks appropriate for the LinkedIn feed.
        </li>
        <li>
          <strong>X (Twitter)</strong> – Tight, punchy, under 280 characters. Conversational and
          direct.
        </li>
        <li>
          <strong>Instagram</strong> – Visual-first framing, lifestyle-oriented language,
          hashtag-ready structure.
        </li>
        <li>
          <strong>Facebook</strong> – Slightly longer format, community-oriented tone, encourages
          engagement.
        </li>
        <li>
          <strong>Email</strong> – Subject line + preview text + body structure. Optimized for
          inbox delivery and open rates.
        </li>
        <li>
          <strong>Blog Post</strong> – Repurposes any copy into a fully formatted blog post with
          headers, adjusted tone, and a strong close.
        </li>
      </ul>

      <h3>Headline Generator</h3>
      <p>
        The Headline Generator produces multiple headline variations for the copy in your Editor.
        Headlines are the highest-leverage element of any piece of copy – they determine whether
        the rest gets read.
      </p>
      <p>
        This tool gives you options across different strategic approaches – curiosity-based,
        benefit-driven, problem-focused, and more – so you&apos;re comparing genuinely different
        angles, not five variations of the same idea.
      </p>
      <ProTip>
        Run the Headline Generator after your copy is complete, not before. Headlines work best
        when they accurately reflect the promise the body copy delivers on.
      </ProTip>
      <GuideImage
        src="/images/guide/10-headline-generator-results.png"
        alt="Headline Generator ready to produce 15 variations"
        caption="Headline Generator ready to produce 15 variations"
        size="half"
      />
    </section>
  );
}

// ─── Section 3: AI@Worx Templates ────────────────────────────────────────────

function SectionTemplates() {
  return (
    <section id="templates" className="guide-section scroll-mt-6">
      <h2>AI@Worx Templates</h2>

      <h3>Overview</h3>
      <p>
        AI@Worx Templates are structured professional copywriting frameworks. Each template is
        built around the way experienced copywriters actually approach a specific type of copy –
        not a blank prompt, but a series of focused questions that guide the AI to produce
        professional output.
      </p>
      <p>
        CopyWorx Studio™ currently offers 15 templates across 6 categories. To access the
        Templates browser:
      </p>
      <ul>
        <li>Click the <strong>AI@Worx Templates</strong> button in the Right Sidebar.</li>
        <li>
          Or click the <strong>New (+)</strong> button in the menu bar and select{' '}
          <strong>New from Template</strong>.
        </li>
      </ul>
      <GuideImage
        src="/images/guide/11-templates-browser-categories.png"
        alt="The Templates browser with all categories"
        caption="The Templates browser with all categories"
      />

      <h3>How to Use Any Template</h3>
      <ol>
        <li>
          Open the Templates browser from the home page or by clicking on the AI@Worx slide-out
          panel in the Left Sidebar.
        </li>
        <li>Browse by category or scroll through all templates.</li>
        <li>
          Click a template card to select it – the template form opens in the Right Sidebar.
        </li>
        <li>
          Fill in the required fields. The more specific and detailed your answers, the better the
          output.
        </li>
        <li>
          Optionally select a <strong>Brand Voice</strong> and/or <strong>Persona</strong> to
          apply.
        </li>
        <li>
          Click <strong>Generate</strong>. AI@Worx produces your copy and delivers it to the
          Editor.
        </li>
        <li>Review, refine, and use the Copy Optimizer tools to polish the result.</li>
      </ol>
      <ProTip>
        Template complexity badges (Beginner, Intermediate, Advanced) indicate how many inputs are
        required and how nuanced the output will be. Start with Intermediate templates – they offer
        the best balance of guidance and quality output.
      </ProTip>
      <GuideImage
        src="/images/guide/12-sales-email-form-completed.png"
        alt="A completed template form ready to generate"
        caption="A completed template form ready to generate"
      />

      <h3>Strategy &amp; Foundations</h3>
      <p>
        These templates are the strategic foundation of your copywriting work. Complete these
        before creating individual ad or email copy to ensure everything is aligned.
      </p>

      <h4>Brand Messaging Framework</h4>
      <p>
        Build the core messaging architecture for a brand – the foundational statements that all
        other copy is derived from. This includes your positioning statement, value proposition,
        key differentiators, and core proof points.
      </p>
      <GuideImage
        src="/images/guide/13-brand-messaging-framework-form.png"
        alt="Brand Messaging Framework template form"
        caption="Brand Messaging Framework template form"
      />

      <h4>Product Launch Campaign Framework</h4>
      <p>
        Plan and structure the copy strategy for a product launch. This template builds the
        campaign narrative, identifies key audience segments and their hot buttons, defines the
        launch arc, and generates the copy themes that will drive every touchpoint from pre-launch
        through post-launch.
      </p>
      <ProTip>
        Complete the Brand Messaging Framework before running a Product Launch Campaign template.
        The launch framework is more powerful when it&apos;s anchored to a solid messaging
        foundation.
      </ProTip>
      <GuideImage
        src="/images/guide/14-product-launch-campaign-form.png"
        alt="Product Launch Campaign Framework template form"
        caption="Product Launch Campaign Framework template form"
      />

      <h3>Email</h3>

      <h4>Sales Email</h4>
      <p>
        Generate a persuasive cold outreach or sales email that addresses pain points, presents
        your solution, and drives a specific action.
      </p>
      <GuideImage
        src="/images/guide/15-sales-email-template-form.png"
        alt="Sales Email template form"
        caption="Sales Email template form"
      />

      <h4>Email Sequence (Kickoff)</h4>
      <p>
        Generate a complete multi-email nurture sequence – not just one email, but a connected
        series with a narrative arc that moves the reader from awareness to action. This is one of
        CopyWorx Studio™&apos;s most powerful templates. The Email Sequence template produces a
        set of sequenced emails including subject lines, preview text, body copy, and CTAs, each
        building on the previous message.
      </p>
      <Note>
        Email Sequence generation requires more processing time than single-piece templates.
        Longer sequences may take 30–60 seconds. Do not navigate away while the sequence is
        generating.
      </Note>
      <GuideImage
        src="/images/guide/16-email-sequence-form.png"
        alt="Email Sequence template form"
        caption="Email Sequence (Kickoff) template form"
      />

      <h3>Advertising</h3>

      <h4>Social Media Ad Copy</h4>
      <p>
        Generate high-converting paid social ad copy for Facebook, Instagram, LinkedIn, TikTok,
        or Google. Select your platform and the AI optimizes copy for that platform&apos;s
        specific format, character limits, and audience behavior.
      </p>
      <GuideImage
        src="/images/guide/17-social-media-ad-copy-form.png"
        alt="Social Media Ad Copy template form"
        caption="Social Media Ad Copy template form"
      />

      <h4>Print Media</h4>
      <p>
        Generate copy for traditional print advertising – magazine ads, newspaper ads, trade
        publication ads, out-of-home communications, direct mail pieces, and more. This template
        applies classic print copywriting principles: strong headline, compelling body copy, and a
        clear call to action designed for a static format.
      </p>
      <GuideImage
        src="/images/guide/18-print-media-form.png"
        alt="Print Media template form"
        caption="Print Media template form"
      />

      <h4>Radio Commercial</h4>
      <p>
        Generate a professionally scripted radio or audio commercial. Radio is one of the most
        under-leveraged advertising formats in modern marketing. This template structures your spot
        correctly – with a strong hook in the first five seconds, benefit-driven body copy, and a
        clear, repeatable call to action within your chosen time format (15, 30, or 60 seconds).
      </p>
      <ul>
        <li>Writes to time – output is calibrated for your selected spot length.</li>
        <li>Includes production notes to guide the voice talent or production team.</li>
        <li>Structures the spot to work for pure audio – no visual crutches.</li>
      </ul>
      <GuideImage
        src="/images/guide/19-radio-commercial-form.png"
        alt="Radio Commercial template form"
        caption="Radio Commercial template form"
      />

      <h3>Social Media</h3>

      <h4>Social Media Post</h4>
      <p>
        Generate platform-specific organic social media posts. Select the platform – LinkedIn,
        Instagram, Facebook, X, TikTok, or one you specify – provide the topic or campaign
        context, and AI@Worx produces posts optimized for that platform&apos;s format, tone, and
        engagement patterns.
      </p>
      <GuideImage
        src="/images/guide/20-social-media-post-form.png"
        alt="Social Media Post template form"
        caption="Social Media Post template form"
      />

      <h4>LinkedIn Thought Leadership Post</h4>
      <p>
        Generate a LinkedIn post in the thought leadership format – designed to position the
        author as a credible expert, drive engagement, and attract the right professional audience.
        This template goes beyond standard social posts to produce content with a structured
        narrative arc, professional insight, and LinkedIn-specific formatting conventions.
      </p>
      <ul>
        <li>Hook-first structure proven to drive LinkedIn engagement.</li>
        <li>Calibrated to the professional, insight-driven tone that performs on LinkedIn.</li>
        <li>Includes section breaks and white space formatting that LinkedIn readers expect.</li>
        <li>Optional CTA for driving traffic or encouraging comments.</li>
      </ul>
      <ProTip>
        LinkedIn Thought Leadership posts work best when you provide a specific, counter-intuitive
        angle or insight rather than a generic topic. Instead of &quot;Trends in AI Marketing,&quot;
        try &quot;Why most AI marketing content fails (and what experienced copywriters do
        differently).&quot;
      </ProTip>
      <GuideImage
        src="/images/guide/21-linkedin-thought-leadership-form.png"
        alt="LinkedIn Thought Leadership Post template form"
        caption="LinkedIn Thought Leadership Post template form"
      />

      <h3>Website &amp; Landing Pages</h3>
      <p>Web copy and conversion-focused pages.</p>

      <h4>Landing Page Hero</h4>
      <p>
        Generate the above-the-fold hero copy for a landing page – headline, subhead, supporting
        copy, and primary CTA. This template uses proven landing page conversion principles to
        create a strong first impression that stops visitors and compels them to read further.
      </p>
      <GuideImage
        src="/images/guide/23-landing-page-hero-form.png"
        alt="Landing Page Hero template form"
        caption="Landing Page Hero template form"
      />

      <h4>Sales Page</h4>
      <p>
        Generate a long-form sales page using proven copywriting frameworks (AIDA, PAS, or FAB).
        Provide your product details, target audience, and desired framework, and CopyWorx
        Studio™ produces a complete sales page with headline, body copy, proof elements, and
        close – structured to convert.
      </p>
      <GuideImage
        src="/images/guide/26-sales-page-form.png"
        alt="Sales Page template form"
        caption="Sales Page template form"
      />

      <h4>Website Copy (SEO-Optimized)</h4>
      <p>
        Generate SEO-optimized website page copy – structured for search engine visibility while
        reading naturally to human visitors. Provide your target keywords, page purpose, and
        audience context, and AI@Worx produces copy that balances search optimization with
        persuasive readability.
      </p>
      <GuideImage
        src="/images/guide/24-website-copy-seo-form.png"
        alt="Website Copy SEO-Optimized template form"
        caption="Website Copy (SEO-Optimized) template form"
      />

      <h3>Collateral &amp; Marketing</h3>
      <p>Marketing materials and sales enablement.</p>

      <h4>Press Release</h4>
      <p>
        Generate a professionally structured press release in AP Style format. Provide the news,
        the key stakeholders, and the context, and CopyWorx Studio™ produces a release that
        follows standard journalistic structure – inverted pyramid, proper dateline, relevant
        quotes, and boilerplate – ready to send to media contacts.
      </p>
      <ul>
        <li>Follows AP Style formatting standards.</li>
        <li>Includes proper dateline, embargo language (if applicable), and media contact block.</li>
        <li>Structures quotes naturally and compliantly.</li>
        <li>Produces a release that editors can actually use without heavy rewriting.</li>
      </ul>
      <GuideImage
        src="/images/guide/25-press-release-form.png"
        alt="Press Release template form"
        caption="Press Release template form"
      />

      <h4>Case Study</h4>
      <p>
        Generate professional B2B case studies that prove ROI through customer success stories.
        Choose from four proven structures (PSR, STAR, Before-After-Bridge, or Executive Summary)
        and select your format: One-Page, Detailed, or Slide Deck. This template produces
        data-driven, credible case studies ready for sales enablement and marketing.
      </p>
      <GuideImage
        src="/images/guide/27-case-study-form.png"
        alt="Case Study template form"
        caption="Case Study template form"
      />

      <h4>Brochure Copy (Multi-Section)</h4>
      <p>
        Generate complete, multi-section brochure copy – from cover headline through every content
        section to the back-page call to action. This is CopyWorx Studio™&apos;s most
        comprehensive template and uses a section-by-section generation approach that gives you
        granular control over each part of the brochure.
      </p>
      <p><strong>The Multi-Section workflow:</strong></p>
      <ol>
        <li>Complete the overall brochure brief.</li>
        <li>AI generates each section of the brochure sequentially.</li>
        <li>Review and refine each section before moving to the next.</li>
        <li>
          When all sections are complete, your full brochure draft is assembled in the Editor.
        </li>
      </ol>
      <GuideImage
        src="/images/guide/22-brochure-multi-section-form.png"
        alt="Brochure Multi-Section template form"
        caption="Brochure Copy (Multi-Section) template form"
      />
    </section>
  );
}

// ─── Section 4: Brand Voice ───────────────────────────────────────────────────

function SectionBrandVoice() {
  return (
    <section id="brand-voice" className="guide-section scroll-mt-6">
      <h2>Brand Voice</h2>

      <h3>What Is Brand Voice?</h3>
      <p>
        The Brand Voice feature lets you define the personality, tone, and language rules for a
        brand. Once set up, Brand Voice works in two ways:
      </p>
      <ul>
        <li>
          <strong>Proactive:</strong> Apply it to any AI@Worx Template so the generated copy
          reflects the brand&apos;s voice from the first draft.
        </li>
        <li>
          <strong>Reactive:</strong> Run Brand Alignment on copy you&apos;ve already written to
          see a score and specific recommendations for improvement.
        </li>
      </ul>
      <ProTip>
        CopyWorx Studio™ supports multiple Brand Voices within a single account. If you&apos;re a
        copywriter managing multiple clients, set up a separate Brand Voice for each client so you
        can switch contexts instantly without starting over.
      </ProTip>

      <h3>Setting Up a Brand Voice</h3>
      <ol>
        <li>
          In the Left Panel, navigate to the <strong>Brand Voice</strong> section of your active
          Project.
        </li>
        <li>Click <strong>Add Brand Voice</strong> (or the + icon).</li>
        <li>Give this Brand Voice a name – typically the client or brand name.</li>
        <li>Fill in the Brand Voice fields (see below).</li>
        <li>
          Click <strong>Save</strong>. The Brand Voice is now available throughout CopyWorx
          Studio™ for this project.
        </li>
      </ol>
      <GuideImage
        src="/images/guide/28-brand-voice-fields-filled.png"
        alt="Brand Voice setup with fields filled in"
        caption="Brand Voice setup with fields filled in"
      />

      <h3>Brand Voice Fields</h3>
      <ul>
        <li>
          <strong>Brand Name</strong> – The name of the brand or client. This anchors the
          AI&apos;s understanding of whose voice you&apos;re writing in.
        </li>
        <li>
          <strong>Brand Tone</strong> – The overall tone of the brand&apos;s communication (e.g.,
          &quot;professional and authoritative,&quot; &quot;warm and approachable,&quot;
          &quot;bold and irreverent&quot;). Be as specific as possible.
        </li>
        <li>
          <strong>Approved Phrases</strong> – Words, phrases, or taglines the brand uses
          consistently. The AI will work to incorporate these naturally.
        </li>
        <li>
          <strong>Forbidden Words / Phrases</strong> – Language that is off-limits for this brand –
          competitor names, corporate jargon, or anything that clashes with the brand&apos;s
          personality. The AI will actively avoid these.
        </li>
        <li>
          <strong>Brand Values</strong> – A list of the values that should come through in all
          communication (e.g., Innovation, Transparency, Customer-First). Add one per line.
        </li>
        <li>
          <strong>Mission Statement</strong> – The brand&apos;s core purpose or &quot;why.&quot;
          This helps the AI frame copy around what the brand stands for.
        </li>
      </ul>

      <h3>Managing Multiple Brand Voices</h3>
      <p>You can create multiple Brand Voices within a project. This is especially useful for:</p>
      <ul>
        <li>Agencies managing multiple clients from one account</li>
        <li>Companies with multiple product lines that speak differently</li>
        <li>Testing two different positioning approaches for the same brand</li>
      </ul>
      <p>
        To switch between Brand Voices, select the desired one from the Brand Voice dropdown when
        launching a Template or running the Brand Alignment tool.
      </p>

      <h3>Applying Brand Voice to AI-Generated Copy</h3>
      <p>
        When you open any AI@Worx Template form, you&apos;ll see a Brand Voice toggle or selector.
        Enable it and choose the appropriate Brand Voice. The AI will incorporate your brand
        guidelines – tone, values, approved phrases, and forbidden words – into every sentence it
        generates.
      </p>
      <GuideImage
        src="/images/guide/29-template-brand-voice-selector.png"
        alt="Selecting a Brand Voice in a template form"
        caption="Selecting a Brand Voice in a template form"
      />
    </section>
  );
}

// ─── Section 5: Personas ──────────────────────────────────────────────────────

function SectionPersonas() {
  return (
    <section id="personas" className="guide-section scroll-mt-6">
      <h2>Personas</h2>

      <h3>What Are Personas?</h3>
      <p>
        A Persona is a detailed profile of the specific person you&apos;re writing for – your
        target reader. When you attach a Persona to AI-generated copy, the AI writes with that
        specific audience in mind, using language, references, and pain points that resonate with
        that exact reader profile.
      </p>
      <p>
        Personas are stored per project and can be reused across all templates and tools within
        that project.
      </p>

      <h3>Setting Up a Persona</h3>
      <ol>
        <li>
          In the Left Panel, navigate to the <strong>Personas</strong> section of your active
          Project.
        </li>
        <li>Click <strong>Add Persona</strong>.</li>
        <li>Fill in the Persona fields (see below).</li>
        <li>Click <strong>Save</strong>. The Persona is now available throughout your project.</li>
      </ol>
      <GuideImage
        src="/images/guide/30-persona-setup-panel.png"
        alt="Persona setup panel"
        caption="Persona setup panel"
      />

      <h3>Persona Fields</h3>
      <ul>
        <li>
          <strong>Photo / Avatar</strong> – Optional. Upload a photo or avatar to make the persona
          more vivid and memorable for your team.
        </li>
        <li>
          <strong>Name &amp; Title</strong> – Give the persona a descriptive name that your team
          will recognize (e.g., &quot;Sarah – Marketing Manager&quot; or &quot;Enterprise IT
          Decision-Maker&quot;).
        </li>
        <li>
          <strong>Demographics</strong> – Age range, job title, industry, company size, location,
          income level, and other factual characteristics.
        </li>
        <li>
          <strong>Psychographics</strong> – Values, attitudes, interests, lifestyle, and
          personality traits that drive this person&apos;s decisions.
        </li>
        <li>
          <strong>Pain Points</strong> – The specific frustrations, challenges, or problems this
          person faces that your product/service helps solve.
        </li>
        <li>
          <strong>Language Patterns</strong> – How this person talks and writes. Do they use
          jargon? Are they conversational or formal? What industry terms do they know?
        </li>
        <li>
          <strong>Goals &amp; Aspirations</strong> – What this person is trying to achieve –
          professionally, personally, or in relation to your product.
        </li>
      </ul>

      <h3>Using Personas in Templates</h3>
      <p>
        When completing a template form, you&apos;ll see a Persona selector. Choose the
        appropriate Persona and the AI will write copy specifically for that audience – adjusting
        the language, the angle of the argument, and the emotional triggers it pulls on.
      </p>
      <ProTip>
        Use Brand Voice AND Persona together for the most targeted copy. Brand Voice tells the AI
        how the brand speaks. Persona tells it who the brand is speaking to. Combined, they produce
        copy that is both on-brand and audience-specific.
      </ProTip>
      <GuideImage
        src="/images/guide/31-template-persona-selector.png"
        alt="Selecting a Persona in a template form"
        caption="Selecting a Persona in a template form"
      />
    </section>
  );
}

// ─── Section 6: Projects & Documents ─────────────────────────────────────────

function SectionProjectsDocuments() {
  return (
    <section id="projects-documents" className="guide-section scroll-mt-6">
      <h2>Projects &amp; Documents</h2>

      <h3>How Projects Are Structured</h3>
      <p>
        CopyWorx Studio™ uses a three-tier organizational structure: Projects contain Folders, and
        Folders contain Documents. Projects also contain their own Brand Voices and Personas.
      </p>
      <p>
        This structure is designed to mirror how copywriters and marketing teams actually organize
        client work:
      </p>
      <ul>
        <li><strong>Project</strong> = A client, brand, or major initiative.</li>
        <li>
          <strong>Folder</strong> = A campaign, deliverable type, or phase (e.g., &quot;Q3 Email
          Campaign,&quot; &quot;Social Ads,&quot; &quot;Launch Collateral&quot;).
        </li>
        <li><strong>Document</strong> = An individual piece of copy.</li>
      </ul>
      <GuideImage
        src="/images/guide/32-projects-left-panel-expanded.png"
        alt="Expanded project tree in the Left Panel"
        caption="Expanded project tree in the Left Panel"
      />

      <h3>Creating New Documents</h3>
      <p>
        The <strong>Document</strong> button in the menu bar provides easy dropdown access to:
      </p>
      <ul>
        <li>New Document</li>
        <li>Import Document</li>
        <li>Export Document</li>
        <li>Export PDF</li>
      </ul>
      <p>
        The <strong>[+]</strong> button in the menu bar provides quick access to creating a new
        document.
      </p>
      <GuideImage
        src="/images/guide/33-documents-button-menu.png"
        alt="Document menu and navigation options"
        caption="Document menu and navigation options"
      />

      <h3>Within the My Projects Area</h3>
      <p>Within the My Projects area of the Left Sidebar, you have easy access to:</p>
      <ul>
        <li><strong>New Folder</strong> button (bottom of Left Sidebar)</li>
        <li><strong>New Document</strong> button (bottom of Left Sidebar)</li>
        <li>All Projects, Folders, and Documents</li>
        <li>Brand Voices and Personas saved to a particular Project</li>
        <li>Snippets (see below)</li>
      </ul>

      <h3>Snippets</h3>
      <p>
        Snippets are your personal library of reusable copy – the taglines, boilerplate, legal
        disclaimers, CTAs, and brand-specific language you write once and use across every job for
        a client. Instead of hunting through old documents, Snippets puts your most-used copy at
        your fingertips, organized by project.
      </p>
      <p>
        Each project has its own Snippets folder, automatically pinned at the root level of your
        project hierarchy – always accessible, always client-specific.
      </p>
      <p><strong>Two ways to create a Snippet:</strong></p>

      <h4>Save from the Editor</h4>
      <p>
        Highlight any copy in the Editor, then click the scissors icon in the menu bar to select
        Save as Snippet. Name it, add a description to help you find it later, and it&apos;s saved
        instantly to your active project&apos;s Snippets folder.
      </p>
      <GuideImage
        src="/images/guide/34-snippets-save-from-editor.png"
        alt="Save selection as Snippet from the toolbar"
        caption="Save selection as Snippet from the toolbar"
      />

      <h4>Create from Scratch</h4>
      <p>
        Click the + button in the Snippets area at the bottom of a project folder to open the
        Snippet editor. Type or paste your copy, name it, add a description, and save.
      </p>
      <GuideImage
        src="/images/guide/35-snippets-new-snippet-panel.png"
        alt="Creating a new Snippet"
        caption="Creating a new Snippet"
      />
      <p>
        To insert a Snippet, open your project&apos;s Snippets folder, find the Snippet you need,
        and click to insert it at your cursor position in the Editor.
      </p>
      <ProTip>
        Use the Description field to create your own classification system – &quot;tagline,&quot;
        &quot;legal,&quot; &quot;CTA,&quot; &quot;boilerplate&quot; – whatever matches the way you
        think and work.
      </ProTip>

      <h3>Cloud Storage &amp; Cross-Device Access</h3>
      <p>
        All documents, projects, Brand Voices, and Personas are stored in Supabase cloud storage
        and tied to your account. Log in from any device and your entire workspace – every project,
        folder, document, and brand configuration – is there waiting for you.
      </p>

      <h3>Renaming, Moving, and Deleting</h3>
      <p>
        In the My Projects area of the Left Sidebar, you can rename folders and documents by
        clicking on the Pencil icon next to the document name. Delete documents by clicking on the
        Trash Can icon. Grab folders and documents to move them around the project folder for easy
        organization.
      </p>
    </section>
  );
}

// ─── Section 7: Account & Billing ────────────────────────────────────────────

function SectionAccountBilling() {
  return (
    <section id="account-billing" className="guide-section scroll-mt-6">
      <h2>Account &amp; Billing</h2>

      <h3>Account Management</h3>
      <p>
        Your account is managed through Clerk authentication. Click your profile icon or account
        menu in the top navigation to access account settings. From there you can update your name,
        email, and password, and manage connected social login accounts.
      </p>

      <h3>Subscription &amp; Billing</h3>
      <p>
        Subscription management and billing are handled through Stripe. Access the{' '}
        <strong>Billing</strong> section from your account menu to:
      </p>
      <ul>
        <li>View your current plan and next billing date.</li>
        <li>Upgrade, downgrade, or cancel your subscription.</li>
        <li>Download invoices or update your payment method.</li>
      </ul>

      <h3>Usage Dashboard</h3>
      <p>
        CopyWorx Studio™ tracks your AI API usage to ensure fair allocation across all users. Your
        usage dashboard shows:
      </p>
      <ul>
        <li>Total API calls today and this month</li>
        <li>Token consumption</li>
        <li>Usage relative to your plan limit</li>
      </ul>
      <Note>
        Your monthly AI usage allocation resets on the first of each month. If you&apos;re
        approaching your limit, focus on high-value template generation and use Copy Optimizer
        tools sparingly until the reset.
      </Note>
    </section>
  );
}

// ─── Main page component ──────────────────────────────────────────────────────

/**
 * Guide page component.
 *
 * Layout: -m-6 flex container that fills the (app) layout's <main> element.
 * Left column: sticky section nav (desktop) / dropdown (mobile).
 * Right column: scrollable content with all seven guide sections.
 */
export default function GuidePage() {
  const [activeSection, setActiveSection] = useState<SectionId>('getting-started');
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  // Highlight the nav item whose section is currently in the viewport.
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            setActiveSection(entry.target.id as SectionId);
          }
        }
      },
      { rootMargin: '-10% 0px -80% 0px', threshold: 0 },
    );

    SECTIONS.forEach(({ id }) => {
      const el = document.getElementById(id);
      if (el) observer.observe(el);
    });

    return () => observer.disconnect();
  }, []);

  const scrollToSection = useCallback((id: SectionId) => {
    setMobileNavOpen(false);
    const el = document.getElementById(id);
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }, []);

  const activeLabel = SECTIONS.find((s) => s.id === activeSection)?.label ?? '';
  const ActiveIcon  = SECTIONS.find((s) => s.id === activeSection)?.icon ?? Rocket;

  return (
    <div className="-m-6 flex min-h-full">

      {/* ── Desktop: sticky left nav ─────────────────────────────────── */}
      <aside className="hidden md:flex w-56 shrink-0 flex-col border-r border-border bg-white sticky top-0 self-start max-h-[calc(100vh-4rem)] overflow-y-auto">
        <div className="px-4 pt-6 pb-3">
          <p className="text-[10px] font-bold uppercase tracking-widest text-ink-400">
            Guide Contents
          </p>
        </div>

        <nav className="flex-1 px-2 pb-4 space-y-0.5">
          {SECTIONS.map(({ id, icon: Icon, label }) => (
            <button
              key={id}
              type="button"
              onClick={() => scrollToSection(id)}
              className={cn(
                'w-full flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-sm font-medium text-left transition-all duration-150',
                activeSection === id
                  ? 'bg-[#006EE6]/10 text-[#006EE6]'
                  : 'text-ink-600 hover:bg-ink-100 hover:text-ink-900',
              )}
            >
              <Icon
                className={cn(
                  'h-4 w-4 shrink-0',
                  activeSection === id ? 'text-[#006EE6]' : 'text-ink-400',
                )}
              />
              <span className="leading-tight">{label}</span>
            </button>
          ))}
        </nav>

        <div className="px-4 pb-5 pt-3 border-t border-border">
          <a
            href="mailto:support@copyworx.io"
            className="text-xs text-ink-400 hover:text-[#006EE6] transition-colors"
          >
            support@copyworx.io
          </a>
        </div>
      </aside>

      {/* ── Mobile: sticky top dropdown nav ─────────────────────────── */}
      <div className="md:hidden fixed top-16 left-0 right-0 z-30 border-b border-border bg-white shadow-sm">
        <button
          type="button"
          onClick={() => setMobileNavOpen(!mobileNavOpen)}
          className="flex w-full items-center justify-between px-4 py-3 text-sm font-medium text-ink-900"
        >
          <span className="flex items-center gap-2">
            <ActiveIcon className="h-4 w-4 text-[#006EE6]" />
            {activeLabel}
          </span>
          {mobileNavOpen
            ? <X className="h-4 w-4 text-ink-500" />
            : <Menu className="h-4 w-4 text-ink-500" />
          }
        </button>

        {mobileNavOpen && (
          <nav className="border-t border-border px-2 py-2 space-y-0.5 bg-white shadow-lg">
            {SECTIONS.map(({ id, icon: Icon, label }) => (
              <button
                key={id}
                type="button"
                onClick={() => scrollToSection(id)}
                className={cn(
                  'w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm font-medium text-left',
                  activeSection === id
                    ? 'bg-[#006EE6]/10 text-[#006EE6]'
                    : 'text-ink-600 hover:bg-ink-100 hover:text-ink-900',
                )}
              >
                <Icon
                  className={cn(
                    'h-4 w-4 shrink-0',
                    activeSection === id ? 'text-[#006EE6]' : 'text-ink-400',
                  )}
                />
                {label}
              </button>
            ))}
          </nav>
        )}
      </div>

      {/* ── Scrollable guide content ─────────────────────────────────── */}
      <div className="flex-1 min-w-0">
        <div className="max-w-3xl mx-auto px-8 py-8 md:pt-8 pt-24">

          {/* Page header */}
          <div className="mb-10 pb-6 border-b border-border">
            <h1 className="font-sans text-3xl font-bold text-ink-900">
              CopyWorx Studio™ User Guide
            </h1>
            <p className="mt-2 text-base text-ink-500">
              Everything you need to know – from first login to advanced workflows.
            </p>
          </div>

          {/* All guide sections with shared prose styles */}
          <div className="guide-prose space-y-16">
            <SectionGettingStarted />
            <SectionCopyOptimizer />
            <SectionTemplates />
            <SectionBrandVoice />
            <SectionPersonas />
            <SectionProjectsDocuments />
            <SectionAccountBilling />
          </div>

          {/* Footer */}
          <div className="mt-16 pt-8 border-t border-border text-center">
            <p className="text-sm text-ink-400">
              Questions?{' '}
              <a
                href="mailto:support@copyworx.io"
                className="font-medium text-[#006EE6] hover:underline underline-offset-2"
              >
                Email support@copyworx.io
              </a>
            </p>
          </div>

        </div>
      </div>

    </div>
  );
}
