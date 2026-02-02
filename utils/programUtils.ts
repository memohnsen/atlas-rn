import { Day, DayRating, Exercise, Program, Week } from '@/types/program';
import { addDays, format } from 'date-fns';

/**
 * Find a training day by its calendar date
 * @param program The training program
 * @param targetDate The calendar date to search for
 * @returns The matching day and week, or null if not found
 */
export const getTrainingDayByDate = (
  program: Program | undefined,
  targetDate: Date
): { day: Day; week: Week } | null => {
  if (!program) return null

  const programStart = new Date(program.startDate)
  const programStartDayOfWeek = programStart.getDay() // 0 = Sunday, 1 = Monday, etc.
  const targetDateStr = format(targetDate, 'yyyy-MM-dd')

  // Map day labels to day of week numbers (0 = Sunday, 1 = Monday, 6 = Saturday)
  const dayLabelToDayOfWeek: Record<string, number> = {
    Sunday: 0,
    Monday: 1,
    Tuesday: 2,
    Wednesday: 3,
    Thursday: 4,
    Friday: 5,
    Saturday: 6,
  }

  for (const week of program.weeks) {
    for (const day of week.days) {
      // Calculate the actual date for this training day
      const weekOffset = (week.weekNumber - 1) * 7

      // Get the target day of week for this training day
      const targetDayOfWeek = dayLabelToDayOfWeek[day.dayLabel || '']

      if (targetDayOfWeek === undefined) continue

      // Calculate how many days from program start to this training day
      let dayOffset = targetDayOfWeek - programStartDayOfWeek
      if (dayOffset < 0) dayOffset += 7 // Handle wrap-around (e.g., if program starts Wed and training is Mon)

      const trainingDate = addDays(programStart, weekOffset + dayOffset)
      const trainingDateStr = format(trainingDate, 'yyyy-MM-dd')

      if (trainingDateStr === targetDateStr) {
        return { day, week }
      }
    }
  }

  return null
}

const readinessDeltas: Record<DayRating, number> = {
  Trash: -8,
  'Below Average': -4,
  Average: 0,
  'Above Average': 4,
  'Crushing It': 8,
}

const categoryToPRExercise: Record<string, string> = {
  squat: 'back_squat',
}

export const getReadinessDelta = (rating?: DayRating | null) => {
  if (!rating) return 0
  return readinessDeltas[rating] ?? 0
}

export const getEffectivePercent = (basePercent: number, rating?: DayRating | null) => {
  const adjusted = basePercent + getReadinessDelta(rating)
  return Math.max(0, Math.min(100, adjusted))
}

export const getOneRepMax = (
  prs: Record<string, Record<string, number>> | undefined,
  exerciseCategory?: string | null
) => {
  if (!prs || !exerciseCategory) return undefined

  const normalized = exerciseCategory
    .toLowerCase()
    .trim()
    .replace(/\s+/g, '_')
    .replace(/-+/g, '_')

  const mapped = categoryToPRExercise[normalized]
  const candidates = [exerciseCategory, normalized, mapped].filter(Boolean) as string[]

  for (const key of candidates) {
    const entry = prs[key]
    if (entry && typeof entry['1rm'] === 'number') {
      return entry['1rm']
    }
  }

  return undefined
}

export const groupExercisesBySuperset = (exercises: Exercise[]) => {
  const groups = new Map<string, Exercise[]>()

  exercises.forEach((exercise) => {
    const key = exercise.supersetGroup?.trim() || ''
    if (!groups.has(key)) groups.set(key, [])
    groups.get(key)!.push(exercise)
  })

  const sortedKeys = Array.from(groups.keys()).sort((a, b) => {
    if (a === '' && b !== '') return -1
    if (b === '' && a !== '') return 1
    return a.localeCompare(b)
  })

  return sortedKeys.map((key) => ({
    key: key === '' ? 'Ungrouped' : key,
    exercises: groups.get(key)!.sort((a, b) => (a.supersetOrder ?? 0) - (b.supersetOrder ?? 0)),
  }))
}
