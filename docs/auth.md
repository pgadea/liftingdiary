# Authentication Coding Standards

This document outlines the coding standards and best practices for all authentication-related code in the Lifting Diary Course application.

## ⚠️ CRITICAL RULES

### 1. Authentication Provider: Clerk ONLY
**This application uses Clerk for ALL authentication functionality.**

- **ONLY use Clerk** for authentication and user management
- **NEVER implement custom authentication** (no JWT, sessions, passwords, etc.)
- **NEVER use deprecated Clerk APIs** (no `authMiddleware()`, no `@clerk/clerk-sdk-node`)
- All auth code MUST use `@clerk/nextjs` or `@clerk/nextjs/server`

### 2. User Data Isolation is MANDATORY
**Every database query MUST enforce user data isolation.**

- **ALWAYS** use `await auth()` to get the authenticated `userId`
- **ALWAYS** filter queries by `userId` to prevent data leaks
- **NEVER** expose one user's data to another user
- See `/docs/data-fetching.md` for complete security requirements

### 3. Server-Side Authentication First
**Prefer server-side authentication over client-side.**

- **Server Components**: Use `auth()` from `@clerk/nextjs/server`
- **Server Actions**: Use `auth()` from `@clerk/nextjs/server`
- **Client Components**: Use Clerk components (`<SignedIn>`, `<SignedOut>`, `<UserButton>`)
- **NEVER** expose sensitive user data to client components

## Table of Contents

