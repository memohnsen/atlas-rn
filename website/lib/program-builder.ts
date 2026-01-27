import { GeneratedProgramWeek, ProgramBuilderDay, ProgramBuilderExercise } from '@/types/workout'

const WEEK_COUNT = 4

const formatNumber = (value: number, decimals: number) => {
  const fixed = value.toFixed(decimals)
  return fixed.replace(/\.0+$/, '').replace(/(\.\d*?)0+$/, '$1')
}

const parseIntensityValues = (value: string) => {
  const matches = [...value.matchAll(/\d+(?:\.\d+)?/g)]
  if (matches.length === 0) {
    return [] as Array<{ value: number; decimals: number }>
  }

  return matches
    .map((match) => {
      const raw = match[0]
      const decimals = raw.includes('.') ? raw.split('.')[1].length : 0
      return {
        value: Number.parseFloat(raw),
        decimals
      }
    })
    .filter((entry) => !Number.isNaN(entry.value))
}

const buildWarmupIntensities = (topIntensity: number) => {
  if (!Number.isFinite(topIntensity) || topIntensity <= 0) {
    return []
  }

  if (topIntensity <= 60) {
    return [topIntensity]
  }

  const intensities = [60]
  let current = 60
  while (current < topIntensity - 10) {
    current += 5
    intensities.push(current)
  }

  let remaining = topIntensity - current
  if (remaining <= 0) {
    return intensities
  }
  if (remaining <= 4) {
    intensities.push(topIntensity)
    return intensities
  }

  current += 4
  intensities.push(current)
  remaining = topIntensity - current

  while (remaining > 0) {
    const step = remaining <= 3 ? remaining : 3
    current += step
    intensities.push(current)
    remaining = topIntensity - current
  }

  return intensities
}

const buildIntensityPlan = (baseIntensity: string, delta: number, workingSets: number) => {
  const values = parseIntensityValues(baseIntensity)
  if (values.length === 0) {
    return null
  }

  const maxEntry = values.reduce((max, entry) =>
    entry.value > max.value ? entry : max
  )

  const topIntensity = maxEntry.value + delta
  const warmups = buildWarmupIntensities(topIntensity)
  const decimals = maxEntry.decimals
  const topFormatted = `${formatNumber(topIntensity, decimals)}%`
  const formatted = warmups.map((value) => `${formatNumber(value, decimals)}%`)
  const extraTopSets = Math.max(workingSets - 1, 0)
  const fullList = [...formatted, ...Array.from({ length: extraTopSets }, () => topFormatted)]

  return {
    intensity: fullList.join(', '),
    setCount: fullList.length
  }
}

const adjustIntensity = (value: string, delta: number) => {
  const trimmed = value.trim()
  if (!trimmed) return ''

  const raw = trimmed.replace('%', '')
  if (raw.includes('-')) {
    const parts = raw.split('-').map((part) => part.trim())
    if (parts.length !== 2) return trimmed
    const [min, max] = parts
    const minValue = Number.parseFloat(min)
    const maxValue = Number.parseFloat(max)
    if (Number.isNaN(minValue) || Number.isNaN(maxValue)) return trimmed
    const minDecimals = min.includes('.') ? min.split('.')[1].length : 0
    const maxDecimals = max.includes('.') ? max.split('.')[1].length : 0
    const nextMin = formatNumber(minValue + delta, minDecimals)
    const nextMax = formatNumber(maxValue + delta, maxDecimals)
    return `${nextMin}-${nextMax}%`
  }

  const base = Number.parseFloat(raw)
  if (Number.isNaN(base)) return trimmed
  const decimals = raw.includes('.') ? raw.split('.')[1].length : 0
  const next = formatNumber(base + delta, decimals)
  return `${next}%`
}

const getWeekAdjustment = (offset: number) => {
  if (offset === 1) {
    return { delta: -5, workingSets: 3 }
  }
  if (offset === 2) {
    return { delta: 2, workingSets: 2 }
  }
  if (offset === 3) {
    return { delta: 5, workingSets: 1 }
  }
  return null
}

const buildExerciseForOffset = (exercise: ProgramBuilderExercise, offset: number) => {
  if (offset <= 0) {
    return { ...exercise }
  }

  if (!exercise.intensity.trim()) {
    return { ...exercise }
  }

  const adjustment = getWeekAdjustment(offset)
  if (!adjustment) {
    return { ...exercise }
  }

  const intensityPlan = buildIntensityPlan(
    exercise.intensity,
    adjustment.delta,
    adjustment.workingSets
  )

  return {
    ...exercise,
    reps: exercise.reps,
    sets: intensityPlan ? String(intensityPlan.setCount) : String(adjustment.workingSets),
    intensity: intensityPlan?.intensity || adjustIntensity(exercise.intensity, adjustment.delta)
  }
}

