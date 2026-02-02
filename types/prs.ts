export interface AthletePR {
  athleteName: string
  exerciseName: string
  repMax: number
  weight: number
  recordedAt?: number
}

export type LiftName = "snatch" | "clean" | "jerk" | "clean_jerk" | "back_squat" | "front_squat";

// Type for grouped PR data returned by getAthletePRs query
export type GroupedPRs = Record<string, Record<string, number>>;
