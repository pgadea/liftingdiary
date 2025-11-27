"use client";

import { useState, useEffect } from "react";
import { DatePicker } from "@/components/date-picker";
import { WorkoutCard } from "@/components/workout-card";
import { getWorkoutsWithDetails, WorkoutWithDetails } from "./actions";
import { SignedIn, SignedOut, SignInButton } from "@clerk/nextjs";
import { Loader2 } from "lucide-react";

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
        const data = await getWorkoutsWithDetails(selectedDate);
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
          <div className="text-center">
            <h1 className="text-3xl font-bold mb-4">Dashboard</h1>
            <p className="text-gray-600 mb-6">
              Please sign in to view your workout dashboard
            </p>
            <SignInButton mode="modal">
              <button className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">
                Sign In
              </button>
            </SignInButton>
          </div>
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
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
              <span className="ml-2 text-gray-600">Loading workouts...</span>
            </div>
          )}

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded mb-4">
              {error}
            </div>
          )}

          {!loading && !error && workouts.length === 0 && (
            <div className="text-center py-12 border rounded-lg bg-gray-50">
              <p className="text-gray-600 text-lg">
                No workouts logged for this date
              </p>
              <p className="text-gray-500 text-sm mt-2">
                Start tracking your workouts to see them here!
              </p>
            </div>
          )}

          {!loading && !error && workouts.length > 0 && (
            <div className="space-y-4">
              <h2 className="text-lg font-semibold text-gray-700">
                {workouts.length} {workouts.length === 1 ? "Workout" : "Workouts"}
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
