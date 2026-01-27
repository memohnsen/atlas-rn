import { describe, expect, it } from 'vitest'
import { buildExerciseVolumeData, buildWeeklyIntensityData, buildWeeklyRepData } from './analytics-helpers'
import { WorkoutRecord } from '../types/workout'

const baseWorkout = (overrides: Partial<WorkoutRecord>): WorkoutRecord => ({
  user_id: 'manual',
  athlete_name: 'maddisen',
  program_name: 'testing',
  start_date: '2026-01-11',
  week_number: 1,
  day_number: 1,
  exercise_number: 1,
  exercise_name: 'Back Squat',
  reps: '2',
  sets: 2,
  weights: null,
  percent: 70,
  athlete_comments: null,
  completed: false,
  ...overrides
})

describe('analytics helpers', () => {
  it('builds weekly rep totals', () => {
    const workouts = [
      baseWorkout({ week_number: 1, reps: '2', sets: 2 }),
      baseWorkout({ week_number: 1, reps: '3', sets: 1 }),
      baseWorkout({ week_number: 2, reps: '1', sets: 3 })
    ]
    const data = buildWeeklyRepData(workouts)
    expect(data).toEqual([
      { week: 'Week 1', reps: 7 },
      { week: 'Week 2', reps: 3 }
    ])
  })

  it('averages intensity by week', () => {
    const workouts = [
      baseWorkout({ week_number: 1, percent: 70 }),
      baseWorkout({ week_number: 1, percent: 80 }),
      baseWorkout({ week_number: 2, percent: null })
    ]
    const data = buildWeeklyIntensityData(workouts)
    expect(data).toEqual([
      { week: 'Week 1', intensity: 75 },
      { week: 'Week 2', intensity: 0 }
    ])
  })

  it('returns top exercise volume totals', () => {
    const workouts = [
      baseWorkout({ exercise_name: 'Back Squat', reps: '2', sets: 2 }),
      baseWorkout({ exercise_name: 'Back Squat', reps: '3', sets: 1 }),
      baseWorkout({ exercise_name: 'Snatch', reps: '1', sets: 3 })
    ]
    const data = buildExerciseVolumeData(workouts)
    expect(data[0]).toEqual({ exercise: 'Back Squat', reps: 7 })
    expect(data[1]).toEqual({ exercise: 'Snatch', reps: 3 })
  })
})
