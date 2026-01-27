import { afterAll, beforeAll, afterEach, describe, expect, it, vi } from 'vitest'

const fromCalls: string[] = []
const eqCalls: Array<{ column: string; value: string }> = []

const createDeleteChain = () => ({
  delete: () => ({
    eq: (column: string, value: string) => {
      eqCalls.push({ column, value })
      return Promise.resolve({ error: null })
    }
  })
})

vi.mock('./supabase', () => ({
  supabase: {
    from: (table: string) => {
      fromCalls.push(table)
      return createDeleteChain()
    }
  }
}))

let deleteAthleteData: (athleteName: string) => Promise<boolean>

beforeAll(async () => {
  ;({ deleteAthleteData } = await import('./supabase-queries'))
})

afterAll(() => {
  deleteAthleteData = async () => false
})

describe('deleteAthleteData', () => {
  afterEach(() => {
    fromCalls.length = 0
    eqCalls.length = 0
  })

  it('deletes program days, workouts, and metadata for an athlete', async () => {
    await deleteAthleteData('maddisen')
    expect(fromCalls).toEqual(['program_days', 'program_workouts', 'program_metadata', 'athlete_prs'])
    expect(eqCalls).toEqual([
      { column: 'athlete_name', value: 'maddisen' },
      { column: 'athlete_name', value: 'maddisen' },
      { column: 'athlete_name', value: 'maddisen' },
      { column: 'athlete_name', value: 'maddisen' }
    ])
  })
})
