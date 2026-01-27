import { ProgramBuilderDay, ProgramBuilderExercise, WorkoutRecord } from '@/types/workout'

type ExerciseSnapshot = Pick<
  ProgramBuilderExercise,
  'name' | 'category' | 'sets' | 'reps' | 'intensity' | 'notes' | 'supersetGroup' | 'supersetOrder'
>

export const buildExerciseSnapshot = (
  records: WorkoutRecord[],
  fallbackName: string
): ExerciseSnapshot => {
  const sorted = [...records].sort((a, b) => (a.sets ?? 0) - (b.sets ?? 0))
  const base = sorted[0]
  const name = base?.exercise_name?.trim() ? base.exercise_name : fallbackName
  const category = sorted.find((record) => record.exercise_category?.trim())
    ?.exercise_category
    ?.trim()
    || ''
  const repsValues = sorted.map((record) => record.reps ?? '')
  const reps =
    repsValues.length > 1 && repsValues.some((value) => value !== repsValues[0])
      ? repsValues.join(', ')
      : repsValues[0] ?? ''
  const intensityValues = sorted.map((record) => record.percent)
  const hasIntensity = intensityValues.some((value) => value !== null && value !== undefined)
  const intensity = hasIntensity
    ? intensityValues
        .map((value) => (value === null || value === undefined ? '' : `${value}%`))
        .join(', ')
    : ''
  const notes = sorted.find((record) => record.exercise_notes?.trim())?.exercise_notes?.trim() || ''
  const sets = String(sorted.length || 1)
  const supersetGroup = base?.superset_group?.trim() || ''
  const supersetOrder =
    base?.superset_order !== null && base?.superset_order !== undefined
      ? String(base.superset_order)
      : ''

  return {
    name,
    category,
    reps,
    intensity,
    notes,
    sets,
    supersetGroup,
    supersetOrder
  }
}

