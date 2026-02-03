export type DayRating = "Trash" | "Below Average" | "Average" | "Above Average" | "Crushing It"

export interface RepTargets {
  snatch: string
  clean: string
  jerk: string
  squat: string
  pull: string
}

export interface WeekTotal {
  weekNumber: number
  total: string
}

export interface Exercise {
  exerciseNumber: number
  exerciseName: string
  exerciseCategory?: string
  exerciseNotes?: string
  supersetGroup?: string
  supersetOrder?: number
  sets?: number
  reps: string | string[]
  weights?: number
  setWeights?: number[]
  percent?: number | number[]
  setStatuses?: Array<'pending' | 'complete' | 'miss'>
  completed: boolean
  athleteComments?: string
}

export interface Day {
  dayNumber: number
  dayOfWeek?: string
  dayLabel?: string
  completed: boolean
  rating?: DayRating
  sessionIntensity?: number
  completedAt?: number
  exercises: Exercise[]
}

export interface Week {
  weekNumber: number
  days: Day[]
}

export interface Program {
  userId: string
  athleteName: string
  programName: string
  startDate: string
  weekCount: number
  repTargets: RepTargets
  weekTotals: WeekTotal[]
  weeks: Week[]
}
