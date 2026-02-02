import { Day, Program, Week } from '@/types/program';
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
