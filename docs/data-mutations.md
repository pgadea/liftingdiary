# Data Mutations

This document outlines the **required** patterns for data mutations (create, update, delete operations) in this application.

## CRITICAL RULES

### 1. Server Actions ONLY

**ALL data mutations MUST be done via Server Actions.**

✅ **CORRECT** - Data mutations via Server Actions:
```typescript
// src/app/workouts/actions.ts
"use server";

import { createWorkout } from "@/data/workouts";
import { z } from "zod";

const createWorkoutSchema = z.object({
  name: z.string().min(1),
  date: z.date(),
});

export async function createWorkoutAction(data: { name: string; date: Date }) {
  const validated = createWorkoutSchema.parse(data);
  return await createWorkout(validated);
}
```

❌ **INCORRECT** - Do NOT mutate data in:
- Client Components
- Route Handlers (`/api` routes)
- Server Components directly
- Any other method

### 2. Server Actions in Colocated `actions.ts` Files

**ALL Server Actions MUST be in colocated `actions.ts` files next to the features that use them.**

File structure:
```
src/app/
├── workouts/
│   ├── page.tsx           # Page component
│   ├── actions.ts         # Server Actions for workouts
│   └── create/
│       ├── page.tsx       # Create workout page
│       └── actions.ts     # Server Actions for creating workouts
├── exercises/
│   ├── page.tsx
│   └── actions.ts         # Server Actions for exercises
```

✅ **CORRECT** - Colocated actions:
```typescript
// src/app/workouts/actions.ts
"use server";

// Actions for workout-related operations
export async function createWorkoutAction(data: CreateWorkoutInput) { }
export async function updateWorkoutAction(data: UpdateWorkoutInput) { }
export async function deleteWorkoutAction(id: string) { }
```

❌ **INCORRECT** - Centralized actions directory:
```typescript
// ❌ Don't create src/actions/workouts.ts
// ❌ Don't put all actions in one file
```

### 3. Typed Parameters (NO FormData)

**ALL Server Action parameters MUST be explicitly typed. Do NOT use FormData type.**

✅ **CORRECT** - Typed parameters:
```typescript
"use server";

import { z } from "zod";

const createWorkoutSchema = z.object({
  name: z.string().min(1),
  date: z.date(),
  exercises: z.array(z.object({
    id: z.string(),
    sets: z.number(),
  })),
});

type CreateWorkoutInput = z.infer<typeof createWorkoutSchema>;

export async function createWorkoutAction(data: CreateWorkoutInput) {
  const validated = createWorkoutSchema.parse(data);
  return await createWorkout(validated);
}
```

❌ **INCORRECT** - FormData type:
```typescript
// ❌ NEVER use FormData as parameter type
export async function createWorkoutAction(formData: FormData) {
  const name = formData.get("name");
  // ...
}
```

### 4. Zod Validation (MANDATORY)

**ALL Server Actions MUST validate their arguments using Zod schemas.**

✅ **CORRECT** - Zod validation:
```typescript
"use server";

import { z } from "zod";
import { createWorkout } from "@/data/workouts";

// Define schema
const createWorkoutSchema = z.object({
  name: z.string().min(1, "Name is required"),
  date: z.date(),
  notes: z.string().optional(),
});

// Infer type from schema
type CreateWorkoutInput = z.infer<typeof createWorkoutSchema>;

export async function createWorkoutAction(data: CreateWorkoutInput) {
  // Validate - throws if invalid
  const validated = createWorkoutSchema.parse(data);

  // Call data helper
  return await createWorkout(validated);
}
```

❌ **INCORRECT** - No validation:
```typescript
// ❌ NEVER skip validation
export async function createWorkoutAction(data: { name: string; date: Date }) {
  // Missing validation - unsafe!
  return await createWorkout(data);
}
```

### 5. Data Layer Helpers in `/data` Directory

**ALL database mutations MUST be done through helper functions in the `/data` directory.**

