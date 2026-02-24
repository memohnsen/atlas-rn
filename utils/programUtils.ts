import { Day, DayRating, Exercise, Program, Week } from '@/types/program';
import { addDays, format } from 'date-fns';

const dayLabelToDayOfWeek: Record<string, number> = {
  sunday: 0,
  sun: 0,
  monday: 1,
  mon: 1,
  tuesday: 2,
  tue: 2,
  tues: 2,
  wednesday: 3,
  wed: 3,
  thursday: 4,
  thu: 4,
  thur: 4,
  thurs: 4,
  friday: 5,
  fri: 5,
  saturday: 6,
  sat: 6,
}

export const resolveProgramDayDate = (
  program: Program | undefined,
  day: Day,
  weekNumber: number
) => {
  if (!program) return null
  if (day.scheduledDate) return day.scheduledDate

  const programStart = new Date(program.startDate)
  const programStartDayOfWeek = programStart.getDay()
  const weekOffset = (weekNumber - 1) * 7
  const dayKey = (day.dayLabel ?? day.dayOfWeek ?? '').trim().toLowerCase()
  const targetDayOfWeek = dayLabelToDayOfWeek[dayKey]

  if (targetDayOfWeek === undefined) {
    const fallbackDate = addDays(programStart, weekOffset + Math.max(day.dayNumber - 1, 0))
    return format(fallbackDate, 'yyyy-MM-dd')
  }

  let dayOffset = targetDayOfWeek - programStartDayOfWeek
  if (dayOffset < 0) dayOffset += 7

  const trainingDate = addDays(programStart, weekOffset + dayOffset)
  return format(trainingDate, 'yyyy-MM-dd')
}

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

  const targetDateStr = format(targetDate, 'yyyy-MM-dd')

  for (const week of program.weeks) {
    for (const day of week.days) {
      const trainingDateStr = resolveProgramDayDate(program, day, week.weekNumber)

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
