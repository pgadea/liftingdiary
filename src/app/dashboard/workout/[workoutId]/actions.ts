"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { updateWorkout } from "@/data/workouts";

const updateWorkoutSchema = z.object({
  name: z.string().min(1, "Workout name is required").max(100, "Name too long"),
  startedAt: z.date(),
});

type UpdateWorkoutInput = z.infer<typeof updateWorkoutSchema>;

export async function updateWorkoutAction(id: number, input: UpdateWorkoutInput) {
  const validated = updateWorkoutSchema.parse(input);

  const workout = await updateWorkout(id, validated);

  revalidatePath("/dashboard");
  revalidatePath(`/dashboard/workout/${id}`);

  return workout;
}
