import { describe, expect, it } from 'vitest'
import { buildBuilderStateFromWorkouts } from './program-editor-helpers'
import { WorkoutRecord } from '../types/workout'

const buildWorkout = (overrides: Partial<WorkoutRecord>): WorkoutRecord => ({
  user_id: 'manual',
  athlete_name: 'maddisen',
  program_name: 'testing',
  start_date: '2026-01-11',
  week_number: 1,
  day_number: 1,
  exercise_number: 1,
  exercise_name: 'Back Squat',
  reps: '2',
  sets: 1,
  weights: null,
  percent: 70,
  athlete_comments: null,
  completed: false,
  ...overrides
})

describe('buildBuilderStateFromWorkouts', () => {
  it('returns empty state when no usable workouts exist', () => {
    const state = buildBuilderStateFromWorkouts([
      buildWorkout({ day_number: null })
    ])
    expect(state.days).toHaveLength(0)
    expect(state.weekCount).toBe(4)
  })

  it('builds week overrides when later weeks differ', () => {
    const workouts = [
      buildWorkout({ week_number: 1, sets: 1, percent: 70 }),
      buildWorkout({ week_number: 2, sets: 1, percent: 75 }),
      buildWorkout({ week_number: 2, sets: 2, percent: 75 })
    ]
    const state = buildBuilderStateFromWorkouts(workouts)
    expect(state.weekCount).toBe(2)
    expect(state.days).toHaveLength(1)
    const overrides = state.days[0].weekOverrides?.[2]
    expect(overrides).toBeDefined()
    const exerciseId = state.days[0].exercises[0].id
    expect(overrides?.[exerciseId]?.sets).toBe('2')
    expect(overrides?.[exerciseId]?.intensity).toContain('75%')
  })
})
