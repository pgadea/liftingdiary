"use server";

import { auth } from "@clerk/nextjs/server";
import { db, schema } from "@/db";
import { eq, and, gte, lt } from "drizzle-orm";

export interface WorkoutWithDetails {
  id: number;
  name: string;
  startedAt: Date;
  completedAt: Date | null;
  exercises: {
    id: number;
    name: string;
    order: number;
    sets: {
      id: number;
      setNumber: number;
      reps: number;
      weight: string;
    }[];
  }[];
}

export async function getWorkoutsWithDetails(dateString: string): Promise<WorkoutWithDetails[]> {
  // 1. Get authenticated user
  const { userId } = await auth();

  // 2. Verify authentication
  if (!userId) {
    throw new Error("Unauthorized");
  }

  // Parse the date string (YYYY-MM-DD format) as local date
  const [year, month, day] = dateString.split("-").map(Number);

  // Create date range for the selected day in local timezone
  const startOfDay = new Date(year, month - 1, day, 0, 0, 0, 0);
  const endOfDay = new Date(year, month - 1, day, 23, 59, 59, 999);

  try {
    // 3. Filter by user ID and started_at timestamp - CRITICAL!
    // Fetch workouts for the date and user
    const workouts = await db
      .select()
      .from(schema.workouts)
      .where(
        and(
          eq(schema.workouts.userId, userId),
          gte(schema.workouts.startedAt, startOfDay),
          lt(schema.workouts.startedAt, endOfDay)
        )
      )
      .orderBy(schema.workouts.startedAt);

    // Fetch all related data for each workout
    const workoutsWithDetails = await Promise.all(
      workouts.map(async (workout) => {
        // Get workout exercises
        const workoutExercises = await db
          .select({
            id: schema.workoutExercises.id,
            exerciseId: schema.workoutExercises.exerciseId,
            order: schema.workoutExercises.order,
            exerciseName: schema.exercises.name,
          })
          .from(schema.workoutExercises)
          .innerJoin(
            schema.exercises,
            eq(schema.workoutExercises.exerciseId, schema.exercises.id)
          )
          .where(eq(schema.workoutExercises.workoutId, workout.id))
          .orderBy(schema.workoutExercises.order);

        // Get sets for each exercise
        const exercises = await Promise.all(
          workoutExercises.map(async (workoutExercise) => {
            const sets = await db
              .select()
              .from(schema.sets)
              .where(eq(schema.sets.workoutExerciseId, workoutExercise.id))
              .orderBy(schema.sets.setNumber);

            return {
              id: workoutExercise.exerciseId,
              name: workoutExercise.exerciseName,
              order: workoutExercise.order,
              sets: sets.map((set) => ({
                id: set.id,
                setNumber: set.setNumber,
                reps: set.reps,
                weight: set.weight,
              })),
            };
          })
        );

        return {
          id: workout.id,
          name: workout.name,
          startedAt: workout.startedAt,
          completedAt: workout.completedAt,
          exercises,
        };
      })
    );

    return workoutsWithDetails;
  } catch (error) {
    console.error("Error fetching workouts with details:", error);
    throw new Error("Failed to fetch workouts");
  }
}
