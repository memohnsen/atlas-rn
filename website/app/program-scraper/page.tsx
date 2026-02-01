'use client'

import { useState, useEffect } from 'react'
import { useQuery, useMutation } from 'convex/react'
import { api } from '../../../convex/_generated/api'
import { WorkoutRecord, ScrapeResponse } from '@/types/workout'
import WorkoutView from '../components/WorkoutView'
import Link from 'next/link'
import { buildScrapeErrorMessage } from '@/lib/scrape-helpers'

// TODO: Replace with actual user ID from authentication
const USER_ID = 'default-user'

export default function Home() {
  const [data, setData] = useState<WorkoutRecord[]>([])
  const [scraping, setScraping] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [sheetUrl, setSheetUrl] = useState('')
  const [tabName, setTabName] = useState('4-Day Template')
  const [athleteName, setAthleteName] = useState('')
  const [startDate, setStartDate] = useState('')
  const [pushSuccess, setPushSuccess] = useState(false)

  // Check if program exists using Convex query
  const programExists = useQuery(
    api.programs.checkProgramExists,
    data.length > 0 && data[0].athlete_name && data[0].program_name && data[0].start_date
      ? {
          userId: USER_ID,
          athleteName: data[0].athlete_name,
          programName: data[0].program_name,
          startDate: data[0].start_date,
        }
      : 'skip'
  ) ?? false

  // Convex mutation for inserting program
  const insertProgram = useMutation(api.programs.insertProgram)

  const handleScrape = async () => {
    if (!sheetUrl.trim()) {
      setError('Please enter a Google Sheets URL')
      return
    }

    if (!tabName.trim()) {
      setError('Please enter the exact tab name (e.g., "4-Day Template")')
      return
    }

    setScraping(true)
    setError(null)

    try {
      const res = await fetch('/api/scrape', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          url: sheetUrl,
          tabName: tabName.trim(),
          athleteName: athleteName.trim().toLowerCase(),
          startDate: startDate.trim()
        })
      })

      const result: ScrapeResponse = await res.json()

      const errorMessage = buildScrapeErrorMessage(result)
      if (errorMessage) {
        setError(errorMessage)
        setScraping(false)
        return
      }

      if (result.success && Array.isArray(result.data)) {
        if (result.data.length === 0) {
          setError('Scraper ran successfully but found no workout data. Please check:\n1. The tab name matches exactly (case-sensitive)\n2. The sheet has the expected program structure\n3. The sheet contains workout data in the specified tab')
        } else {
          setData(result.data)
        }
      } else if (!result.error) {
        setError('Invalid response from server. No data or error message received.')
      }
    } catch (err) {
      const error = err as Error
      setError('Failed to scrape sheet: ' + error.message)
    } finally {
      setScraping(false)
    }
  }

  const handlePushToDatabase = async () => {
    if (data.length === 0) {
      setError('No data to push. Please scrape a sheet first.')
      return
    }

    // Check if program already exists for this athlete
    if (programExists) {
      const athleteName = data[0]?.athlete_name || 'this athlete'
      const programName = data[0]?.program_name || 'this program'
      setError(
        `Program "${programName}" already exists for athlete "${athleteName}" in the database.\n\n` +
        `To avoid duplicates, this program cannot be pushed again. If you need to update the program, ` +
        `please delete the existing data first or use a different program name.`
      )
      return
    }

    setError(null)
    setPushSuccess(false)

    try {
      // Transform flat workout records into nested Convex structure
      const firstRecord = data[0]
      const weekMap = new Map<number, Map<number, WorkoutRecord[]>>()

      // Group exercises by week and day
      data.forEach((workout) => {
        if (!weekMap.has(workout.week_number)) {
          weekMap.set(workout.week_number, new Map())
        }
        const dayMap = weekMap.get(workout.week_number)!
        if (!dayMap.has(workout.day_number)) {
          dayMap.set(workout.day_number, [])
        }
        dayMap.get(workout.day_number)!.push(workout)
      })

      // Build nested weeks structure
      const weeks = Array.from(weekMap.entries())
        .sort(([a], [b]) => a - b)
        .map(([weekNumber, dayMap]) => ({
          weekNumber,
          days: Array.from(dayMap.entries())
            .sort(([a], [b]) => a - b)
            .map(([dayNumber, exercises]) => ({
              dayNumber,
              dayOfWeek: exercises[0]?.day_of_week || undefined,
              dayLabel: undefined,
              completed: false,
              rating: undefined,
              completedAt: undefined,
              exercises: exercises
                .sort((a, b) => a.exercise_number - b.exercise_number)
                .map((ex) => ({
                  exerciseNumber: ex.exercise_number,
                  exerciseName: ex.exercise_name,
                  exerciseCategory: ex.exercise_category || undefined,
                  exerciseNotes: ex.exercise_notes || undefined,
                  supersetGroup: ex.superset_group || undefined,
                  supersetOrder: ex.superset_order || undefined,
                  sets: ex.sets || undefined,
                  reps: ex.reps,
                  weights: ex.weights || undefined,
                  percent: ex.percent || undefined,
                  completed: false,
                  athleteComments: undefined,
                })),
            })),
        }))

      // Extract or create metadata (you might want to extract this from somewhere)
      const repTargets = {
        snatch: '',
        clean: '',
        jerk: '',
        squat: '',
        pull: '',
      }

      const weekCount = Math.max(...data.map((w) => w.week_number))
      const weekTotals = Array.from({ length: weekCount }, (_, i) => ({
        weekNumber: i + 1,
        total: '',
      }))

      await insertProgram({
        userId: USER_ID,
        athleteName: firstRecord.athlete_name,
        programName: firstRecord.program_name,
        startDate: firstRecord.start_date,
        weekCount,
        repTargets,
        weekTotals,
        weeks,
      })

      setPushSuccess(true)
      setTimeout(() => setPushSuccess(false), 3000)
    } catch (err) {
      const error = err as Error
      const errorMessage = error?.message || String(err)
      setError('Failed to push to database: ' + errorMessage)
    }
  }

  return (
    <div className="page-container">
      <div className="page-header">
        <h1 style={{ margin: 0, color: '#333' }}>Workout Program Scraper</h1>
        <div className="header-actions">
          <Link
            href="/"
            style={{
              padding: '10px 20px',
              fontSize: '14px',
              fontWeight: '600',
              backgroundColor: '#111827',
              color: 'white',
              border: 'none',
              borderRadius: '6px',
              textDecoration: 'none',
              transition: 'background-color 0.2s'
            }}
          >
            Home
          </Link>
          <Link
            href="/program-builder"
            style={{
              padding: '10px 20px',
              fontSize: '14px',
              fontWeight: '600',
              backgroundColor: '#0ea5e9',
              color: 'white',
              border: 'none',
              borderRadius: '6px',
              textDecoration: 'none',
              transition: 'background-color 0.2s'
            }}
          >
            Program Builder
          </Link>
          <Link
            href="/program-editor"
            style={{
              padding: '10px 20px',
              fontSize: '14px',
              fontWeight: '600',
              backgroundColor: '#f97316',
              color: 'white',
              border: 'none',
              borderRadius: '6px',
              textDecoration: 'none',
              transition: 'background-color 0.2s'
            }}
          >
            Program Editor
          </Link>
          <Link
            href="/analytics"
            style={{
              padding: '10px 20px',
              fontSize: '14px',
              fontWeight: '600',
              backgroundColor: '#10b981',
              color: 'white',
              border: 'none',
              borderRadius: '6px',
              textDecoration: 'none',
              transition: 'background-color 0.2s'
            }}
          >
            Analytics
          </Link>
          <Link
            href="/browse"
            style={{
              padding: '10px 20px',
              fontSize: '14px',
              fontWeight: '600',
              backgroundColor: '#0070f3',
              color: 'white',
              border: 'none',
              borderRadius: '6px',
              textDecoration: 'none',
              transition: 'background-color 0.2s'
            }}
          >
            Browse Athletes & Programs
          </Link>
        </div>
      </div>

      {/* Input Section */}
      <div style={{
        marginBottom: '30px',
        padding: '20px',
        backgroundColor: '#f8f9fa',
        borderRadius: '8px',
        border: '1px solid #dee2e6'
      }}>
        <h2 style={{ marginBottom: '15px', fontSize: '18px', color: '#333' }}>Scrape Google Sheet</h2>

        <div style={{ marginBottom: '15px' }}>
          <label style={{ display: 'block', marginBottom: '5px', fontWeight: '600', color: '#555' }}>
            Google Sheets URL <span style={{ color: '#d00' }}>*</span>:
          </label>
          <input
            type="text"
            value={sheetUrl}
            onChange={(e) => setSheetUrl(e.target.value)}
            placeholder="https://docs.google.com/spreadsheets/d/..."
            style={{
              width: '100%',
              padding: '10px',
              fontSize: '14px',
              border: '1px solid #ddd',
              borderRadius: '4px',
              boxSizing: 'border-box'
            }}
            disabled={scraping}
          />
          <p style={{
            marginTop: '5px',
            fontSize: '12px',
            color: '#666',
            fontStyle: 'italic'
          }}>
            Your sheet must be publicly accessible. Click the "Share" button (top right) and select "Change to anyone with the link".
          </p>
        </div>

        <div style={{ marginBottom: '15px' }}>
          <label style={{ display: 'block', marginBottom: '5px', fontWeight: '600', color: '#555' }}>
            Tab Name <span style={{ color: '#d00' }}>*</span>:
          </label>
          <input
            type="text"
            value={tabName}
            onChange={(e) => setTabName(e.target.value)}
            placeholder="4-Day Template"
            required
            style={{
              width: '100%',
              padding: '10px',
              fontSize: '14px',
              border: tabName.trim() ? '1px solid #ddd' : '1px solid #d00',
              borderRadius: '4px',
              boxSizing: 'border-box'
            }}
            disabled={scraping}
          />
          <p style={{
            marginTop: '5px',
            fontSize: '12px',
            color: '#666',
            fontStyle: 'italic'
          }}>
            Must match the exact tab name in your Google Sheet (case-sensitive). Check the bottom tabs in your sheet.
          </p>
        </div>

        <div style={{ marginBottom: '15px' }}>
          <label style={{ display: 'block', marginBottom: '5px', fontWeight: '600', color: '#555' }}>
            Athlete Name <span style={{ color: '#d00' }}>*</span>:
          </label>
          <input
            type="text"
            value={athleteName}
            onChange={(e) => setAthleteName(e.target.value)}
            placeholder="Enter athlete name"
            style={{
              width: '100%',
              padding: '10px',
              fontSize: '14px',
              border: '1px solid #ddd',
              borderRadius: '4px',
              boxSizing: 'border-box'
            }}
            disabled={scraping}
          />
        </div>

        <div style={{ marginBottom: '15px' }}>
          <label style={{ display: 'block', marginBottom: '5px', fontWeight: '600', color: '#555' }}>
            Start Date <span style={{ color: '#d00' }}>*</span>:
          </label>
          <input
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            style={{
              width: '100%',
              padding: '10px',
              fontSize: '14px',
              border: '1px solid #ddd',
              borderRadius: '4px',
              boxSizing: 'border-box'
            }}
            disabled={scraping}
          />
          <p style={{
            marginTop: '5px',
            fontSize: '12px',
            color: '#666',
            fontStyle: 'italic'
          }}>
            The date when this program starts for the athlete.
          </p>
        </div>

        <div className="button-row">
          <button
            onClick={handleScrape}
            disabled={scraping || !sheetUrl.trim() || !tabName.trim() || !startDate.trim()}
            style={{
              padding: '12px 24px',
              fontSize: '16px',
              fontWeight: '600',
              backgroundColor: scraping || !sheetUrl.trim() || !tabName.trim() || !startDate.trim() ? '#ccc' : '#0070f3',
              color: 'white',
              border: 'none',
              borderRadius: '6px',
              cursor: scraping || !sheetUrl.trim() || !tabName.trim() || !startDate.trim() ? 'not-allowed' : 'pointer',
              transition: 'background-color 0.2s'
            }}
          >
            {scraping ? 'Scraping...' : 'Scrape Sheet'}
          </button>

          <button
            onClick={handlePushToDatabase}
            disabled={data.length === 0 || programExists}
            style={{
              padding: '12px 24px',
              fontSize: '16px',
              fontWeight: '600',
              backgroundColor:
                programExists ? '#ef4444' :
                data.length === 0 ? '#ccc' : '#10b981',
              color: 'white',
              border: 'none',
              borderRadius: '6px',
              cursor: data.length === 0 || programExists ? 'not-allowed' : 'pointer',
              transition: 'background-color 0.2s'
            }}
            title={programExists ? 'This program already exists in the database' : ''}
          >
            {pushSuccess ? '✓ Pushed!' :
             programExists ? '⚠ Already Exists' :
             'Push to Database'}
          </button>
        </div>

        {programExists && data.length > 0 && (
          <div style={{
            marginTop: '15px',
            padding: '12px',
            backgroundColor: '#fef2f2',
            border: '1px solid #fecaca',
            borderRadius: '6px',
            color: '#991b1b',
            fontSize: '14px'
          }}>
            <strong>⚠ Duplicate Program:</strong> This program "{data[0]?.program_name}" already exists for athlete "{data[0]?.athlete_name}" in the database and cannot be pushed again.
          </div>
        )}
      </div>

      {pushSuccess && (
        <div style={{
          padding: '15px',
          marginBottom: '20px',
          backgroundColor: '#d1fae5',
          color: '#065f46',
          borderRadius: '6px',
          border: '1px solid #10b981'
        }}>
          <strong>Success!</strong> Workout data has been pushed to the database.
        </div>
      )}

      {error && (
        <div style={{
          padding: '15px',
          marginBottom: '20px',
          backgroundColor: '#fee',
          color: '#c33',
          borderRadius: '6px',
          border: '1px solid #fcc'
        }}>
          <strong>Error:</strong>
          <div style={{
            marginTop: '8px',
            whiteSpace: 'pre-line',
            lineHeight: '1.6',
            fontSize: '14px'
          }}>
            {error}
          </div>
          {error.includes('403') || error.includes('Access denied') || error.includes('not publicly') ? (
            <div style={{
              marginTop: '12px',
              padding: '10px',
              backgroundColor: '#fff3cd',
              borderRadius: '4px',
              border: '1px solid #ffc107',
              fontSize: '13px',
              color: '#856404'
            }}>
              <strong>How to fix:</strong>
              <ol style={{ marginTop: '8px', marginLeft: '20px', paddingLeft: '0' }}>
                <li>Open your Google Sheet</li>
                <li>Click the "Share" button (top right)</li>
                <li>Click "Change to anyone with the link"</li>
                <li>Select "Viewer" access level</li>
                <li>Click "Done"</li>
              </ol>
            </div>
          ) : error.includes('404') || error.includes('not found') ? (
            <div style={{
              marginTop: '12px',
              padding: '10px',
              backgroundColor: '#fff3cd',
              borderRadius: '4px',
              border: '1px solid #ffc107',
              fontSize: '13px',
              color: '#856404'
            }}>
              <strong>How to fix:</strong>
              <ul style={{ marginTop: '8px', marginLeft: '20px', paddingLeft: '0' }}>
                <li>Check the sheet URL is correct</li>
                <li>Verify the tab name matches exactly (check spelling, capitalization, and spacing)</li>
                <li>Look at the bottom tabs in your Google Sheet to see the exact tab names</li>
              </ul>
            </div>
          ) : null}
        </div>
      )}

      {data.length === 0 && (
        <div style={{
          padding: '40px',
          textAlign: 'center',
          color: '#666',
          backgroundColor: '#f8f9fa',
          borderRadius: '8px'
        }}>
          <p style={{ fontSize: '18px', marginBottom: '10px' }}>No workout data loaded</p>
          <p>Enter a Google Sheets URL above and click "Scrape Sheet" to load program data</p>
        </div>
      )}

      {data.length > 0 && <WorkoutView data={data} />}
    </div>
  )
}
