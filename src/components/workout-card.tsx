import { format } from "date-fns";
import { WorkoutWithDetails } from "@/data/workouts";
import { Dumbbell, Clock } from "lucide-react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

interface WorkoutCardProps {
  workout: WorkoutWithDetails;
}

export function WorkoutCard({ workout }: WorkoutCardProps) {
  const formatTime = (date: Date) => {
    return format(new Date(date), "h:mm a");
  };

  const calculateDuration = () => {
    if (!workout.completedAt) return "In Progress";

    const start = new Date(workout.startedAt).getTime();
    const end = new Date(workout.completedAt).getTime();
    const durationMs = end - start;

    const minutes = Math.floor(durationMs / 60000);
    const hours = Math.floor(minutes / 60);
    const remainingMinutes = minutes % 60;

    if (hours > 0) {
      return `${hours}h ${remainingMinutes}m`;
    }
    return `${minutes}m`;
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex justify-between items-start">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Dumbbell className="w-5 h-5" />
              {workout.name}
            </CardTitle>
            <div className="flex items-center gap-4 mt-2 text-sm text-muted-foreground">
              <span className="flex items-center gap-1">
                <Clock className="w-4 h-4" />
                {formatTime(workout.startedAt)}
              </span>
              {workout.completedAt && (
                <Badge variant="default" className="bg-green-600 hover:bg-green-700">
                  Completed
                </Badge>
              )}
              {!workout.completedAt && (
                <Badge variant="secondary">
                  In Progress
                </Badge>
              )}
            </div>
          </div>
          <div className="text-right">
            <div className="text-sm text-muted-foreground">Duration</div>
            <div className="text-lg font-semibold">{calculateDuration()}</div>
          </div>
        </div>
      </CardHeader>

      <CardContent>
        {workout.exercises.length > 0 && (
          <div className="space-y-4">
            {workout.exercises.map((exercise) => (
              <div key={exercise.id} className="border-t pt-4 first:border-t-0 first:pt-0">
                <h4 className="font-medium mb-2">{exercise.name}</h4>
                <div className="grid grid-cols-3 gap-2 text-sm">
                  <div className="font-semibold text-muted-foreground">Set</div>
                  <div className="font-semibold text-muted-foreground">Reps</div>
                  <div className="font-semibold text-muted-foreground">Weight (lbs)</div>
                  {exercise.sets.map((set) => (
                    <div key={set.id} className="contents">
                      <div>{set.setNumber}</div>
                      <div>{set.reps}</div>
                      <div>{set.weight}</div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}

        {workout.exercises.length === 0 && (
          <div className="text-center text-muted-foreground py-4">
            No exercises logged yet
          </div>
        )}
      </CardContent>
    </Card>
  );
}
