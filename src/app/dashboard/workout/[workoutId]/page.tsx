import { notFound } from "next/navigation";
import { getWorkout } from "@/data/workouts";
import { EditWorkoutForm } from "./edit-workout-form";

export default async function EditWorkoutPage({
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

  return <EditWorkoutForm workout={workout} />;
}