These helper functions:
- **MUST** use Drizzle ORM (NO raw SQL)
- **MUST** be marked with `"use server"` directive
- **MUST** enforce user data isolation (filter by userId)
- **MUST** return the mutated data or affected rows

✅ **CORRECT** - Data helper in `/data`:
```typescript
// src/data/workouts.ts
"use server";

import { auth } from "@clerk/nextjs/server";
import { db } from "@/db";
import { workouts } from "@/db/schema";
import { eq } from "drizzle-orm";

export async function createWorkout(data: { name: string; date: Date }) {
  const { userId } = await auth();

  if (!userId) {
    throw new Error("Unauthorized");
  }

  const [workout] = await db
    .insert(workouts)
    .values({
      userId,
      name: data.name,
      date: data.date,
    })
    .returning();

  return workout;
}

export async function updateWorkout(id: string, data: { name?: string; date?: Date }) {
  const { userId } = await auth();

  if (!userId) {
    throw new Error("Unauthorized");
  }

  // Security: Ensure user owns this workout
  const [updated] = await db
    .update(workouts)
    .set(data)
    .where(eq(workouts.id, id))
    .where(eq(workouts.userId, userId)) // CRITICAL: Filter by userId
    .returning();

  if (!updated) {
    throw new Error("Workout not found or unauthorized");
  }

  return updated;
}

export async function deleteWorkout(id: string) {
  const { userId } = await auth();

  if (!userId) {
    throw new Error("Unauthorized");
  }

  // Security: Ensure user owns this workout
  const [deleted] = await db
    .delete(workouts)
    .where(eq(workouts.id, id))
    .where(eq(workouts.userId, userId)) // CRITICAL: Filter by userId
    .returning();

  if (!deleted) {
    throw new Error("Workout not found or unauthorized");
  }

  return deleted;
}
```

❌ **INCORRECT** - Do NOT:
```typescript
// ❌ NO raw SQL
const result = await db.execute(sql`INSERT INTO workouts ...`);

// ❌ NO mutations directly in Server Actions
export async function createWorkoutAction(data: CreateWorkoutInput) {
  const validated = createWorkoutSchema.parse(data);

  // WRONG - Don't mutate directly in action
  const [workout] = await db.insert(workouts).values(validated).returning();
  return workout;
}

// ❌ NO mutations without user isolation
export async function deleteWorkout(id: string) {
  // DANGEROUS - Missing userId check!
  await db.delete(workouts).where(eq(workouts.id, id));
}
```

## Complete Data Mutation Flow

### 1. Define Database Schema

```typescript
// src/db/schema.ts
import { pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";

export const workouts = pgTable("workouts", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: text("user_id").notNull(), // CRITICAL: Every table needs userId
  name: text("name").notNull(),
  date: timestamp("date").notNull(),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});
```

### 2. Create Data Layer Helper

```typescript
// src/data/workouts.ts
"use server";

import { auth } from "@clerk/nextjs/server";
import { db } from "@/db";
import { workouts } from "@/db/schema";
import { eq, and } from "drizzle-orm";

export async function createWorkout(data: {
  name: string;
  date: Date;
  notes?: string;
}) {
  const { userId } = await auth();

  if (!userId) {
    throw new Error("Unauthorized");
  }

  const [workout] = await db
    .insert(workouts)
    .values({
      userId,
      name: data.name,
      date: data.date,
      notes: data.notes,
    })
    .returning();

  return workout;
}

export async function updateWorkout(
  id: string,
  data: {
    name?: string;
    date?: Date;
    notes?: string;
  }
) {
  const { userId } = await auth();

  if (!userId) {
    throw new Error("Unauthorized");
  }

  const [updated] = await db
    .update(workouts)
    .set({
      ...data,
      updatedAt: new Date(),
    })
    .where(and(
      eq(workouts.id, id),
      eq(workouts.userId, userId) // Security: User isolation
    ))
    .returning();

  if (!updated) {
    throw new Error("Workout not found or unauthorized");
  }

  return updated;
}

export async function deleteWorkout(id: string) {
  const { userId } = await auth();

  if (!userId) {
    throw new Error("Unauthorized");
  }

  const [deleted] = await db
    .delete(workouts)
    .where(and(
      eq(workouts.id, id),
      eq(workouts.userId, userId) // Security: User isolation
    ))
    .returning();

  if (!deleted) {
    throw new Error("Workout not found or unauthorized");
  }

  return deleted;
}
```

