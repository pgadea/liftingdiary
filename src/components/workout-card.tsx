import { WorkoutWithDetails } from "@/app/dashboard/actions";
import { Dumbbell, Clock } from "lucide-react";

interface WorkoutCardProps {
  workout: WorkoutWithDetails;
}

export function WorkoutCard({ workout }: WorkoutCardProps) {
  const formatTime = (date: Date) => {
    return new Date(date).toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    });
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
    <div className="border rounded-lg p-6 bg-white shadow-sm hover:shadow-md transition-shadow">
      <div className="flex justify-between items-start mb-4">
        <div>
          <h3 className="text-xl font-semibold flex items-center gap-2">
            <Dumbbell className="w-5 h-5" />
            {workout.name}
          </h3>
          <div className="flex items-center gap-4 mt-2 text-sm text-gray-600">
            <span className="flex items-center gap-1">
              <Clock className="w-4 h-4" />
              {formatTime(workout.startedAt)}
            </span>
            {workout.completedAt && (
              <span className="px-2 py-1 bg-green-100 text-green-700 rounded">
                Completed
              </span>
            )}
            {!workout.completedAt && (
              <span className="px-2 py-1 bg-yellow-100 text-yellow-700 rounded">
                In Progress
              </span>
            )}
          </div>
        </div>
        <div className="text-right">
          <div className="text-sm text-gray-500">Duration</div>
          <div className="text-lg font-semibold">{calculateDuration()}</div>
        </div>
      </div>

      {workout.exercises.length > 0 && (
        <div className="space-y-4">
          {workout.exercises.map((exercise) => (
            <div key={exercise.id} className="border-t pt-4">
              <h4 className="font-medium mb-2">{exercise.name}</h4>
              <div className="grid grid-cols-3 gap-2 text-sm">
                <div className="font-semibold text-gray-600">Set</div>
                <div className="font-semibold text-gray-600">Reps</div>
                <div className="font-semibold text-gray-600">Weight (lbs)</div>
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
        <div className="text-center text-gray-500 py-4">
          No exercises logged yet
        </div>
      )}
    </div>
  );
}
