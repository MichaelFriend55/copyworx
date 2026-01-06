# CopyWorx

A professional copywriting tool built with Next.js 14, TypeScript, Tailwind CSS, and shadcn/ui.

## Features

- 🚀 **Next.js 14** with App Router
- 📝 **TypeScript** for type safety
- 🎨 **Tailwind CSS** for styling
- 🧱 **shadcn/ui** for beautiful components
- 🔐 **Clerk** (ready for integration) for authentication

## Project Structure

```
copyworx-v2/
├── app/
│   ├── (marketing)/          # Public marketing pages
│   │   ├── page.tsx          # Homepage
│   │   ├── about/            # About page
│   │   └── pricing/          # Pricing page
│   ├── (app)/                # Authenticated app area
│   │   ├── dashboard/        # Main dashboard
│   │   ├── templates/        # Copywriting templates
│   │   └── projects/         # Project management
│   ├── sign-in/              # Clerk sign-in (placeholder)
│   ├── sign-up/              # Clerk sign-up (placeholder)
│   ├── api/                  # API routes
│   ├── globals.css           # Global styles
│   └── layout.tsx            # Root layout
├── components/
│   ├── ui/                   # shadcn/ui components
│   │   ├── button.tsx
│   │   ├── card.tsx
│   │   ├── badge.tsx
│   │   └── input.tsx
│   └── layout/               # Layout components
│       ├── navbar.tsx
│       ├── footer.tsx
│       └── sidebar.tsx
├── lib/
│   └── utils.ts              # Utility functions
├── tailwind.config.ts        # Tailwind configuration
├── next.config.js            # Next.js configuration
├── tsconfig.json             # TypeScript configuration
└── package.json              # Dependencies
```

## Getting Started

### Prerequisites

- Node.js 18.17 or later
- npm, yarn, or pnpm

### Installation

1. Install dependencies:

```bash
npm install
```

2. Run the development server:

```bash
npm run dev
```

3. Open [http://localhost:3000](http://localhost:3000) in your browser.

## Design System

### Color Palette

- **Ink (Primary)**: Deep navy tones for a professional writing aesthetic
- **Amber (Accent)**: Warm amber/gold for CTAs and highlights
- **Neutrals**: Warm grays for text and backgrounds

### Typography

- **Display Font**: Crimson Pro (serif) - for headings
- **Body Font**: Geist Sans - for body text
- **Mono Font**: Geist Mono - for code

### Components

The project uses shadcn/ui components with custom CopyWorx styling:

- Button (with amber and ink variants)
- Card
- Badge
- Input

## Adding Clerk Authentication

The project is set up and ready for Clerk integration. To add authentication:

1. Install Clerk:

```bash
npm install @clerk/nextjs
```

2. Add your Clerk keys to `.env.local`:

```env
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_...
CLERK_SECRET_KEY=sk_...
NEXT_PUBLIC_CLERK_SIGN_IN_URL=/sign-in
NEXT_PUBLIC_CLERK_SIGN_UP_URL=/sign-up
NEXT_PUBLIC_CLERK_AFTER_SIGN_IN_URL=/dashboard
NEXT_PUBLIC_CLERK_AFTER_SIGN_UP_URL=/dashboard
```

3. Wrap your app with ClerkProvider in `app/layout.tsx`

4. Replace the placeholder auth pages with Clerk components

## Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run start` - Start production server
- `npm run lint` - Run ESLint

## License

MIT

