# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

CopyWorx is a professional AI-powered copywriting tool built with Next.js 14 (App Router), React 18, TypeScript, and Tailwind CSS. It provides a three-column workspace with a TipTap rich text editor, AI writing tools powered by Anthropic Claude, and cloud persistence via Supabase.

## Commands

```bash
npm run dev       # Start dev server on localhost:3000
npm run build     # Production build (ESLint errors ignored during build)
npm run lint      # Run ESLint
npm start         # Start production server
```

No test framework is configured. Manual test scripts exist as `test-*.js` files in the project root.

## Architecture

### Route Structure (Next.js App Router)

- `app/(marketing)/` - Public pages: homepage, about, pricing
- `app/(app)/` - Authenticated routes: projects, templates (protected by Clerk middleware)
- `app/worxspace/` - Main editor workspace (protected)
- `app/api/` - API routes handle their own auth; public in middleware

### Three-Column Workspace

The core UI is a three-column layout in `components/workspace/WorkspaceLayout.tsx`:
- **Left sidebar** (280px): Tool selector, project documents, brand voices, personas
- **Center**: TipTap rich text editor (`EditorArea.tsx`, ~900 lines)
- **Right sidebar** (320px): AI analysis results, tool outputs

Both sidebars are collapsible with 300ms transitions.

### State Management

**Zustand stores manage UI state only, never document content:**
- `lib/stores/workspaceStore.ts` (~1500 lines) - Active project/document IDs, sidebar state, tool selection, selected text for AI tools, tool results
- `lib/stores/slideOutStore.ts` - Slide-out panel open/close state
- `lib/stores/snippetStore.ts` - Snippets state

**Document content** is persisted via the storage layer, not Zustand. The editor loads content on mount and auto-saves with 500ms debounce.

### Storage Layer (Hybrid)

`lib/storage/unified-storage.ts` provides the high-level API. It tries Supabase first, falls back to localStorage:
- `supabase-storage.ts` - Cloud persistence
- `project-storage.ts`, `document-storage.ts`, `persona-storage.ts`, etc. - localStorage implementations

Always use `unified-storage.ts` functions rather than calling storage backends directly.

### AI API Routes

All AI features call Anthropic Claude via server-side API routes:
- `/api/tone-shift` - Rewrite copy in a different tone
- `/api/expand` / `/api/shorten` - Lengthen or condense copy
- `/api/headline-generator` - Generate headline variations
- `/api/generate-template` / `/api/generate-section` - Multi-section template generation
- `/api/brand-alignment` - Score text against brand voice
- `/api/persona-alignment` - Score text against target persona
- `/api/rewrite-channel` - Adapt copy for specific channels (email, social, etc.)
- `/api/optimize-alignment` - Rewrite copy to improve brand/persona alignment
- `/api/claude` - General Claude API proxy

AI routes follow a consistent pattern: `getUserId()` → `checkUserWithinLimit()` → call Claude → log usage to Supabase. Auth and usage-limit helpers are in `lib/utils/api-auth.ts`.

AI prompt templates live in `lib/prompts/`.

### Database CRUD Routes

`/api/db/*` routes provide Supabase CRUD for all data models:
- `/api/db/projects`, `/api/db/documents`, `/api/db/folders` - Project data
- `/api/db/brand-voices`, `/api/db/all-brand-voices` - Brand voice management
- `/api/db/personas`, `/api/db/all-personas` - Persona management
- `/api/db/snippets` - Reusable copy snippets
- `/api/db/sync` - Client-server data sync
- `/api/db/migrate`, `/api/db/run-migration` - Schema migrations

Database migrations live in `supabase/migrations/`.

### Authentication

Clerk 5.x with `clerkMiddleware` in `middleware.ts`. Public routes: `/`, `/home`, `/about`, `/pricing`, `/sign-in`, `/sign-up`, `/api/*`. Everything else requires auth.

### Key Type Definitions

Types are in `lib/types/` with barrel export from `index.ts`:
- `project.ts` - Project, ProjectDocument, Folder
- `brand.ts` - BrandVoice
- `snippet.ts` - Snippet
- `template.ts` - Template definitions
- `workspace.ts` - Workspace UI types
- `database.ts` - Supabase schema types

## Conventions

- **Path alias**: `@/*` maps to project root (e.g., `@/components/workspace/EditorArea`)
- **Components**: Feature-organized under `components/workspace/`, `components/layout/`, `components/ui/`
- **UI primitives**: shadcn/ui (Radix-based) in `components/ui/`
- **Icons**: Lucide React exclusively
- **Toasts**: Sonner (`sonner` package)
- **Slide-out panels**: Use `slideOutStore` for open/close state, `SlideOutPanel` component
- **Template definitions**: `lib/data/templates.ts` is the source of truth for all template metadata
- **Tool registration**: Tools defined in `lib/tools/toolRegistry.ts`
- **Editor utilities**: `lib/editor-utils.ts` for TipTap helper functions; custom font-size extension in `lib/tiptap/font-size.ts`
- **Error handling**: `lib/utils/error-handling.ts` provides `retryWithBackoff` and error formatting

## Environment Variables

Required in `.env.local`:
- `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`, `CLERK_SECRET_KEY` - Clerk auth
- `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY` - Supabase (optional; localStorage fallback if missing)
- `ANTHROPIC_API_KEY` - Claude AI features
