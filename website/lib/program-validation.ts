import { GeneratedProgramWeek } from '@/types/workout'

type ValidationResult = {
  isValid: boolean
  message?: string
}

const parseCount = (value: string) => {
  const match = value.match(/(\d+(\.\d+)?)/)
  return match ? Number.parseFloat(match[1]) : null
}

const getListValues = (value: string) => {
  const trimmed = value.trim()
  if (!trimmed) {
    return []
  }
  return trimmed.split(',').map((entry) => entry.trim())
}

const expandListValues = (value: string, count: number) => {
  const values = getListValues(value)
  if (values.length === 0) {
    return Array.from({ length: count }, () => '')
  }
  if (values.length >= count) {
    return values.slice(0, count)
  }
  const last = values[values.length - 1] || ''
  return [...values, ...Array.from({ length: count - values.length }, () => last)]
}

const getSetCount = (sets: string, intensity: string, reps: string) => {
  const setsValue = parseCount(sets)
  const base = setsValue && setsValue > 0 ? Math.round(setsValue) : 1
  const intensityCount = getListValues(intensity).length
  const repsCount = getListValues(reps).length
  return Math.max(1, base, intensityCount, repsCount)
}

export const validateGeneratedProgramInputs = (
  weeks: GeneratedProgramWeek[]
): ValidationResult => {
  for (const week of weeks) {
    for (const day of week.days) {
      for (const exercise of day.exercises) {
        const exerciseLabel = exercise.name.trim() || `exercise on day ${day.dayNumber}`

        if (!exercise.name.trim()) {
          return {
            isValid: false,
            message: `Add a name for ${exerciseLabel} (week ${week.weekNumber}, day ${day.dayNumber}).`
          }
        }

        if (!exercise.category.trim()) {
          return {
            isValid: false,
            message: `Select a category for ${exerciseLabel} (week ${week.weekNumber}, day ${day.dayNumber}).`
          }
        }

        if (!exercise.sets.trim() || parseCount(exercise.sets) === null) {
          return {
            isValid: false,
            message: `Enter the set count for ${exerciseLabel} (week ${week.weekNumber}, day ${day.dayNumber}).`
          }
        }

        if (!exercise.reps.trim()) {
          return {
            isValid: false,
            message: `Fill in reps for ${exerciseLabel} (week ${week.weekNumber}, day ${day.dayNumber}).`
          }
        }

        if (!exercise.intensity.trim()) {
          return {
            isValid: false,
            message: `Fill in intensity for ${exerciseLabel} (week ${week.weekNumber}, day ${day.dayNumber}).`
          }
        }

        if (exercise.supersetGroup?.trim() && !exercise.supersetOrder?.trim()) {
          return {
            isValid: false,
            message: `Choose a superset order for ${exerciseLabel} (week ${week.weekNumber}, day ${day.dayNumber}).`
          }
        }

        const setCount = getSetCount(exercise.sets, exercise.intensity, exercise.reps)
        const intensityValues = expandListValues(exercise.intensity, setCount)
        const repsValues = expandListValues(exercise.reps, setCount)

        if (intensityValues.some((value) => value.trim() === '')) {
          return {
            isValid: false,
            message: `Fill in every intensity value for ${exerciseLabel} (week ${week.weekNumber}, day ${day.dayNumber}).`
          }
        }

        if (repsValues.some((value) => value.trim() === '')) {
          return {
            isValid: false,
            message: `Fill in every reps value for ${exerciseLabel} (week ${week.weekNumber}, day ${day.dayNumber}).`
          }
        }
      }
    }
  }

  return { isValid: true }
}