const applyExerciseOverrides = (
  exercise: ProgramBuilderExercise,
  override?: Partial<ProgramBuilderExercise>
) => {
  if (!override || Object.keys(override).length === 0) {
    return { ...exercise }
  }

  const merged: ProgramBuilderExercise = { ...exercise }
  const fields: Array<keyof ProgramBuilderExercise> = [
    'name',
    'category',
    'sets',
    'reps',
    'intensity',
    'notes',
    'supersetGroup',
    'supersetOrder'
  ]

  fields.forEach((field) => {
    const value = override[field]
    if (value !== undefined && value !== null && value !== '') {
      merged[field] = value
    }
  })

  return merged
}

export const buildGeneratedProgramWeeks = (
  days: ProgramBuilderDay[],
  weekCount = WEEK_COUNT,
  options?: { enableWeekAdjustments?: boolean }
): GeneratedProgramWeek[] => {
  if (days.length === 0) {
    return []
  }

  const enableWeekAdjustments = options?.enableWeekAdjustments ?? true
  const orderedDays = [...days].sort((a, b) => a.dayNumber - b.dayNumber)
  const weeks = Array.from({ length: weekCount }, (_, index) => index + 1)

  const dayExercisesByWeek = orderedDays.map((day) => {
    const exercisesByWeek = Array.from({ length: weekCount }, () => [] as ProgramBuilderExercise[])

    day.exercises.forEach((exercise) => {
      let baseExercise = { ...exercise }
      let baseWeekNumber = 1

      weeks.forEach((targetWeek, weekIndex) => {
        const overridesForWeek = day.weekOverrides?.[targetWeek]?.[exercise.id]
        const trimmedName = overridesForWeek?.name?.trim()
        const hasNameOverride = Boolean(trimmedName)
        const isNameChange = hasNameOverride && trimmedName !== baseExercise.name.trim()

        if (isNameChange) {
          baseExercise = applyExerciseOverrides(baseExercise, overridesForWeek)
          baseWeekNumber = targetWeek
          exercisesByWeek[weekIndex].push(baseExercise)
          return
        }

        const offset = targetWeek - baseWeekNumber
        const adjusted = enableWeekAdjustments
          ? buildExerciseForOffset(baseExercise, offset)
          : { ...baseExercise }
        const finalExercise = applyExerciseOverrides(adjusted, overridesForWeek)
        exercisesByWeek[weekIndex].push(finalExercise)

        if (targetWeek === 1) {
          baseExercise = finalExercise
        }
      })
    })

    return {
      dayNumber: day.dayNumber,
      dayLabel: day.dayLabel,
      exercisesByWeek
    }
  })

  return weeks.map((weekNumber, weekIndex) => ({
    weekNumber,
    days: dayExercisesByWeek.map((day) => ({
      dayNumber: day.dayNumber,
      dayLabel: day.dayLabel,
      exercises: day.exercisesByWeek[weekIndex] || []
    }))
  }))
}

export const applyProgramOverride = (
  days: ProgramBuilderDay[],
  dayNumber: number,
  exerciseId: string,
  field: keyof ProgramBuilderExercise,
  value: string,
  weekNumber: number
): ProgramBuilderDay[] =>
  days.map((day) => {
    if (day.dayNumber !== dayNumber) {
      return day
    }

    const weekOverrides = { ...(day.weekOverrides || {}) }
    const dayOverrides = { ...(weekOverrides[weekNumber] || {}) }
    const exerciseOverride = { ...(dayOverrides[exerciseId] || {}) }
    const trimmed = value.trim()

    if (trimmed) {
      exerciseOverride[field] = value
    } else {
      delete exerciseOverride[field]
    }

    if (Object.keys(exerciseOverride).length === 0) {
      delete dayOverrides[exerciseId]
    } else {
      dayOverrides[exerciseId] = exerciseOverride
    }

    if (Object.keys(dayOverrides).length === 0) {
      delete weekOverrides[weekNumber]
    } else {
      weekOverrides[weekNumber] = dayOverrides
    }

    return {
      ...day,
      weekOverrides
    }
  })
