import { exec } from 'child_process'
import { promisify } from 'util'
import path from 'path'
import fs from 'fs'
import { NextRequest, NextResponse } from 'next/server'
import { ScrapeResponse, WorkoutRecord } from '@/types/workout'
import { extractSheetInfo } from '@/lib/scrape-helpers'

const execAsync = promisify(exec)

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { url, tabName, athleteName, startDate } = body as { url?: string; tabName?: string; athleteName?: string; startDate?: string }

    if (!url) {
      return NextResponse.json(
        { error: 'URL is required' } as ScrapeResponse,
        { status: 400 }
      )
    }

    if (!tabName || !tabName.trim()) {
      return NextResponse.json(
        { error: 'Tab name is required and must match exactly (case-sensitive)' } as ScrapeResponse,
        { status: 400 }
      )
    }

    if (!startDate || !startDate.trim()) {
      return NextResponse.json(
        { error: 'Start date is required' } as ScrapeResponse,
        { status: 400 }
      )
    }
    
    // Extract sheet ID from URL
    const { sheetId, gid } = extractSheetInfo(url)
    
    // Use the tab name from request (must be exact match)
    const targetTab = tabName.trim()
    
    // Path to scraper script and venv
    const scraperDir = path.join(process.cwd(), 'sheet-scraper')
    const scraperPath = path.join(scraperDir, 'scraper_api.py')
    const venvPython = path.join(scraperDir, 'venv', 'bin', 'python')
    
    // Check if scraper exists
    if (!fs.existsSync(scraperPath)) {
      return NextResponse.json(
        { error: 'Scraper script not found' } as ScrapeResponse,
        { status: 500 }
      )
    }
    
    // Use venv Python directly if available, otherwise use system python
    const pythonCmd = fs.existsSync(venvPython) ? venvPython : 'python3'
    
    // Run the scraper with the sheet ID, tab name, athlete name, and start date
    let stdout: string, stderr: string
    const athleteNameArg = athleteName && athleteName.trim() ? `"${athleteName.trim()}"` : '""'
    const startDateArg = `"${startDate.trim()}"`
    console.log(`Running scraper: ${pythonCmd} "${scraperPath}" "${sheetId}" "${targetTab}" ${athleteNameArg} ${startDateArg}`)
    try {
      const result = await execAsync(
        `${pythonCmd} "${scraperPath}" "${sheetId}" "${targetTab}" ${athleteNameArg} ${startDateArg}`,
        { 
          cwd: scraperDir,
          maxBuffer: 1024 * 1024 * 10 // 10MB buffer
        }
      )
      stdout = result.stdout
      stderr = result.stderr
      console.log('Scraper stdout:', stdout)
      console.log('Scraper stderr:', stderr)
    } catch (execError: any) {
      // Extract error message from stderr or stdout
      stderr = execError.stderr || ''
      stdout = execError.stdout || ''
      
      // Parse the error message from Python output
      let errorMessage = 'Failed to scrape sheet'
      
      if (stderr) {
        // Look for the actual error message after "Error:"
        const errorMatch = stderr.match(/Error:?\s*(.+)/i)
        if (errorMatch) {
          errorMessage = errorMatch[1].trim()
        } else {
          errorMessage = stderr.trim()
        }
      } else if (stdout) {
        // Sometimes errors go to stdout
        const errorMatch = stdout.match(/Error:?\s*(.+)/i)
        if (errorMatch) {
          errorMessage = errorMatch[1].trim()
        }
      }
      
      // Clean up the error message (remove newlines, extra spaces)
      errorMessage = errorMessage.replace(/\n/g, ' ').replace(/\s+/g, ' ').trim()
      
      const response: ScrapeResponse = {
        error: errorMessage,
        details: stderr || stdout,
        suggestion: errorMessage.includes('403') || errorMessage.includes('Access denied') || errorMessage.includes('not publicly')
          ? 'Make sure the Google Sheet is shared with "Anyone with the link" can view.'
          : errorMessage.includes('404') || errorMessage.includes('not found')
          ? 'Verify the sheet ID and tab name are correct. The tab name must match exactly (case-sensitive).'
          : 'Please check the sheet URL and tab name, and ensure the sheet is publicly accessible.'
      }
      
      return NextResponse.json(response, { status: 400 })
    }
    
    if (stderr && !stderr.includes('Successfully')) {
      console.error('Scraper stderr:', stderr)
    }

    // Parse JSON output from Python scraper
    console.log('Scraper stdout length:', stdout.length)
    console.log('Scraper stdout preview:', stdout.substring(0, 200))

    let records: WorkoutRecord[]
    try {
      const parsedData = JSON.parse(stdout)

      // Data is already in the correct format from Python, but we need to ensure types
      records = parsedData.map((record: any) => ({
        user_id: record.user_id,
        athlete_name: record.athlete_name,
        program_name: record.program_name,
        start_date: record.start_date,
        week_number: record.week_number,
        day_number: record.day_number,
        exercise_number: record.exercise_number,
        exercise_name: record.exercise_name,
        exercise_category: record.category ? String(record.category) : null,
        exercise_notes: record.notes ? String(record.notes) : null,
        sets: record.sets,
        reps: String(record.reps), // Ensure reps is a string
        weights: record.weights,
        percent: record.percent,
        athlete_comments: null, // Will be added by users later
        completed: record.completed ?? false // Default to false if not present
      }))
    } catch (parseError) {
      console.error('Failed to parse JSON output:', parseError)
      return NextResponse.json(
        {
          error: 'Failed to parse scraper output',
          details: stdout || stderr,
          suggestion: 'The scraper may have returned invalid data. Check the scraper logs.'
        } as ScrapeResponse,
        { status: 500 }
      )
    }

    console.log('Parsed records count:', records.length)

    if (records.length === 0) {
      return NextResponse.json(
        {
          error: 'No data found. The scraper may have run but found no exercises.',
          details: stdout || stderr,
          suggestion: 'Check that the tab name matches exactly and the sheet has the expected structure.'
        } as ScrapeResponse,
        { status: 400 }
      )
    }
    
    const response: ScrapeResponse = {
      success: true,
      data: records,
      count: records.length
    }
    
    return NextResponse.json(response)
    
  } catch (error) {
    console.error('Scrape error:', error)
    const err = error as Error
    return NextResponse.json(
      { error: 'Failed to scrape sheet', message: err.message } as ScrapeResponse,
      { status: 500 }
    )
  }
}
