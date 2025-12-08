# Data Fetching

This document outlines the **required** patterns for data fetching in this application.

## CRITICAL RULES

### 1. Server Components ONLY

**ALL data fetching MUST be done in Server Components.**

✅ **CORRECT** - Data fetching in Server Components:
```typescript
// src/app/dashboard/page.tsx
import { getWorkouts } from "@/data/workouts";

export default async function DashboardPage() {
  const workouts = await getWorkouts();

  return (
    <div>
      {workouts.map(workout => (
        <div key={workout.id}>{workout.name}</div>
      ))}
    </div>
  );
}
```

❌ **INCORRECT** - Do NOT fetch data in:
- Client Components (`"use client"`)
- Route Handlers (`/api` routes)
- Client-side effects (`useEffect`)
- Any other method

### 2. Database Queries via `/data` Directory

**ALL database queries MUST be done through helper functions in the `/data` directory.**

These helper functions:
- **MUST** use Drizzle ORM (NO raw SQL)
- **MUST** be marked with `"use server"` directive
- **MUST** enforce user data isolation (see Security section below)

✅ **CORRECT** - Helper function in `/data`:
```typescript
// src/data/workouts.ts
"use server";

import { auth } from "@clerk/nextjs/server";
import { db } from "@/db";
import { workouts } from "@/db/schema";
import { eq } from "drizzle-orm";

export async function getWorkouts() {
  const { userId } = await auth();

  if (!userId) {
    throw new Error("Unauthorized");
  }

  // Use Drizzle ORM - NO raw SQL
  return await db
    .select()
    .from(workouts)
    .where(eq(workouts.userId, userId));
}
```

❌ **INCORRECT** - Do NOT:
```typescript
// ❌ NO raw SQL queries
const result = await db.execute(sql`SELECT * FROM workouts WHERE user_id = ${userId}`);

// ❌ NO database queries directly in components
export default async function Page() {
  const data = await db.select().from(workouts); // WRONG!
  // ...
}

// ❌ NO queries without user isolation
export async function getWorkouts() {
  // Missing auth check - exposes ALL users' data!
  return await db.select().from(workouts);
}
```

### 3. User Data Isolation (SECURITY CRITICAL)

**Every database query MUST ensure users can ONLY access their own data.**

#### Required Pattern

Every data helper function MUST:
1. Get the authenticated user ID via `await auth()`
2. Verify the user is logged in
3. Filter ALL queries by the user's ID

```typescript
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

  // 3. Filter by user ID - CRITICAL!
  return await db
    .select()
    .from(workouts)
    .where(eq(workouts.userId, userId));
}

export async function getWorkoutById(workoutId: string) {
  const { userId } = await auth();

  if (!userId) {
    throw new Error("Unauthorized");
  }

  // Filter by BOTH workout ID AND user ID
  const workout = await db
    .select()
    .from(workouts)
    .where(
      eq(workouts.id, workoutId)
      // CRITICAL: Also check userId!
    )
    .limit(1);

  if (!workout.length) {
    throw new Error("Workout not found");
  }

  // Additional security check
  if (workout[0].userId !== userId) {
    throw new Error("Unauthorized");
  }

  return workout[0];
}
```

#### Security Checklist

Before committing any data helper function, verify:
- [ ] Uses `await auth()` to get `userId`
- [ ] Checks `if (!userId)` and throws error
- [ ] Filters query by `userId` using Drizzle ORM
- [ ] Uses `eq()` or other Drizzle operators (NO raw SQL)
- [ ] Returns ONLY data belonging to the authenticated user

## File Organization

```
src/
├── data/
│   ├── workouts.ts      # Workout-related queries
│   ├── exercises.ts     # Exercise-related queries
│   └── users.ts         # User-related queries
├── app/
│   └── dashboard/
│       └── page.tsx     # Imports from /data, renders UI
```

## Complete Example

### 1. Define Schema (with userId)

```typescript
// src/db/schema.ts
import { pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";

export const workouts = pgTable("workouts", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: text("user_id").notNull(), // CRITICAL: Every table needs userId
  name: text("name").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});
```

### 2. Create Data Helper

```typescript
// src/data/workouts.ts
"use server";

import { auth } from "@clerk/nextjs/server";
import { db } from "@/db";
import { workouts } from "@/db/schema";
import { eq } from "drizzle-orm";

export async function getWorkouts() {
  const { userId } = await auth();

  if (!userId) {
    throw new Error("Unauthorized");
  }

  return await db
    .select()
    .from(workouts)
    .where(eq(workouts.userId, userId))
    .orderBy(workouts.createdAt);
}

export async function createWorkout(name: string) {
  const { userId } = await auth();

  if (!userId) {
    throw new Error("Unauthorized");
  }

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

### 3. Use in Server Component

```typescript
// src/app/dashboard/page.tsx
import { getWorkouts } from "@/data/workouts";

export default async function DashboardPage() {
  // Fetch in Server Component
  const workouts = await getWorkouts();

  return (
    <div>
      <h1>My Workouts</h1>
      {workouts.map(workout => (
        <div key={workout.id}>{workout.name}</div>
      ))}
    </div>
  );
}
```

## Why These Rules?

1. **Server Components**: Direct database access without client-side overhead or security risks
2. **`/data` Directory**: Centralized, reusable, testable data access layer
3. **Drizzle ORM**: Type-safe queries, SQL injection prevention, better maintainability
4. **User Isolation**: Prevents data leaks and unauthorized access between users

## Summary

- ✅ Fetch data in **Server Components**
- ✅ Use **helper functions** in `/data` directory
- ✅ Use **Drizzle ORM** (no raw SQL)
- ✅ **ALWAYS** filter by `userId`
- ❌ Never fetch in Client Components
- ❌ Never use Route Handlers for data
- ❌ Never use raw SQL
- ❌ Never skip user authentication checks
