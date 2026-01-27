import { describe, expect, it } from 'vitest'
import { buildScrapeErrorMessage, extractSheetInfo } from './scrape-helpers'

describe('extractSheetInfo', () => {
  it('extracts sheet id and gid from a Google Sheets URL', () => {
    const info = extractSheetInfo('https://docs.google.com/spreadsheets/d/abc123/edit#gid=456')
    expect(info).toEqual({ sheetId: 'abc123', gid: '456' })
  })

  it('throws for invalid URLs', () => {
    expect(() => extractSheetInfo('https://example.com')).toThrow('Invalid Google Sheets URL')
  })
})

describe('buildScrapeErrorMessage', () => {
  it('returns null for non-error responses', () => {
    expect(buildScrapeErrorMessage({ success: true })).toBeNull()
  })

  it('includes suggestion and first useful detail line', () => {
    const message = buildScrapeErrorMessage({
      error: 'Tab not found',
      suggestion: 'Check the tab name.',
      details: 'Successfully connected\nMissing tab data\nExtracted 0 rows'
    })
    expect(message).toContain('Tab not found')
    expect(message).toContain('Check the tab name.')
    expect(message).toContain('Missing tab data')
  })
})