### 3. Create Zod Schemas

```typescript
// src/app/workouts/actions.ts
"use server";

import { z } from "zod";

// Define validation schemas
export const createWorkoutSchema = z.object({
  name: z.string().min(1, "Workout name is required").max(100, "Name too long"),
  date: z.date(),
  notes: z.string().max(500, "Notes too long").optional(),
});

export const updateWorkoutSchema = z.object({
  id: z.string().uuid("Invalid workout ID"),
  name: z.string().min(1, "Workout name is required").max(100, "Name too long").optional(),
  date: z.date().optional(),
  notes: z.string().max(500, "Notes too long").optional(),
});

export const deleteWorkoutSchema = z.object({
  id: z.string().uuid("Invalid workout ID"),
});

// Infer types from schemas
export type CreateWorkoutInput = z.infer<typeof createWorkoutSchema>;
export type UpdateWorkoutInput = z.infer<typeof updateWorkoutSchema>;
export type DeleteWorkoutInput = z.infer<typeof deleteWorkoutSchema>;
```

### 4. Create Server Actions

```typescript
// src/app/workouts/actions.ts (continued)
import { createWorkout, updateWorkout, deleteWorkout } from "@/data/workouts";
import { revalidatePath } from "next/cache";

export async function createWorkoutAction(input: CreateWorkoutInput) {
  // 1. Validate input
  const validated = createWorkoutSchema.parse(input);

  // 2. Call data layer helper
  const workout = await createWorkout(validated);

  // 3. Revalidate relevant paths
  revalidatePath("/workouts");
  revalidatePath("/dashboard");

  // 4. Return result
  return workout;
}

export async function updateWorkoutAction(input: UpdateWorkoutInput) {
  // 1. Validate input
  const validated = updateWorkoutSchema.parse(input);

  // 2. Extract ID and data
  const { id, ...data } = validated;

  // 3. Call data layer helper
  const workout = await updateWorkout(id, data);

  // 4. Revalidate relevant paths
  revalidatePath("/workouts");
  revalidatePath(`/workouts/${id}`);
  revalidatePath("/dashboard");

  // 5. Return result
  return workout;
}

export async function deleteWorkoutAction(input: DeleteWorkoutInput) {
  // 1. Validate input
  const validated = deleteWorkoutSchema.parse(input);

  // 2. Call data layer helper
  const deleted = await deleteWorkout(validated.id);

  // 3. Revalidate relevant paths
  revalidatePath("/workouts");
  revalidatePath("/dashboard");

  // 4. Return result
  return deleted;
}
```

### 5. Use Server Actions in Client Components

```typescript
// src/app/workouts/create/page.tsx
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { createWorkoutAction } from "../actions";

export default function CreateWorkoutPage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [date, setDate] = useState(new Date());
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      setLoading(true);
      setError(null);

      // Call server action
      await createWorkoutAction({ name, date });

      // Redirect on success
      router.push("/workouts");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create workout");
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      <Input
        type="text"
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder="Workout name"
      />

      {/* Date picker component */}

      {error && <p className="text-red-500">{error}</p>}

      <Button type="submit" disabled={loading}>
        {loading ? "Creating..." : "Create Workout"}
      </Button>
    </form>
  );
}
```

## Error Handling

### Validation Errors

```typescript
"use server";

import { z } from "zod";

export async function createWorkoutAction(input: CreateWorkoutInput) {
  try {
    // parse() throws ZodError if validation fails
    const validated = createWorkoutSchema.parse(input);
    return await createWorkout(validated);
  } catch (error) {
    if (error instanceof z.ZodError) {
      // Return validation errors to client
      throw new Error(error.errors.map(e => e.message).join(", "));
    }
    throw error;
  }
}
```

