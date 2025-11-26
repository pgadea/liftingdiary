import { pgTable, serial, text, timestamp, integer, numeric } from 'drizzle-orm/pg-core';

// Workouts table
export const workouts = pgTable('workouts', {
  id: serial('id').primaryKey(),
  userId: text('user_id').notNull(),
  name: text('name').notNull(),
  date: timestamp('date').notNull(),
  startedAt: timestamp('started_at').notNull(),
  completedAt: timestamp('completed_at'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

// Exercises table (exercise library/catalog)
export const exercises = pgTable('exercises', {
  id: serial('id').primaryKey(),
  name: text('name').notNull(),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

// Workout-Exercise junction table
export const workoutExercises = pgTable('workout_exercises', {
  id: serial('id').primaryKey(),
  workoutId: integer('workout_id')
    .notNull()
    .references(() => workouts.id, { onDelete: 'cascade' }),
  exerciseId: integer('exercise_id')
    .notNull()
    .references(() => exercises.id, { onDelete: 'cascade' }),
  order: integer('order').notNull(),
});

// Sets table
export const sets = pgTable('sets', {
  id: serial('id').primaryKey(),
  workoutExerciseId: integer('workout_exercise_id')
    .notNull()
    .references(() => workoutExercises.id, { onDelete: 'cascade' }),
  setNumber: integer('set_number').notNull(),
  reps: integer('reps').notNull(),
  weight: numeric('weight').notNull(),
  createdAt: timestamp('created_at').notNull().defaultNow(),
});

// TypeScript types
export type Workout = typeof workouts.$inferSelect;
export type NewWorkout = typeof workouts.$inferInsert;

export type Exercise = typeof exercises.$inferSelect;
export type NewExercise = typeof exercises.$inferInsert;

export type WorkoutExercise = typeof workoutExercises.$inferSelect;
export type NewWorkoutExercise = typeof workoutExercises.$inferInsert;

export type Set = typeof sets.$inferSelect;
export type NewSet = typeof sets.$inferInsert;
