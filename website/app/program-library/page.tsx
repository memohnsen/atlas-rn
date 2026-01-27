'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import {
  assignLibraryProgramToAthlete,
  checkProgramExists,
  getLibraryPrograms,
  LibraryProgramSummary
} from '@/lib/supabase-queries'
import { formatDate } from '@/lib/date-format'
import { AssignmentState, getAssignment, updateAssignmentState } from '@/lib/program-library-assignments'

export default function ProgramLibraryPage() {
  const [programs, setPrograms] = useState<LibraryProgramSummary[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [assignments, setAssignments] = useState<Record<string, AssignmentState>>({})

  const sortedPrograms = useMemo(
    () => [...programs].sort((a, b) => a.program_name.localeCompare(b.program_name)),
    [programs]
  )

  useEffect(() => {
    let mounted = true

    const loadPrograms = async () => {
      setLoading(true)
      setError(null)
      try {
        const data = await getLibraryPrograms()
        if (mounted) {
          setPrograms(data)
        }
      } catch (err) {
        const message = (err as Error)?.message || String(err)
        if (mounted) {
          setError(message)
        }
      } finally {
        if (mounted) {
          setLoading(false)
        }
      }
    }

    loadPrograms()

    return () => {
      mounted = false
    }
  }, [])

  const updateAssignment = (programName: string, updates: Partial<AssignmentState>) => {
    setAssignments((prev) => updateAssignmentState(prev, programName, updates))
  }

  const handleAssign = async (libraryProgramName: string) => {
    const assignment = getAssignment(libraryProgramName, assignments)
    const trimmedAthlete = assignment.athleteName.trim()
    const trimmedProgram = assignment.programName.trim()
    const trimmedDate = assignment.startDate.trim()

    if (!trimmedAthlete || !trimmedProgram || !trimmedDate) {
      updateAssignment(libraryProgramName, {
        status: 'error',
        message: 'Please enter athlete name, program name, and start date.'
      })
      return
    }

    const normalizedAthlete = trimmedAthlete.toLowerCase()
    const normalizedProgram = trimmedProgram.toLowerCase()

    updateAssignment(libraryProgramName, { status: 'assigning', message: undefined })

    try {
      const exists = await checkProgramExists(normalizedAthlete, normalizedProgram)
      if (exists) {
        updateAssignment(libraryProgramName, {
          status: 'error',
          message: `Program "${trimmedProgram}" already exists for athlete "${trimmedAthlete}".`
        })
        return
      }

      await assignLibraryProgramToAthlete(
        libraryProgramName,
        normalizedAthlete,
        normalizedProgram,
        trimmedDate
      )

      updateAssignment(libraryProgramName, {
        status: 'success',
        message: 'Program assigned successfully!'
      })
    } catch (err) {
      const message = (err as Error)?.message || String(err)
      updateAssignment(libraryProgramName, {
        status: 'error',
        message: message.includes('SUPABASE')
          ? 'Supabase is not configured. Please add NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY to your .env.local file.'
          : 'Failed to assign program: ' + message
      })
    }
  }

  return (
    <div className="page-container">
      <div className="page-header">
        <h1 style={{ margin: 0, color: '#333' }}>Program Library</h1>
        <div className="header-actions">
          <Link
            href="/program-builder"
            style={{
              padding: '10px 20px',
              fontSize: '14px',
              fontWeight: '600',
              backgroundColor: '#4f46e5',
              color: 'white',
              border: 'none',
              borderRadius: '6px',
              textDecoration: 'none',
              transition: 'background-color 0.2s'
            }}
          >
            ← Back to Builder
          </Link>
        </div>
      </div>

      <p style={{ marginBottom: '20px', color: '#666', fontSize: '14px' }}>
        Assign a saved program to a new athlete with a fresh program name and start date.
      </p>

      {loading && <p style={{ color: '#6b7280' }}>Loading library programs...</p>}
      {error && (
        <p style={{ color: '#dc2626' }}>Failed to load library programs: {error}</p>
      )}

      {!loading && !error && sortedPrograms.length === 0 && (
        <div style={{
          padding: '20px',
          backgroundColor: '#f8f9fa',
          borderRadius: '8px',
          border: '1px solid #dee2e6'
        }}>
          <p style={{ margin: 0, color: '#6b7280' }}>
            No saved programs yet. Save a program from the builder to populate your library.
          </p>
        </div>
      )}

      <div style={{ display: 'grid', gap: '16px' }}>
        {sortedPrograms.map((program) => {
          const assignment = getAssignment(program.program_name, assignments)
          return (
            <div
              key={program.program_name}
              style={{
                padding: '20px',
                backgroundColor: '#ffffff',
                borderRadius: '8px',
                border: '1px solid #e5e7eb',
                boxShadow: '0 1px 2px rgba(0, 0, 0, 0.04)'
              }}
            >
              <div style={{ marginBottom: '12px' }}>
                <h2 style={{ margin: 0, fontSize: '18px', color: '#111827' }}>
                  {program.program_name}
                </h2>
                {program.created_at && (
                  <p style={{ margin: '4px 0 0', color: '#6b7280', fontSize: '12px' }}>
                    Saved {formatDate(program.created_at)}
                  </p>
                )}
              </div>

              <div style={{ display: 'grid', gap: '12px' }}>
                <div>
                  <label style={{ display: 'block', marginBottom: '5px', fontWeight: 600, color: '#374151' }}>
                    Athlete Name <span style={{ color: '#dc2626' }}>*</span>
                  </label>
                  <input
                    type="text"
                    value={assignment.athleteName}
                    onChange={(event) =>
                      updateAssignment(program.program_name, { athleteName: event.target.value })
                    }
                    placeholder="Enter athlete name"
                    style={{
                      width: '100%',
                      padding: '10px',
                      fontSize: '14px',
                      border: '1px solid #d1d5db',
                      borderRadius: '4px'
                    }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', marginBottom: '5px', fontWeight: 600, color: '#374151' }}>
                    New Program Name <span style={{ color: '#dc2626' }}>*</span>
                  </label>
                  <input
                    type="text"
                    value={assignment.programName}
                    onChange={(event) =>
                      updateAssignment(program.program_name, { programName: event.target.value })
                    }
                    placeholder="Enter program name"
                    style={{
                      width: '100%',
                      padding: '10px',
                      fontSize: '14px',
                      border: '1px solid #d1d5db',
                      borderRadius: '4px'
                    }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', marginBottom: '5px', fontWeight: 600, color: '#374151' }}>
                    Start Date <span style={{ color: '#dc2626' }}>*</span>
                  </label>
                  <input
                    type="date"
                    value={assignment.startDate}
                    onChange={(event) =>
                      updateAssignment(program.program_name, { startDate: event.target.value })
                    }
                    style={{
                      padding: '10px',
                      fontSize: '14px',
                      border: '1px solid #d1d5db',
                      borderRadius: '4px'
                    }}
                  />
                </div>
              </div>

              <button
                type="button"
                onClick={() => handleAssign(program.program_name)}
                disabled={assignment.status === 'assigning'}
                style={{
                  marginTop: '16px',
                  padding: '10px 18px',
                  fontSize: '14px',
                  fontWeight: 600,
                  backgroundColor: assignment.status === 'assigning' ? '#a7f3d0' : '#059669',
                  color: 'white',
                  border: 'none',
                  borderRadius: '6px',
                  cursor: assignment.status === 'assigning' ? 'not-allowed' : 'pointer'
                }}
              >
                {assignment.status === 'assigning' ? 'Assigning...' : 'Assign to Athlete'}
              </button>

              <div style={{ marginTop: '12px' }}>
                <Link
                  href={`/program-library/${encodeURIComponent(program.program_name)}`}
                  style={{
                    fontSize: '13px',
                    fontWeight: 600,
                    color: '#2563eb',
                    textDecoration: 'none'
                  }}
                >
                  Edit program details →
                </Link>
              </div>

              {assignment.status === 'success' && (
                <p style={{ marginTop: '10px', color: '#16a34a', fontWeight: 600 }}>
                  {assignment.message}
                </p>
              )}
              {assignment.status === 'error' && assignment.message && (
                <p style={{ marginTop: '10px', color: '#dc2626', whiteSpace: 'pre-line' }}>
                  {assignment.message}
                </p>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
