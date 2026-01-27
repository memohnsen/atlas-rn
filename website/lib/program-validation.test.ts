import { describe, expect, it } from 'vitest'
import { validateGeneratedProgramInputs } from './program-validation'
import { GeneratedProgramWeek } from '../types/workout'

const baseWeek = (): GeneratedProgramWeek => ({
  weekNumber: 1,
  days: [
    {
      dayNumber: 1,
      dayLabel: 'Monday',
      exercises: [
        {
          id: 'day-1-exercise-1',
          name: 'Front Squat',
          category: 'squat',
          intensity: '70, 75',
          reps: '3, 2',
          sets: '2',
          notes: ''
        }
      ]
    }
  ]
})

describe('validateGeneratedProgramInputs', () => {
  it('flags missing exercise name', () => {
    const week = baseWeek()
    week.days[0].exercises[0].name = ''
    const result = validateGeneratedProgramInputs([week])
    expect(result.isValid).toBe(false)
    expect(result.message).toMatch(/name/i)
  })

  it('requires a superset order when a group is chosen', () => {
    const week = baseWeek()
    week.days[0].exercises[0].supersetGroup = 'A'
    week.days[0].exercises[0].supersetOrder = ''
    const result = validateGeneratedProgramInputs([week])
    expect(result.isValid).toBe(false)
    expect(result.message).toMatch(/superset/i)
  })

  it('requires every set intensity and rep value', () => {
    const week = baseWeek()
    week.days[0].exercises[0].intensity = '70,'
    week.days[0].exercises[0].reps = '3,'
    const result = validateGeneratedProgramInputs([week])
    expect(result.isValid).toBe(false)
    expect(result.message).toMatch(/intensity|reps/i)
  })

  it('passes valid week data', () => {
    const result = validateGeneratedProgramInputs([baseWeek()])
    expect(result.isValid).toBe(true)
  })
})