export const buildBuilderStateFromWorkouts = (workouts: WorkoutRecord[]) => {
  const usable = workouts.filter((record) => record.day_number !== null)
  if (usable.length === 0) {
    return { days: [] as ProgramBuilderDay[], weekCount: 4 }
  }

  const weekNumbers = usable.map((record) => record.week_number)
  const weekCount = Math.max(...weekNumbers)
  const baseWeek = Math.min(...weekNumbers)

  const grouped = new Map<string, WorkoutRecord[]>()
  usable.forEach((record) => {
    const key = `${record.week_number}-${record.day_number}-${record.exercise_number}`
    const existing = grouped.get(key) ?? []
    existing.push(record)
    grouped.set(key, existing)
  })

  const dayMap = new Map<number, ProgramBuilderDay>()
  const baseExerciseMap = new Map<string, ProgramBuilderExercise>()
  const baseSnapshotMap = new Map<string, ExerciseSnapshot>()

  const addBaseExercise = (
    dayNumber: number,
    exerciseNumber: number,
    snapshot: ExerciseSnapshot,
    dayLabel: string
  ) => {
    const mapKey = `${dayNumber}-${exerciseNumber}`
    if (baseExerciseMap.has(mapKey)) {
      return
    }

    const day = dayMap.get(dayNumber) ?? {
      id: `day-${dayNumber}`,
      dayNumber,
      dayLabel: dayLabel,
      exercises: [],
      weekOverrides: {}
    }

    if (!day.dayLabel && dayLabel) {
      day.dayLabel = dayLabel
    }

    const exercise: ProgramBuilderExercise = {
      id: `day-${dayNumber}-exercise-${exerciseNumber}`,
      name: snapshot.name,
      category: snapshot.category,
      intensity: snapshot.intensity,
      reps: snapshot.reps,
      sets: snapshot.sets,
      notes: snapshot.notes,
      supersetGroup: snapshot.supersetGroup,
      supersetOrder: snapshot.supersetOrder
    }

    day.exercises.push(exercise)
    dayMap.set(dayNumber, day)
    baseExerciseMap.set(mapKey, exercise)
    baseSnapshotMap.set(mapKey, snapshot)
  }

  const groupedEntries = Array.from(grouped.entries())
    .map(([key, records]) => {
      const [weekStr, dayStr, exerciseStr] = key.split('-')
      return {
        key,
        weekNumber: Number(weekStr),
        dayNumber: Number(dayStr),
        exerciseNumber: Number(exerciseStr),
        records
      }
    })
    .sort((a, b) => {
      if (a.weekNumber !== b.weekNumber) {
        return a.weekNumber - b.weekNumber
      }
      if (a.dayNumber !== b.dayNumber) {
        return a.dayNumber - b.dayNumber
      }
      return a.exerciseNumber - b.exerciseNumber
    })

  const formatDayLabel = (value?: string | null) => {
    const trimmed = value?.trim()
    if (!trimmed) return ''
    const lower = trimmed.toLowerCase()
    return lower.charAt(0).toUpperCase() + lower.slice(1)
  }

  groupedEntries
    .filter((entry) => entry.weekNumber === baseWeek)
    .forEach((entry) => {
      const snapshot = buildExerciseSnapshot(
        entry.records,
        `Exercise ${entry.exerciseNumber}`
      )
      const dayLabel = formatDayLabel(entry.records[0]?.day_of_week)
      addBaseExercise(entry.dayNumber, entry.exerciseNumber, snapshot, dayLabel)
    })

  groupedEntries.forEach((entry) => {
    const mapKey = `${entry.dayNumber}-${entry.exerciseNumber}`
    if (baseSnapshotMap.has(mapKey)) {
      return
    }
    const snapshot = buildExerciseSnapshot(
      entry.records,
      `Exercise ${entry.exerciseNumber}`
    )
    const dayLabel = formatDayLabel(entry.records[0]?.day_of_week)
    addBaseExercise(entry.dayNumber, entry.exerciseNumber, snapshot, dayLabel)
  })

  groupedEntries.forEach((entry) => {
    if (entry.weekNumber === baseWeek) {
      return
    }

    const mapKey = `${entry.dayNumber}-${entry.exerciseNumber}`
    const baseSnapshot = baseSnapshotMap.get(mapKey)
    const baseExercise = baseExerciseMap.get(mapKey)
    const day = dayMap.get(entry.dayNumber)

    if (!baseSnapshot || !baseExercise || !day) {
      return
    }

    const snapshot = buildExerciseSnapshot(
      entry.records,
      `Exercise ${entry.exerciseNumber}`
    )

    const overrides: Partial<ProgramBuilderExercise> = {}
    if (snapshot.name.trim() !== baseSnapshot.name.trim()) {
      overrides.name = snapshot.name
    }
    if (snapshot.category.trim() !== baseSnapshot.category.trim()) {
      overrides.category = snapshot.category
    }
    if (snapshot.sets.trim() !== baseSnapshot.sets.trim()) {
      overrides.sets = snapshot.sets
    }
    if (snapshot.reps.trim() !== baseSnapshot.reps.trim()) {
      overrides.reps = snapshot.reps
    }
    if (snapshot.intensity.trim() !== baseSnapshot.intensity.trim()) {
      overrides.intensity = snapshot.intensity
    }
    if (snapshot.notes.trim() !== baseSnapshot.notes.trim()) {
      overrides.notes = snapshot.notes
    }
    if ((snapshot.supersetGroup || '').trim() !== (baseSnapshot.supersetGroup || '').trim()) {
      overrides.supersetGroup = snapshot.supersetGroup || ''
    }
    if ((snapshot.supersetOrder || '').trim() !== (baseSnapshot.supersetOrder || '').trim()) {
      overrides.supersetOrder = snapshot.supersetOrder || ''
    }

    if (Object.keys(overrides).length === 0) {
      return
    }

    const weekOverrides = { ...(day.weekOverrides || {}) }
    const dayOverrides = { ...(weekOverrides[entry.weekNumber] || {}) }
    dayOverrides[baseExercise.id] = overrides
    weekOverrides[entry.weekNumber] = dayOverrides
    day.weekOverrides = weekOverrides
  })

  const days = Array.from(dayMap.values()).sort((a, b) => a.dayNumber - b.dayNumber)
  days.forEach((day) => {
    const getExerciseNumber = (id: string) => {
      const match = id.match(/exercise-(\d+)/)
      return match ? Number.parseInt(match[1], 10) : 0
    }
    day.exercises.sort((a, b) => getExerciseNumber(a.id) - getExerciseNumber(b.id))
  })

  return { days, weekCount }
}
