import { format } from "date-fns";
import { WorkoutCard } from "@/components/workout-card";
import { getWorkoutsWithDetails, WorkoutWithDetails } from "@/data/workouts";
import { SignedIn, SignedOut, SignInButton } from "@clerk/nextjs";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { DashboardDatePicker } from "./date-picker-client";

interface DashboardPageProps {
  searchParams: Promise<{ date?: string }>;
}

function formatDateToLocalString(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function parseDateString(dateString: string): Date {
  // Parse YYYY-MM-DD as local date, not UTC
  const [year, month, day] = dateString.split("-").map(Number);
  return new Date(year, month - 1, day);
}

export default async function DashboardPage({ searchParams }: DashboardPageProps) {
  const params = await searchParams;

  // Get date from URL params or default to today
  const dateString = params.date || formatDateToLocalString(new Date());
  const selectedDate = parseDateString(dateString);

  // Fetch workouts in Server Component - following documentation pattern
  let workouts: WorkoutWithDetails[] = [];
  let error = null;

  try {
    workouts = await getWorkoutsWithDetails(dateString);
  } catch (err) {
    error = err instanceof Error ? err.message : "Failed to load workouts";
    console.error("Error loading workouts:", err);
  }

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
            <DashboardDatePicker selectedDate={selectedDate} />
          </div>

          {error && (
            <Card className="border-destructive">
              <CardContent className="p-4">
                <p className="text-destructive">{error}</p>
              </CardContent>
            </Card>
          )}

          {!error && workouts.length === 0 && (
            <Card>
              <CardContent className="flex flex-col items-center justify-center p-12 text-center">
                <p className="text-lg font-medium">No workouts logged for {format(selectedDate, "do MMM yyyy")}</p>
                <p className="text-sm text-muted-foreground mt-2">
                  Start tracking your workouts to see them here!
                </p>
              </CardContent>
            </Card>
          )}

          {!error && workouts.length > 0 && (
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
