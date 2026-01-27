import { describe, expect, it } from 'vitest'
import { formatDate } from './date-format'

describe('formatDate', () => {
  it('returns empty string for empty input', () => {
    expect(formatDate('')).toBe('')
    expect(formatDate(null)).toBe('')
  })

  it('returns empty string for invalid dates', () => {
    expect(formatDate('not-a-date')).toBe('')
  })

  it('formats valid dates in a short US format', () => {
    expect(formatDate('2026-01-11')).toBe('Jan 11, 2026')
  })
})
