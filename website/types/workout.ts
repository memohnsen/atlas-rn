export interface WorkoutRecord {
  id?: number
  user_id: string
  athlete_name: string
  program_name: string
  start_date: string // ISO date string (YYYY-MM-DD)
  week_number: number
  day_number: number | null
  day_of_week?: string | null
  exercise_number: number
  exercise_name: string
  exercise_category?: string | null
  exercise_notes?: string | null
  superset_group?: string | null
  superset_order?: number | null
  sets: number | null
  reps: string // Keep as string since it can be "10-15" range
  weights: number | null
  percent: number | null
  athlete_comments: string | null
  completed: boolean // Track if set is completed
  created_at?: string
  updated_at?: string
}

export interface ProgramLibraryRecord {
  id?: number
  user_id: string
  program_name: string
  week_number: number
  day_number: number | null
  day_of_week?: string | null
  exercise_number: number
  exercise_name: string
  exercise_category?: string | null
  exercise_notes?: string | null
  superset_group?: string | null
  superset_order?: number | null
  sets: number | null
  reps: string
  weights: number | null
  percent: number | null
  athlete_comments: string | null
  completed: boolean
  created_at?: string
  updated_at?: string
}

export interface ProgramLibraryTemplate {
  program_name: string
  rep_targets: RepTargets
  week_totals: WeekTotalReps[]
  week_count: number
  created_at?: string
  updated_at?: string
}

export interface ProgramMetadata {
  athlete_name: string
  program_name: string
  start_date: string
  rep_targets: RepTargets
  week_totals: WeekTotalReps[]
  week_count: number
  created_at?: string
  updated_at?: string
}

export interface ScrapeResponse {
  success?: boolean
  data?: WorkoutRecord[]
  count?: number
  error?: string
  suggestion?: string
  details?: string
  message?: string
}

export interface ScrapeRequest {
  url: string
  tabName: string
  athleteName?: string
}

export interface ProgramBuilderExercise {
  id: string
  name: string
  category: string
  intensity: string
  reps: string
  sets: string
  notes: string
  supersetGroup?: string
  supersetOrder?: string
}

export interface ProgramBuilderDay {
  id: string
  dayNumber: number
  dayLabel?: string | null
  dayOfWeek?: string | null
  exercises: ProgramBuilderExercise[]
  weekOverrides?: Record<number, Record<string, Partial<ProgramBuilderExercise>>>
}

export interface RepTargets {
  snatch: string
  clean: string
  jerk: string
  squat: string
  pull: string
}

export interface WeekTotalReps {
  weekNumber: number
  total: string
}

export interface GeneratedProgramDay {
  dayNumber: number
  dayLabel?: string | null
  dayOfWeek?: string | null
  exercises: ProgramBuilderExercise[]
}

export interface GeneratedProgramWeek {
  weekNumber: number
  days: GeneratedProgramDay[]
}
