"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { createWorkout } from "@/data/workouts";

const createWorkoutSchema = z.object({
  name: z.string().min(1, "Workout name is required").max(100, "Name too long"),
  startedAt: z.date(),
});

type CreateWorkoutInput = z.infer<typeof createWorkoutSchema>;

export async function createWorkoutAction(input: CreateWorkoutInput) {
  const validated = createWorkoutSchema.parse(input);

  const workout = await createWorkout(validated);

  revalidatePath("/dashboard");

  return workout;
}
