# Server Components

This document outlines the **required** patterns for Server Components in this application.

## CRITICAL RULES

### 1. `params` and `searchParams` MUST Be Awaited

**This is a Next.js 15 project. `params` and `searchParams` are Promises and MUST be awaited.**

In Next.js 15, dynamic route parameters are no longer passed as plain objects — they are wrapped in a Promise. Accessing them without `await` will result in `undefined` or a runtime error.

✅ **CORRECT** — await params before use:
```typescript
// src/app/dashboard/workout/[workoutId]/page.tsx
export default async function EditWorkoutPage({
  params,
}: {
  params: Promise<{ workoutId: string }>;
}) {
  const { workoutId } = await params;

  return <div>{workoutId}</div>;
}
```

✅ **CORRECT** — await searchParams before use:
```typescript
// src/app/dashboard/page.tsx
export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ date?: string }>;
}) {
  const { date } = await searchParams;

  return <div>{date}</div>;
}
```

❌ **INCORRECT** — accessing params without awaiting:
```typescript
// ❌ DO NOT DO THIS — params is a Promise in Next.js 15
export default async function EditWorkoutPage({
  params,
}: {
  params: { workoutId: string }; // Wrong type
}) {
  const { workoutId } = params; // Will not work correctly

  return <div>{workoutId}</div>;
}
```

### 2. Always Type `params` as a Promise

**The TypeScript type for `params` MUST be `Promise<{ ... }>`, not a plain object.**

✅ **CORRECT** — Promise type:
```typescript
{ params: Promise<{ workoutId: string }> }
```

❌ **INCORRECT** — plain object type:
```typescript
{ params: { workoutId: string } }
```

Using the wrong type will cause TypeScript errors and mask runtime issues.

### 3. Pages Are `async` Functions

**All page components that use `params` or `searchParams` MUST be `async` functions** so that `await` can be used.

```typescript
// ✅ CORRECT — async page
export default async function Page({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  // ...
}
```

### 4. Validate Dynamic Params Before Use

**Always validate params from the URL before using them** (e.g. parsing integers, checking for valid values). Use `notFound()` from `next/navigation` when a param is invalid or the resource doesn't exist.

✅ **CORRECT** — parse and validate before use:
```typescript
import { notFound } from "next/navigation";

export default async function WorkoutPage({
  params,
}: {
  params: Promise<{ workoutId: string }>;
}) {
  const { workoutId } = await params;
  const id = parseInt(workoutId);

  if (isNaN(id)) {
    notFound();
  }

  const workout = await getWorkout(id);

  if (!workout) {
    notFound();
  }

  return <div>{workout.name}</div>;
}
```

❌ **INCORRECT** — using raw param string directly:
```typescript
// ❌ No validation — parseInt("abc") returns NaN and will break
const workout = await getWorkout(parseInt(params.workoutId));
```

---

## Complete Example

```typescript
// src/app/dashboard/workout/[workoutId]/page.tsx
import { notFound } from "next/navigation";
import { getWorkout } from "@/data/workouts";
import { EditWorkoutForm } from "./edit-workout-form";

export default async function EditWorkoutPage({
  params,
}: {
  params: Promise<{ workoutId: string }>;
}) {
  // 1. Await params — required in Next.js 15
  const { workoutId } = await params;

  // 2. Validate the param
  const id = parseInt(workoutId);
  if (isNaN(id)) {
    notFound();
  }

  // 3. Fetch data in the Server Component
  const workout = await getWorkout(id);
  if (!workout) {
    notFound();
  }

  // 4. Pass data down to a Client Component for interactivity
  return <EditWorkoutForm workout={workout} />;
}
```

---

## Summary

- ✅ **Always** type `params` as `Promise<{ ... }>`
- ✅ **Always** `await params` before destructuring
- ✅ **Always** make the page component `async`
- ✅ **Always** validate dynamic params before use
- ✅ Use `notFound()` for invalid or missing resources
- ❌ Never access `params` or `searchParams` without awaiting
- ❌ Never type `params` as a plain object