1. [Setup and Configuration](#setup-and-configuration)
2. [Server-Side Authentication](#server-side-authentication)
3. [Client-Side Authentication](#client-side-authentication)
4. [Protected Routes](#protected-routes)
5. [User Data Access](#user-data-access)
6. [Middleware Configuration](#middleware-configuration)
7. [Environment Variables](#environment-variables)
8. [Security Best Practices](#security-best-practices)
9. [Common Patterns](#common-patterns)
10. [What NOT to Do](#what-not-to-do)

---

## Setup and Configuration

### Required Package
```bash
npm install @clerk/nextjs
```

### App Layout Configuration
The root layout MUST wrap the entire app with `<ClerkProvider>`:

```tsx
// src/app/layout.tsx
import { ClerkProvider } from "@clerk/nextjs";

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <ClerkProvider>
      <html lang="en">
        <body>{children}</body>
      </html>
    </ClerkProvider>
  );
}
```

**Important:**
- `<ClerkProvider>` MUST wrap the `<html>` tag
- MUST be in the root layout (`src/app/layout.tsx`)
- No configuration props needed (uses environment variables)

---

## Server-Side Authentication

### Getting the Current User
Use `auth()` from `@clerk/nextjs/server` in:
- Server Components
- Server Actions
- Route Handlers

```typescript
import { auth } from "@clerk/nextjs/server";

export default async function DashboardPage() {
  const { userId } = await auth();

  if (!userId) {
    // User is not authenticated
    redirect("/sign-in");
  }

  // User is authenticated, proceed with logic
  const data = await getUserData(userId);

  return <div>Welcome, {userId}</div>;
}
```

### Available Properties from `auth()`
```typescript
const {
  userId,           // Clerk user ID (string | null)
  sessionId,        // Current session ID (string | null)
  orgId,            // Organization ID if using orgs (string | null | undefined)
  orgRole,          // User's role in org (string | null | undefined)
  orgSlug,          // Organization slug (string | null | undefined)
} = await auth();
```

### Server Component Example
```tsx
// src/app/dashboard/page.tsx
import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { getWorkouts } from "@/data/workouts";

export default async function DashboardPage() {
  // 1. Authenticate the user
  const { userId } = await auth();

  // 2. Redirect if not authenticated
  if (!userId) {
    redirect("/");
  }

  // 3. Fetch user-specific data
  const workouts = await getWorkouts(); // Already filters by userId internally

  // 4. Render UI
  return (
    <div>
      <h1>My Workouts</h1>
      {/* ... */}
    </div>
  );
}
```

### Server Action Example
```typescript
// src/app/dashboard/actions.ts
"use server";

import { auth } from "@clerk/nextjs/server";
import { db } from "@/db";
import { workouts } from "@/db/schema";

export async function createWorkout(name: string) {
  // 1. Get authenticated user
  const { userId } = await auth();

  // 2. Verify authentication
  if (!userId) {
    throw new Error("Unauthorized");
  }

  // 3. Perform database operation with userId
  const [workout] = await db
    .insert(workouts)
    .values({
      userId,
      name,
    })
    .returning();

  return workout;
}
```

---

## Client-Side Authentication

### Available Clerk Components
Import from `@clerk/nextjs`:

```tsx
import {
  SignedIn,        // Render children only when signed in
  SignedOut,       // Render children only when signed out
  SignInButton,    // Button to trigger sign in
  SignUpButton,    // Button to trigger sign up
  UserButton,      // User profile dropdown
} from "@clerk/nextjs";
```

### Conditional Rendering
Use `<SignedIn>` and `<SignedOut>` to show different UI based on auth state:

```tsx
"use client";

import { SignedIn, SignedOut, SignInButton, UserButton } from "@clerk/nextjs";

export function Header() {
  return (
    <header>
      <nav>
        <SignedOut>
          <SignInButton mode="modal">
            <button>Sign In</button>
          </SignInButton>
        </SignedOut>

        <SignedIn>
          <UserButton afterSignOutUrl="/" />
        </SignedIn>
      </nav>
    </header>
  );
}
```

### Sign In Button
```tsx
import { SignInButton } from "@clerk/nextjs";

// Modal mode (recommended)
<SignInButton mode="modal">
  <button>Sign In</button>
</SignInButton>

// Redirect mode
<SignInButton mode="redirect" redirectUrl="/dashboard">
  <button>Sign In</button>
</SignInButton>

// Using with shadcn/ui Button
import { Button } from "@/components/ui/button";

<SignInButton mode="modal">
  <Button>Sign In</Button>
</SignInButton>
```

### Sign Up Button
```tsx
import { SignUpButton } from "@clerk/nextjs";

// Modal mode (recommended)
<SignUpButton mode="modal">
  <button>Sign Up</button>
</SignUpButton>

// Redirect mode
<SignUpButton mode="redirect" redirectUrl="/onboarding">
  <button>Sign Up</button>
</SignUpButton>

// Using with shadcn/ui Button
import { Button } from "@/components/ui/button";

<SignUpButton mode="modal">
  <Button variant="outline">Sign Up</Button>
</SignUpButton>
```

### User Button
Shows user avatar and dropdown menu with account management options:

```tsx
import { UserButton } from "@clerk/nextjs";

// Basic usage
<UserButton />

// With custom redirect after sign out
<UserButton afterSignOutUrl="/" />

// With appearance customization
<UserButton
  appearance={{
    elements: {
      avatarBox: "w-10 h-10"
    }
  }}
/>
```

### Client Component Auth State
For client components that need to check auth state programmatically:

```tsx
"use client";

import { useAuth } from "@clerk/nextjs";

export function MyClientComponent() {
  const { userId, isLoaded, isSignedIn } = useAuth();

  // Always check isLoaded first
  if (!isLoaded) {
    return <div>Loading...</div>;
  }

  if (!isSignedIn) {
    return <div>Please sign in</div>;
  }

  return <div>Welcome, {userId}</div>;
}
```

**Important:**
- ALWAYS check `isLoaded` before using auth state
- Use `isSignedIn` for boolean checks (more reliable than checking `userId`)
- DO NOT use client-side auth for sensitive operations (use server-side instead)

---

## Protected Routes

### Middleware Protection
The `src/middleware.ts` file protects routes using Clerk's middleware:

```typescript
// src/middleware.ts
import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";

// Define which routes require authentication
const isProtectedRoute = createRouteMatcher([
  "/dashboard(.*)",
  "/workouts(.*)",
  "/profile(.*)",
]);

export default clerkMiddleware(async (auth, req) => {
  // Protect routes that require authentication
  if (isProtectedRoute(req)) {
    await auth.protect();
  }
});

export const config = {
  matcher: [
    // Skip Next.js internals and static files
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    // Always run for API routes
    "/(api|trpc)(.*)",
  ],
};
```

### Route Matcher Patterns
```typescript
// Protect exact route
const isProtected = createRouteMatcher(["/dashboard"]);

// Protect route and all sub-routes
const isProtected = createRouteMatcher(["/dashboard(.*)"]);

// Protect multiple routes
const isProtected = createRouteMatcher([
  "/dashboard(.*)",
  "/profile",
  "/settings(.*)",
]);

// Public routes (everything else is protected)
const isPublicRoute = createRouteMatcher(["/", "/sign-in(.*)", "/sign-up(.*)"]);

export default clerkMiddleware(async (auth, req) => {
  if (!isPublicRoute(req)) {
    await auth.protect();
  }
});
```

### Page-Level Protection
Even with middleware protection, ALWAYS verify auth in Server Components:

```tsx
// src/app/dashboard/page.tsx
import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";

export default async function DashboardPage() {
  const { userId } = await auth();

  // Defense in depth: verify even if middleware should protect
  if (!userId) {
    redirect("/");
  }

  // Continue with protected page logic
  // ...
}
```

**Why both middleware AND page-level checks?**
- **Middleware**: First line of defense, redirects unauthorized users
- **Page-level**: Defense in depth, ensures data queries are always protected
- **Both together**: Maximum security, prevents configuration errors

---

## User Data Access

### CRITICAL: Always Filter by User ID
**Every database query MUST filter by the authenticated user's ID.**

See `/docs/data-fetching.md` for complete details.

### Standard Pattern
```typescript
// src/data/workouts.ts
"use server";

import { auth } from "@clerk/nextjs/server";
import { db } from "@/db";
import { workouts } from "@/db/schema";
import { eq } from "drizzle-orm";

export async function getWorkouts() {
  // 1. Get authenticated user
  const { userId } = await auth();

  // 2. Verify authentication
  if (!userId) {
    throw new Error("Unauthorized");
  }

  // 3. Filter by userId - CRITICAL!
  return await db
    .select()
    .from(workouts)
    .where(eq(workouts.userId, userId));
}
```

### Accessing Specific Records
When accessing a specific record by ID, ALWAYS verify it belongs to the current user:

```typescript
export async function getWorkoutById(workoutId: string) {
  const { userId } = await auth();

  if (!userId) {
    throw new Error("Unauthorized");
  }

  const [workout] = await db
    .select()
    .from(workouts)
    .where(eq(workouts.id, workoutId))
    .limit(1);

  if (!workout) {
    throw new Error("Workout not found");
  }

  // CRITICAL: Verify ownership
  if (workout.userId !== userId) {
    throw new Error("Unauthorized");
  }

  return workout;
}
```

### User Data Schema
ALL database tables that store user data MUST include a `userId` column:

```typescript
// src/db/schema.ts
import { pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";

export const workouts = pgTable("workouts", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: text("user_id").notNull(), // REQUIRED for all user data tables
  name: text("name").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Add index for performance
export const workoutsUserIdIndex = index("workouts_user_id_idx").on(workouts.userId);
```

---

## Middleware Configuration

### Current Middleware Setup
```typescript
// src/middleware.ts
import { clerkMiddleware } from "@clerk/nextjs/server";

export default clerkMiddleware();

export const config = {
  matcher: [
    // Skip Next.js internals and static files
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    // Always run for API routes
    "/(api|trpc)(.*)",
  ],
};
```

### Customizing Middleware
Add route protection and custom logic:

```typescript
import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";

const isProtectedRoute = createRouteMatcher(["/dashboard(.*)"]);

export default clerkMiddleware(async (auth, req) => {
  // Protect specific routes
  if (isProtectedRoute(req)) {
    await auth.protect();
  }

  // Custom logic (optional)
  const { userId } = await auth();
  if (userId) {
    // User is signed in, add custom headers or logic
    const response = NextResponse.next();
    response.headers.set("x-user-id", userId);
    return response;
  }
});

export const config = {
  matcher: [
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    "/(api|trpc)(.*)",
  ],
};
```

### Important Middleware Notes
- **NEVER** use deprecated `authMiddleware()` - use `clerkMiddleware()` instead
- **ALWAYS** import from `@clerk/nextjs/server` (not older packages)
- Matcher config excludes static files and Next.js internals for performance
- Middleware runs on Edge Runtime (has some limitations vs Node.js runtime)

---

## Environment Variables

### Required Variables
Add these to `.env.local` (NEVER commit this file):

```bash
# Get these from https://dashboard.clerk.com/last-active?path=api-keys
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_...
CLERK_SECRET_KEY=sk_test_...
```

### Getting API Keys
1. Go to [Clerk Dashboard](https://dashboard.clerk.com/)
2. Select your application
3. Navigate to "API Keys" in the sidebar
4. Copy the "Publishable Key" and "Secret Key"
5. Paste into `.env.local`

### Variable Usage
- `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`: Used in client-side code (safe to expose)
- `CLERK_SECRET_KEY`: Used in server-side code (NEVER expose to client)

**Important:**
- `.env.local` is in `.gitignore` (NEVER commit real keys)
- These variables are automatically loaded by Next.js
- No manual configuration needed in code

---

## Security Best Practices

### 1. Defense in Depth
Use multiple layers of protection:
- ✅ Middleware protection for routes
- ✅ Page-level auth checks in Server Components
- ✅ Data helper functions verify auth
- ✅ Database queries filter by userId

### 2. Server-Side First
Prefer server-side authentication over client-side:
- ✅ Use `auth()` in Server Components and Actions
- ✅ Use Clerk components (`<SignedIn>`, `<SignedOut>`) for UI
- ❌ Don't use client-side auth for sensitive operations

### 3. Never Trust Client Input
Always verify on the server:
```tsx
// ❌ BAD - Trusting client-side userId
"use client";
export function DeleteButton({ userId, workoutId }) {
  const handleDelete = async () => {
    await deleteWorkout(workoutId, userId); // userId from client!
  };
  // ...
}

// ✅ GOOD - Server verifies auth
"use server";
export async function deleteWorkout(workoutId: string) {
  const { userId } = await auth(); // Get userId on server
  if (!userId) throw new Error("Unauthorized");

  // Verify ownership before deleting
  const workout = await getWorkoutById(workoutId);
  if (workout.userId !== userId) {
    throw new Error("Unauthorized");
  }

  await db.delete(workouts).where(eq(workouts.id, workoutId));
}
```

### 4. Secure User Data
- ✅ ALWAYS filter queries by userId
- ✅ Verify ownership before mutations (create, update, delete)
- ✅ Use Drizzle ORM (prevents SQL injection)
- ❌ Never expose one user's data to another

### 5. Error Messages
Don't leak information in error messages:
```typescript
// ❌ BAD - Reveals that workout exists
if (workout.userId !== userId) {
  throw new Error("This workout belongs to another user");
}

// ✅ GOOD - Generic message
if (workout.userId !== userId) {
  throw new Error("Workout not found");
}
```

---

## Common Patterns

### Protected Server Component Page
```tsx
// src/app/dashboard/page.tsx
import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { getWorkouts } from "@/data/workouts";

export default async function DashboardPage() {
  const { userId } = await auth();

  if (!userId) {
    redirect("/");
  }

  const workouts = await getWorkouts();

  return (
    <div>
      <h1>Dashboard</h1>
      {/* ... */}
    </div>
  );
}
```

### Server Action with Auth
```tsx
// src/app/dashboard/actions.ts
"use server";

import { auth } from "@clerk/nextjs/server";
import { revalidatePath } from "next/cache";
import { createWorkout } from "@/data/workouts";

export async function createWorkoutAction(formData: FormData) {
  const { userId } = await auth();

  if (!userId) {
    throw new Error("Unauthorized");
  }

  const name = formData.get("name") as string;
  const workout = await createWorkout(name);

  revalidatePath("/dashboard");
  return workout;
}
```

### Client Component with Auth UI
```tsx
"use client";

import { SignedIn, SignedOut, SignInButton, UserButton } from "@clerk/nextjs";
import { Button } from "@/components/ui/button";

export function AuthButtons() {
  return (
    <>
      <SignedOut>
        <SignInButton mode="modal">
          <Button>Sign In</Button>
        </SignInButton>
      </SignedOut>

      <SignedIn>
        <UserButton afterSignOutUrl="/" />
      </SignedIn>
    </>
  );
}
```

### Loading State for Auth
```tsx
"use client";

import { useAuth } from "@clerk/nextjs";
import { Skeleton } from "@/components/ui/skeleton";

export function ProtectedContent() {
  const { isLoaded, isSignedIn } = useAuth();

  if (!isLoaded) {
    return <Skeleton className="h-20 w-full" />;
  }

  if (!isSignedIn) {
    return <div>Please sign in to continue</div>;
  }

  return <div>Protected content here</div>;
}
```

### Conditional Navigation Links
```tsx
"use client";

import Link from "next/link";
import { SignedIn, SignedOut } from "@clerk/nextjs";

export function Navigation() {
  return (
    <nav>
      <Link href="/">Home</Link>

      <SignedIn>
        <Link href="/dashboard">Dashboard</Link>
        <Link href="/workouts">Workouts</Link>
      </SignedIn>

      <SignedOut>
        <Link href="/about">About</Link>
      </SignedOut>
    </nav>
  );
}
```

---

## What NOT to Do

### ❌ Don't Use Deprecated APIs
```typescript
// ❌ WRONG - Deprecated
import { authMiddleware } from "@clerk/nextjs";
export default authMiddleware();

// ✅ CORRECT - Current API
import { clerkMiddleware } from "@clerk/nextjs/server";
export default clerkMiddleware();
```

### ❌ Don't Import from Old Packages
```typescript
// ❌ WRONG - Old package
import { auth } from "@clerk/nextjs";

// ✅ CORRECT - Server imports from /server
import { auth } from "@clerk/nextjs/server";
```

### ❌ Don't Implement Custom Auth
```typescript
// ❌ WRONG - Custom JWT handling
import jwt from "jsonwebtoken";
export async function customAuth() {
  const token = cookies().get("token");
  const decoded = jwt.verify(token, SECRET);
  // ...
}

// ✅ CORRECT - Use Clerk
import { auth } from "@clerk/nextjs/server";
export async function getUser() {
  const { userId } = await auth();
  // ...
}
```

### ❌ Don't Skip User ID Verification
```typescript
// ❌ WRONG - No userId filter
export async function getWorkouts() {
  return await db.select().from(workouts); // Returns ALL users' data!
}

// ✅ CORRECT - Filter by userId
export async function getWorkouts() {
  const { userId } = await auth();
  if (!userId) throw new Error("Unauthorized");

  return await db
    .select()
    .from(workouts)
    .where(eq(workouts.userId, userId));
}
```

### ❌ Don't Trust Client-Side Auth for Sensitive Operations
```typescript
// ❌ WRONG - Using client hook for database operations
"use client";
import { useAuth } from "@clerk/nextjs";

export function DeleteButton({ workoutId }) {
  const { userId } = useAuth();

  const handleDelete = async () => {
    // Dangerous: userId from client could be manipulated
    await fetch("/api/workouts", {
      method: "DELETE",
      body: JSON.stringify({ workoutId, userId }),
    });
  };
}

// ✅ CORRECT - Verify auth on server
"use server";
import { auth } from "@clerk/nextjs/server";

export async function deleteWorkout(workoutId: string) {
  const { userId } = await auth(); // Get userId on server
  if (!userId) throw new Error("Unauthorized");

  // Verify ownership
  const workout = await getWorkoutById(workoutId);
  if (workout.userId !== userId) throw new Error("Unauthorized");

  await db.delete(workouts).where(eq(workouts.id, workoutId));
}
```

### ❌ Don't Expose Secret Keys
```typescript
// ❌ WRONG - Using secret key in client component
"use client";
const API_KEY = process.env.CLERK_SECRET_KEY; // Never do this!

// ✅ CORRECT - Secret keys only in server code
// Server Component or Server Action
const { userId } = await auth(); // Uses CLERK_SECRET_KEY internally
```

---

## Checklist for Auth Implementation

Before committing authentication-related code, verify:

- [ ] Uses **Clerk only** (no custom auth)
- [ ] Imports from `@clerk/nextjs` or `@clerk/nextjs/server` (not deprecated packages)
- [ ] Uses `clerkMiddleware()` (not `authMiddleware()`)
- [ ] Server-side code uses `auth()` from `@clerk/nextjs/server`
- [ ] Client-side code uses Clerk components (`<SignedIn>`, `<SignedOut>`, etc.)
- [ ] ALL database queries filter by `userId`
- [ ] Auth checks verify `userId` exists before data operations
- [ ] Protected routes verified in both middleware AND page component
- [ ] No sensitive operations rely solely on client-side auth
- [ ] Environment variables are in `.env.local` (not committed)
- [ ] Error messages don't leak sensitive information

---

## Summary

**The Three Pillars of Auth in This App:**

1. **Clerk Only**
   - Use Clerk for all authentication
   - Import from `@clerk/nextjs` or `@clerk/nextjs/server`
   - Never implement custom auth

2. **Server-Side First**
   - Use `auth()` in Server Components and Actions
   - Verify auth before any sensitive operation
   - Don't trust client-side auth for data access

3. **User Data Isolation**
   - ALWAYS filter queries by `userId`
   - Verify ownership before mutations
   - Never expose one user's data to another

**Related Documentation:**
- See `/docs/data-fetching.md` for complete data security patterns
- See `/docs/ui.md` for UI component standards (including auth buttons)
