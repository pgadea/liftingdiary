# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## CRITICAL: Documentation-First Development

**ALWAYS refer to relevant documentation files in the `/docs` directory before generating any code.**

When implementing features or making changes:
1. **First**, check if there's a relevant documentation file in `/docs`
2. **Read** the documentation thoroughly to understand patterns, conventions, and requirements
3. **Then** generate code that follows the documented guidelines

Available documentation files:
- `/docs/ui.md` - UI component patterns and styling conventions
- `/docs/data-fetching.md` - **CRITICAL** data fetching patterns and security requirements

This ensures consistency across the codebase and adherence to project-specific patterns.

## Project Overview

Next.js 15 application for a lifting diary course, bootstrapped with `create-next-app`. Uses TypeScript, Tailwind CSS v4, and Turbopack for fast development.

## Development Commands

```bash
# Start development server with Turbopack
npm run dev

# Build for production with Turbopack
npm run build

# Start production server
npm start

# Run ESLint
npm run lint
```

## Project Structure

- **App Router**: Uses Next.js App Router with all routes in `src/app/`
- **Path Aliases**: `@/*` maps to `./src/*` (configured in tsconfig.json:22-23)
- **Styling**: Tailwind CSS v4 with inline theme configuration in `src/app/globals.css`
- **Fonts**: Geist Sans and Geist Mono loaded via `next/font/google` in `src/app/layout.tsx:5-13`

## Technical Configuration

### TypeScript
- Strict mode enabled (tsconfig.json:7)
- Module resolution set to "bundler" (tsconfig.json:11)
- Targets ES2017 (tsconfig.json:3)

### Tailwind CSS v4
- Uses new `@theme inline` syntax for custom properties (globals.css:8-13)
- CSS variables define `--background` and `--foreground` with dark mode support
- Import via `@import "tailwindcss"` instead of traditional directives

### Build System
- **Turbopack**: Enabled by default via `--turbopack` flag in dev and build scripts
- Significantly faster than webpack for development and builds

### ESLint
- Uses flat config format (eslint.config.mjs)
- Extends `next/core-web-vitals` and `next/typescript`
- Ignores: node_modules, .next, out, build, next-env.d.ts

## Clerk Authentication

This app uses [Clerk](https://clerk.com/) for authentication with the Next.js App Router integration.

### Setup
- **Package**: `@clerk/nextjs` (installed)
- **Middleware**: `src/middleware.ts` uses `clerkMiddleware()` from `@clerk/nextjs/server`
- **Provider**: `<ClerkProvider>` wraps the app in `src/app/layout.tsx`
- **Environment Variables**: Set in `.env.local` (not tracked in git)
  - `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` - Get from [Clerk Dashboard API Keys](https://dashboard.clerk.com/last-active?path=api-keys)
  - `CLERK_SECRET_KEY` - Get from Clerk Dashboard

### Clerk Components Available
- `<SignInButton>` / `<SignUpButton>` - Authentication buttons
- `<UserButton>` - User profile dropdown
- `<SignedIn>` / `<SignedOut>` - Conditional rendering based on auth state

### Server-Side Auth
Import from `@clerk/nextjs/server`:
```typescript
import { auth } from "@clerk/nextjs/server";

// In Server Components or API routes
export default async function Page() {
  const { userId } = await auth();
  // ...
}
```

### Important
- **NEVER** use deprecated `authMiddleware()` - use `clerkMiddleware()` instead
- **ALWAYS** import from `@clerk/nextjs` or `@clerk/nextjs/server` (not older packages)
- Real API keys are stored only in `.env.local` (which is gitignored)

## Development Notes

- Main entry point for the app is `src/app/page.tsx`
- Layout configuration (metadata, fonts, auth) in `src/app/layout.tsx`
- Server starts on http://localhost:3000 by default
- Header with auth buttons is rendered in the root layout
