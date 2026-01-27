import { describe, expect, it } from 'vitest'
import { buildBuilderStateFromLibraryWorkouts } from './program-library-helpers'
import { ProgramLibraryRecord } from '../types/workout'

const buildWorkout = (overrides: Partial<ProgramLibraryRecord>): ProgramLibraryRecord => ({
  user_id: 'manual',
  program_name: 'testing',
  week_number: 1,
  day_number: 1,
  exercise_number: 1,
  exercise_name: 'Snatch',
  reps: '2',
  sets: 1,
  weights: null,
  percent: 70,
  athlete_comments: null,
  completed: false,
  ...overrides
})

describe('buildBuilderStateFromLibraryWorkouts', () => {
  it('returns empty state when no usable workouts exist', () => {
    const state = buildBuilderStateFromLibraryWorkouts([
      buildWorkout({ day_number: null })
    ])
    expect(state.days).toHaveLength(0)
    expect(state.weekCount).toBe(4)
  })

  it('captures week overrides for modified exercises', () => {
    const workouts = [
      buildWorkout({ week_number: 1, percent: 70 }),
      buildWorkout({ week_number: 2, sets: 1, percent: 80 }),
      buildWorkout({ week_number: 2, sets: 2, percent: 80 })
    ]
    const state = buildBuilderStateFromLibraryWorkouts(workouts)
    expect(state.weekCount).toBe(2)
    const exerciseId = state.days[0].exercises[0].id
    const overrides = state.days[0].weekOverrides?.[2]
    expect(overrides?.[exerciseId]?.intensity).toContain('80%')
  })
})
