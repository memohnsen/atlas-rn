import { WorkoutRecord } from '@/types/workout'
import { parseCount } from '@/lib/value-parse'

export const formatNumber = (value: number) => {
  const fixed = value.toFixed(1)
  return fixed.replace(/\.0+$/, '').replace(/(\.\d*?)0+$/, '$1')
}

export const buildWeeklyRepData = (workouts: WorkoutRecord[]) => {
  const weekly = new Map<number, number>()
  workouts.forEach((workout) => {
    const reps = parseCount(workout.reps)
    if (reps === null) return
    const sets = workout.sets || 1
    const total = reps * sets
    weekly.set(workout.week_number, (weekly.get(workout.week_number) || 0) + total)
  })

  return Array.from(weekly.entries())
    .map(([week, total]) => ({
      week: `Week ${week}`,
      reps: Number.isInteger(total) ? total : Number.parseFloat(formatNumber(total))
    }))
    .sort((a, b) => parseInt(a.week.replace('Week ', '')) - parseInt(b.week.replace('Week ', '')))
}

export const buildWeeklyIntensityData = (workouts: WorkoutRecord[]) => {
  const weeksSeen = new Set<number>()
  const weekly = new Map<number, { total: number; count: number }>()
  workouts.forEach((workout) => {
    weeksSeen.add(workout.week_number)
    if (workout.percent === null || workout.percent === undefined) return
    const current = weekly.get(workout.week_number) || { total: 0, count: 0 }
    weekly.set(workout.week_number, {
      total: current.total + workout.percent,
      count: current.count + 1
    })
  })

  return Array.from(weeksSeen.values())
    .map((week) => {
      const entry = weekly.get(week)
      const count = entry?.count ?? 0
      const total = entry?.total ?? 0
      return {
        week: `Week ${week}`,
        intensity: count === 0 ? 0 : Number.parseFloat(formatNumber(total / count))
      }
    })
    .sort((a, b) => parseInt(a.week.replace('Week ', '')) - parseInt(b.week.replace('Week ', '')))
}

export const buildExerciseVolumeData = (workouts: WorkoutRecord[]) => {
  const totals = new Map<string, number>()
  workouts.forEach((workout) => {
    const reps = parseCount(workout.reps)
    if (reps === null) return
    const sets = workout.sets || 1
    totals.set(workout.exercise_name, (totals.get(workout.exercise_name) || 0) + reps * sets)
  })

  return Array.from(totals.entries())
    .map(([exercise, total]) => ({
      exercise,
      reps: Number.isInteger(total) ? total : Number.parseFloat(formatNumber(total))
    }))
    .sort((a, b) => b.reps - a.reps)
    .slice(0, 10)
}
