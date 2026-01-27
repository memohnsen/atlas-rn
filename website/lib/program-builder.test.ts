import { describe, expect, it } from 'vitest'
import { buildGeneratedProgramWeeks } from './program-builder'
import { ProgramBuilderDay } from '../types/workout'

const buildDay = (): ProgramBuilderDay => ({
  id: 'day-1',
  dayNumber: 1,
  dayLabel: 'Monday',
  exercises: [
    {
      id: 'day-1-exercise-1',
      name: 'Back Squat',
      category: 'squat',
      intensity: '50%',
      reps: '3',
      sets: '3',
      notes: ''
    }
  ]
})

describe('buildGeneratedProgramWeeks', () => {
  it('returns an empty array when no days exist', () => {
    expect(buildGeneratedProgramWeeks([], 4)).toEqual([])
  })

  it('keeps week data unchanged when week adjustments are disabled', () => {
    const days = [buildDay()]
    const weeks = buildGeneratedProgramWeeks(days, 2, { enableWeekAdjustments: false })
    expect(weeks).toHaveLength(2)
    expect(weeks[0].days[0].exercises[0].intensity).toBe('50%')
    expect(weeks[1].days[0].exercises[0].intensity).toBe('50%')
    expect(weeks[1].days[0].exercises[0].sets).toBe('3')
  })

  it('applies week adjustments when enabled', () => {
    const days = [buildDay()]
    const weeks = buildGeneratedProgramWeeks(days, 2, { enableWeekAdjustments: true })
    const week2Exercise = weeks[1].days[0].exercises[0]
    expect(week2Exercise.intensity).not.toBe('50%')
    expect(week2Exercise.intensity).toContain('45%')
    expect(week2Exercise.sets).toBe('3')
  })
})
