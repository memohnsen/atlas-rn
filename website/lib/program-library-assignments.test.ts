import { describe, expect, it } from 'vitest'
import { getAssignment, updateAssignmentState } from './program-library-assignments'

describe('program library assignment helpers', () => {
  it('returns a default assignment when none exists', () => {
    const assignment = getAssignment('starter', {})
    expect(assignment.programName).toBe('starter')
    expect(assignment.status).toBe('idle')
  })

  it('merges updates into the existing assignment', () => {
    const prev = {
      starter: {
        athleteName: 'maddisen',
        programName: 'starter',
        startDate: '2026-01-11',
        status: 'idle' as const
      }
    }
    const next = updateAssignmentState(prev, 'starter', { status: 'assigning' })
    expect(next.starter.athleteName).toBe('maddisen')
    expect(next.starter.status).toBe('assigning')
  })
})
