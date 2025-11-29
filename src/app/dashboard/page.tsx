"use client";

import { useState, useEffect } from "react";
import { format } from "date-fns";
import { DatePicker } from "@/components/date-picker";
import { WorkoutCard } from "@/components/workout-card";
import { getWorkoutsWithDetails, WorkoutWithDetails } from "./actions";
import { SignedIn, SignedOut, SignInButton } from "@clerk/nextjs";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

export default function DashboardPage() {
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [workouts, setWorkouts] = useState<WorkoutWithDetails[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadWorkouts() {
      setLoading(true);
      setError(null);
      try {
        // Convert Date to YYYY-MM-DD string format for the server action
        const year = selectedDate.getFullYear();
        const month = String(selectedDate.getMonth() + 1).padStart(2, "0");
        const day = String(selectedDate.getDate()).padStart(2, "0");
        const dateString = `${year}-${month}-${day}`;

        const data = await getWorkoutsWithDetails(dateString);
        setWorkouts(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load workouts");
        console.error("Error loading workouts:", err);
      } finally {
        setLoading(false);
      }
    }

    loadWorkouts();
  }, [selectedDate]);

  return (
    <>
      <SignedOut>
        <div className="flex flex-col items-center justify-center min-h-[calc(100vh-80px)] p-4">
          <Card className="max-w-md">
            <CardContent className="flex flex-col items-center text-center p-8">
              <h1 className="text-3xl font-bold mb-4">Dashboard</h1>
              <p className="text-muted-foreground mb-6">
                Please sign in to view your workout dashboard
              </p>
              <SignInButton mode="modal">
                <Button size="lg">Sign In</Button>
              </SignInButton>
            </CardContent>
          </Card>
        </div>
      </SignedOut>

      <SignedIn>
        <div className="max-w-4xl mx-auto p-6">
          <h1 className="text-3xl font-bold mb-6">Workout Dashboard</h1>

          <div className="mb-8">
            <DatePicker
              selectedDate={selectedDate}
              onDateChange={setSelectedDate}
            />
          </div>

          {loading && (
            <Card>
              <CardContent className="flex items-center justify-center p-12">
                <Loader2 className="w-8 h-8 animate-spin text-primary" />
                <span className="ml-2 text-muted-foreground">Loading workouts...</span>
              </CardContent>
            </Card>
          )}

          {error && (
            <Card className="border-destructive">
              <CardContent className="p-4">
                <p className="text-destructive">{error}</p>
              </CardContent>
            </Card>
          )}

          {!loading && !error && workouts.length === 0 && (
            <Card>
              <CardContent className="flex flex-col items-center justify-center p-12 text-center">
                <p className="text-lg font-medium">No workouts logged for {format(selectedDate, "do MMM yyyy")}</p>
                <p className="text-sm text-muted-foreground mt-2">
                  Start tracking your workouts to see them here!
                </p>
              </CardContent>
            </Card>
          )}

          {!loading && !error && workouts.length > 0 && (
            <div className="space-y-4">
              <h2 className="text-lg font-semibold">
                {workouts.length} {workouts.length === 1 ? "Workout" : "Workouts"} on {format(selectedDate, "do MMM yyyy")}
              </h2>
              {workouts.map((workout) => (
                <WorkoutCard key={workout.id} workout={workout} />
              ))}
            </div>
          )}
        </div>
      </SignedIn>
    </>
  );
}