### Client-Side Error Handling

```typescript
"use client";

import { useState } from "react";
import { createWorkoutAction } from "./actions";

export function CreateWorkoutForm() {
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (data: CreateWorkoutInput) => {
    try {
      setError(null);
      await createWorkoutAction(data);
      // Success handling
    } catch (err) {
      // Display error to user
      setError(err instanceof Error ? err.message : "An error occurred");
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      {/* Form fields */}
      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}
    </form>
  );
}
```

## Optimistic Updates (Optional)

For better UX, you can use optimistic updates with Server Actions:

```typescript
"use client";

import { experimental_useOptimistic as useOptimistic } from "react";
import { updateWorkoutAction } from "./actions";

export function WorkoutItem({ workout }) {
  const [optimisticWorkout, addOptimisticWorkout] = useOptimistic(
    workout,
    (state, newName: string) => ({ ...state, name: newName })
  );

  const handleUpdate = async (newName: string) => {
    // Optimistically update UI
    addOptimisticWorkout(newName);

    // Send to server
    await updateWorkoutAction({ id: workout.id, name: newName });
  };

  return <div>{optimisticWorkout.name}</div>;
}
```

## Revalidation

Always revalidate affected paths after mutations:

```typescript
"use server";

import { revalidatePath } from "next/cache";

export async function createWorkoutAction(input: CreateWorkoutInput) {
  const validated = createWorkoutSchema.parse(input);
  const workout = await createWorkout(validated);

  // Revalidate all affected paths
  revalidatePath("/workouts");           // Workouts list page
  revalidatePath("/dashboard");          // Dashboard
  revalidatePath(`/workouts/${workout.id}`); // New workout detail page

  // Return data the client needs (e.g. for redirect)
  return workout;
}
```

## No Redirects in Server Actions

**NEVER call `redirect()` inside a Server Action. Redirects MUST be done client-side after the action resolves.**

✅ **CORRECT** - Client-side redirect after action:
```typescript
// Client Component
"use client";

import { useRouter } from "next/navigation";
import { createWorkoutAction } from "./actions";

export function CreateWorkoutForm() {
  const router = useRouter();

  const handleSubmit = async (data: CreateWorkoutInput) => {
    const workout = await createWorkoutAction(data);
    router.push(`/workouts/${workout.id}`); // Redirect client-side
  };
}
```

❌ **INCORRECT** - `redirect()` inside a Server Action:
```typescript
"use server";

import { redirect } from "next/navigation";

export async function createWorkoutAction(input: CreateWorkoutInput) {
  const validated = createWorkoutSchema.parse(input);
  const workout = await createWorkout(validated);

  revalidatePath("/workouts");

  redirect(`/workouts/${workout.id}`); // ❌ NEVER do this
}
```

**Why?** Calling `redirect()` in a Server Action throws internally and prevents the client from handling errors or performing any follow-up logic. Client-side navigation gives the calling component full control over the post-mutation flow.

## Security Checklist

Before committing any data mutation code, verify:

### Server Actions
- [ ] Action is in a colocated `actions.ts` file
- [ ] File starts with `"use server"` directive
- [ ] Parameters are explicitly typed (NOT FormData)
- [ ] Input is validated with Zod schema
- [ ] Calls data helper function (doesn't mutate DB directly)
- [ ] Revalidates affected paths
- [ ] Handles errors appropriately

### Data Layer Helpers
- [ ] Function is in `/data` directory
- [ ] File starts with `"use server"` directive
- [ ] Uses `await auth()` to get `userId`
- [ ] Checks `if (!userId)` and throws error
- [ ] Filters mutations by `userId` using Drizzle ORM
- [ ] Uses Drizzle ORM operators (NO raw SQL)
- [ ] Returns the mutated data
- [ ] Only affects data belonging to authenticated user

## Common Patterns

### Create with Related Data

```typescript
// src/data/workouts.ts
export async function createWorkoutWithExercises(data: {
  name: string;
  date: Date;
  exercises: { exerciseId: string; sets: number; reps: number }[];
}) {
  const { userId } = await auth();

  if (!userId) {
    throw new Error("Unauthorized");
  }

  // Use transaction for multiple related inserts
  return await db.transaction(async (tx) => {
    // Create workout
    const [workout] = await tx
      .insert(workouts)
      .values({
        userId,
        name: data.name,
        date: data.date,
      })
      .returning();

    // Create workout exercises
    if (data.exercises.length > 0) {
      await tx.insert(workoutExercises).values(
        data.exercises.map(ex => ({
          workoutId: workout.id,
          exerciseId: ex.exerciseId,
          sets: ex.sets,
          reps: ex.reps,
        }))
      );
    }

    return workout;
  });
}
```

### Batch Mutations

```typescript
// src/data/workouts.ts
export async function deleteWorkouts(ids: string[]) {
  const { userId } = await auth();

  if (!userId) {
    throw new Error("Unauthorized");
  }

  const deleted = await db
    .delete(workouts)
    .where(and(
      inArray(workouts.id, ids),
      eq(workouts.userId, userId) // Security: User isolation
    ))
    .returning();

  return deleted;
}
```

### Conditional Updates

```typescript
// src/data/workouts.ts
export async function updateWorkoutStatus(id: string, completed: boolean) {
  const { userId } = await auth();

  if (!userId) {
    throw new Error("Unauthorized");
  }

  const [updated] = await db
    .update(workouts)
    .set({
      completed,
      completedAt: completed ? new Date() : null,
      updatedAt: new Date(),
    })
    .where(and(
      eq(workouts.id, id),
      eq(workouts.userId, userId)
    ))
    .returning();

  if (!updated) {
    throw new Error("Workout not found or unauthorized");
  }

  return updated;
}
```

## File Organization

```
src/
├── data/                    # Data layer helpers
│   ├── workouts.ts         # Workout CRUD operations
│   ├── exercises.ts        # Exercise CRUD operations
│   └── workout-exercises.ts # Junction table operations
├── app/
│   ├── workouts/
│   │   ├── page.tsx        # List workouts (Server Component)
│   │   ├── actions.ts      # Workout Server Actions
│   │   ├── [id]/
│   │   │   ├── page.tsx    # Workout detail (Server Component)
│   │   │   └── actions.ts  # Workout detail Server Actions
│   │   └── create/
│   │       ├── page.tsx    # Create workout form (Client Component)
│   │       └── actions.ts  # Create workout Server Actions
│   └── exercises/
│       ├── page.tsx
│       └── actions.ts      # Exercise Server Actions
```

## Why These Rules?

1. **Server Actions**: Type-safe, secure, integrated with React - no API routes needed
2. **Colocated `actions.ts`**: Easy to find, maintain, and understand which actions belong to which features
3. **Typed Parameters**: Better DX, catches errors at compile time, no manual FormData parsing
4. **Zod Validation**: Runtime type safety, detailed error messages, prevents invalid data from reaching DB
5. **Data Layer Helpers**: Separation of concerns, reusable logic, centralized security checks
6. **User Isolation**: Prevents data leaks and unauthorized access between users

## Summary

- ✅ Create **Server Actions** in colocated `actions.ts` files
- ✅ Use **typed parameters** (NOT FormData)
- ✅ **ALWAYS validate** with Zod schemas
- ✅ Call **data helpers** in `/data` directory
- ✅ Use **Drizzle ORM** in data helpers (no raw SQL)
- ✅ **ALWAYS** filter by `userId` in data helpers
- ✅ **Revalidate paths** after mutations
- ❌ Never mutate data directly in Server Actions
- ❌ Never skip Zod validation
- ❌ Never use FormData type
- ❌ Never skip user authentication checks
- ❌ Never use raw SQL for mutations
