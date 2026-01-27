export type WorkoutRating = 'Trash' | 'Below Average' | 'Average' | 'Above Average' | 'Crushing It'

export interface ProgramDay {
  id?: number
  user_id: string
  athlete_name: string
  program_name: string
  start_date: string // ISO date string (YYYY-MM-DD)
  week_number: number
  day_number: number
  day_of_week?: string | null
  completed: boolean
  rating: WorkoutRating | null
  created_at?: string
  updated_at?: string
}
