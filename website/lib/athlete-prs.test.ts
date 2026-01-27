import { describe, expect, it } from 'vitest'
import { buildPrPayload, emptyPrValues, parsePrValue, prsToFormValues } from './athlete-prs'

describe('athlete PR helpers', () => {
  it('parses empty values as null', () => {
    expect(parsePrValue('')).toBeNull()
    expect(parsePrValue('  ')).toBeNull()
  })

  it('parses numeric input', () => {
    expect(parsePrValue('120')).toBe(120)
  })

  it('builds payload with numeric values', () => {
    const values = emptyPrValues()
    values.snatch_1rm = '85'
    values.back_squat_5rm = '160'
    const payload = buildPrPayload('maddisen', values)
    expect(payload.athlete_name).toBe('maddisen')
    expect(payload.snatch_1rm).toBe(85)
    expect(payload.back_squat_5rm).toBe(160)
  })

  it('maps stored PRs into form values', () => {
    const form = prsToFormValues({
      athlete_name: 'maddisen',
      snatch_1rm: 90,
      snatch_2rm: null,
      snatch_3rm: null,
      clean_1rm: null,
      clean_2rm: null,
      clean_3rm: null,
      jerk_1rm: null,
      jerk_2rm: null,
      jerk_3rm: null,
      clean_jerk_1rm: null,
      clean_jerk_2rm: null,
      clean_jerk_3rm: null,
      back_squat_1rm: null,
      back_squat_2rm: null,
      back_squat_3rm: null,
      back_squat_4rm: null,
      back_squat_5rm: null,
      back_squat_6rm: null,
      back_squat_7rm: null,
      back_squat_8rm: null,
      back_squat_9rm: null,
      back_squat_10rm: null,
      front_squat_1rm: null,
      front_squat_2rm: null,
      front_squat_3rm: null,
      front_squat_4rm: null,
      front_squat_5rm: null,
      front_squat_6rm: null,
      front_squat_7rm: null,
      front_squat_8rm: null,
      front_squat_9rm: null,
      front_squat_10rm: null
    })
    expect(form.snatch_1rm).toBe('90')
    expect(form.snatch_2rm).toBe('')
  })
})
