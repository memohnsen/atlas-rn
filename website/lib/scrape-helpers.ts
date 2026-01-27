import { ScrapeResponse } from '@/types/workout'

export type SheetInfo = {
  sheetId: string
  gid: string | null
}

export const extractSheetInfo = (url: string): SheetInfo => {
  const sheetIdMatch = url.match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/)
  if (!sheetIdMatch) {
    throw new Error('Invalid Google Sheets URL')
  }

  const sheetId = sheetIdMatch[1]
  const gidMatch = url.match(/[#&]gid=(\d+)/)
  const gid = gidMatch ? gidMatch[1] : null

  return { sheetId, gid }
}

export const buildScrapeErrorMessage = (result: ScrapeResponse): string | null => {
  if (!result.error) {
    return null
  }

  let errorMsg = result.error
  if (result.suggestion) {
    errorMsg += '\n\n' + result.suggestion
  }
  if (result.details) {
    const detailsLines = result.details.split('\n').filter(line =>
      line.trim() &&
      !line.includes('Successfully') &&
      !line.includes('Extracted')
    )
    if (detailsLines.length > 0) {
      errorMsg += '\n\nDetails: ' + detailsLines[0]
    }
  }

  return errorMsg
}
