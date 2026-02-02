'use client'

import { useState, useEffect } from 'react'
import { useQuery, useMutation } from 'convex/react'
import { api } from '@/convex/_generated/api'
import { formatDate } from '@/lib/date-format'
import WorkoutView from '../components/WorkoutView'
import { WorkoutRecord } from '@/types/workout'
import { AthletePrKey, buildPrPayload, emptyPrValues, prSections, prsToFormValues } from '@/lib/athlete-prs'

// TODO: Replace with actual user ID from authentication
const USER_ID = 'default-user'

interface Program {
  program_name: string
  start_date: string
}

export default function BrowsePage() {
  const [selectedAthlete, setSelectedAthlete] = useState<string | null>(null)
  const [selectedProgram, setSelectedProgram] = useState<{name: string, startDate: string} | null>(null)
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [showDeleteProgramModal, setShowDeleteProgramModal] = useState(false)
  const [deleteError, setDeleteError] = useState<string | null>(null)
  const [deleteProgramError, setDeleteProgramError] = useState<string | null>(null)
  const [programToDelete, setProgramToDelete] = useState<Program | null>(null)
  const [prValues, setPrValues] = useState<Record<AthletePrKey, string>>(() => emptyPrValues())
  const [prError, setPrError] = useState<string | null>(null)
  const [prSuccess, setPrSuccess] = useState(false)

  // Convex queries
  const athletes = useQuery(api.programs.getAthletes, { userId: USER_ID }) ?? []
  const programs = useQuery(
    api.programs.getProgramsForAthlete,
    selectedAthlete ? { userId: USER_ID, athleteName: selectedAthlete } : 'skip'
  ) ?? []
  const athletePRs = useQuery(
    api.athletePRs.getAthletePRs,
    selectedAthlete ? { athleteName: selectedAthlete } : 'skip'
  )
  const selectedProgramData = useQuery(
    api.programs.getAthleteProgram,
    selectedAthlete && selectedProgram
      ? {
          athleteName: selectedAthlete,
          programName: selectedProgram.name,
          startDate: selectedProgram.startDate,
        }
      : 'skip'
  )

  // Convex mutations
  const deleteAthlete = useMutation(api.programs.deleteAthleteData)
  const deleteProgram = useMutation(api.programs.deleteProgram)
  const bulkUpsertPRs = useMutation(api.athletePRs.bulkUpsertPRs)

  // Update PR values when athletePRs changes
  useEffect(() => {
    if (athletePRs) {
      setPrValues(prsToFormValues(athletePRs))
    } else if (!selectedAthlete) {
      setPrValues(emptyPrValues())
      setPrError(null)
      setPrSuccess(false)
    }
  }, [athletePRs, selectedAthlete])

  const handleAthleteSelect = (athlete: string) => {
    setSelectedAthlete(athlete)
    setSelectedProgram(null) // Reset program selection
  }

  const handleProgramSelect = (programName: string, startDate: string) => {
    setSelectedProgram({ name: programName, startDate })
  }

  const handleBackToAthletes = () => {
    setSelectedAthlete(null)
    setSelectedProgram(null)
  }

  const handleBackToPrograms = () => {
    setSelectedProgram(null)
  }

  const handleSavePrs = async () => {
    if (!selectedAthlete) {
      return
    }
    setPrError(null)
    setPrSuccess(false)
    try {
      // Convert form values to PR array
      const prs = Object.entries(prValues)
        .filter(([_, value]) => value && value.trim() !== '')
        .map(([key, value]) => {
          // Parse key like "snatch_1rm" into exerciseName and repMax
          const match = key.match(/^(.+)_(\d+)rm$/)
          if (!match) return null

          const [_, exerciseName, repMax] = match
          return {
            exerciseName: exerciseName,
            repMax: parseInt(repMax),
            weight: parseFloat(value),
          }
        })
        .filter((pr): pr is NonNullable<typeof pr> => pr !== null)

      await bulkUpsertPRs({ athleteName: selectedAthlete, prs })
      setPrSuccess(true)
    } catch (err) {
      const message = (err as Error)?.message || String(err)
      setPrError(message)
    }
  }

  const handleDeleteAthlete = async () => {
    if (!selectedAthlete) {
      return
    }
    setDeleteError(null)
    try {
      await deleteAthlete({ userId: USER_ID, athleteName: selectedAthlete })
      setShowDeleteModal(false)
      setSelectedProgram(null)
      setSelectedAthlete(null)
    } catch (err) {
      const message = (err as Error)?.message || String(err)
      setDeleteError(message)
    }
  }

  const handleDeleteProgram = async () => {
    if (!selectedAthlete || !programToDelete) {
      return
    }
    setDeleteProgramError(null)
    try {
      await deleteProgram({
        userId: USER_ID,
        athleteName: selectedAthlete,
        programName: programToDelete.program_name,
        startDate: programToDelete.start_date,
      })
      if (selectedProgram?.name === programToDelete.program_name) {
        setSelectedProgram(null)
      }
      setProgramToDelete(null)
      setShowDeleteProgramModal(false)
    } catch (err) {
      const message = (err as Error)?.message || String(err)
      setDeleteProgramError(message)
    }
  }

  // Convert Convex program data to workout records for WorkoutView
  const workouts: WorkoutRecord[] = selectedProgramData
    ? selectedProgramData.weeks.flatMap((week) =>
        week.days.flatMap((day) =>
          day.exercises.map((ex) => {
            const reps = Array.isArray(ex.reps) ? ex.reps[0] ?? '' : ex.reps
            const percent = Array.isArray(ex.percent) ? ex.percent[0] ?? null : ex.percent ?? null
            return {
            user_id: USER_ID,
            athlete_name: selectedProgramData.athleteName,
            program_name: selectedProgramData.programName,
            start_date: selectedProgramData.startDate,
            week_number: week.weekNumber,
            day_number: day.dayNumber,
            day_of_week: day.dayOfWeek || null,
            exercise_number: ex.exerciseNumber,
            exercise_name: ex.exerciseName,
            exercise_category: ex.exerciseCategory || null,
            exercise_notes: ex.exerciseNotes || null,
            superset_group: ex.supersetGroup || null,
            superset_order: ex.supersetOrder || null,
            sets: ex.sets || null,
            reps,
            weights: ex.weights || null,
            percent,
            athlete_comments: ex.athleteComments || null,
            completed: ex.completed,
            created_at: '',
            updated_at: '',
          }
          })
        )
      )
    : []

  return (
    <div className="page-container">
      <div className="page-header">
        <h1 style={{ margin: 0, color: '#333' }}>Browse Athletes & Programs</h1>
        <div className="header-actions">
          <a
            href="/"
            style={{
              padding: '10px 20px',
              fontSize: '14px',
              fontWeight: '600',
              backgroundColor: '#6c757d',
              color: 'white',
              border: 'none',
              borderRadius: '6px',
              textDecoration: 'none',
              transition: 'background-color 0.2s'
            }}
          >
            ← Back to Scraper
          </a>
          {selectedAthlete && (
            <button
              type="button"
              onClick={() => {
                setDeleteError(null)
                setShowDeleteModal(true)
              }}
              style={{
                padding: '10px 20px',
                fontSize: '14px',
                fontWeight: '600',
                backgroundColor: '#ef4444',
                color: 'white',
                border: 'none',
                borderRadius: '6px',
                cursor: 'pointer'
              }}
            >
              Delete Athlete
            </button>
          )}
        </div>
      </div>

      {/* Breadcrumb navigation */}
      <div style={{ marginBottom: '20px', fontSize: '14px', color: '#666' }}>
        {!selectedAthlete && <span>Select an athlete</span>}
        {selectedAthlete && !selectedProgram && (
          <span>
            <button
              onClick={handleBackToAthletes}
              style={{
                background: 'none',
                border: 'none',
                color: '#0070f3',
                cursor: 'pointer',
                textDecoration: 'underline',
                padding: 0,
                fontSize: '14px'
              }}
            >
              Athletes
            </button>
            {' > '}
            <span style={{ fontWeight: '600' }}>{selectedAthlete.charAt(0).toUpperCase() + selectedAthlete.slice(1)}</span>
            {' > Select a program'}
          </span>
        )}
        {selectedAthlete && selectedProgram && (
          <span>
            <button
              onClick={handleBackToAthletes}
              style={{
                background: 'none',
                border: 'none',
                color: '#0070f3',
                cursor: 'pointer',
                textDecoration: 'underline',
                padding: 0,
                fontSize: '14px'
              }}
            >
              Athletes
            </button>
            {' > '}
            <button
              onClick={handleBackToPrograms}
              style={{
                background: 'none',
                border: 'none',
                color: '#0070f3',
                cursor: 'pointer',
                textDecoration: 'underline',
                padding: 0,
                fontSize: '14px'
              }}
            >
              {selectedAthlete.charAt(0).toUpperCase() + selectedAthlete.slice(1)}
            </button>
            {' > '}
            <span style={{ fontWeight: '600' }}>{selectedProgram.name}</span>
          </span>
        )}
      </div>

      {/* Athletes List */}
      {!selectedAthlete && (
        <div style={{
          padding: '20px',
          backgroundColor: '#f8f9fa',
          borderRadius: '8px',
          border: '1px solid #dee2e6'
        }}>
          <h2 style={{ marginBottom: '15px', fontSize: '18px', color: '#333' }}>
            Athletes
          </h2>

          {athletes === undefined && (
            <p style={{ color: '#666' }}>Loading athletes...</p>
          )}

          {athletes && athletes.length === 0 && (
            <p style={{ color: '#666' }}>
              No athletes found. Push some workout data to the database first.
            </p>
          )}

          {athletes && athletes.length > 0 && (
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))',
              gap: '10px'
            }}>
              {athletes.map(athlete => (
                <button
                  key={athlete}
                  onClick={() => handleAthleteSelect(athlete)}
                  style={{
                    padding: '15px',
                    fontSize: '16px',
                    fontWeight: '500',
                    backgroundColor: 'white',
                    color: '#333',
                    border: '1px solid #ddd',
                    borderRadius: '6px',
                    cursor: 'pointer',
                    transition: 'all 0.2s',
                    textAlign: 'left'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor = '#0070f3'
                    e.currentTarget.style.color = 'white'
                    e.currentTarget.style.borderColor = '#0070f3'
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = 'white'
                    e.currentTarget.style.color = '#333'
                    e.currentTarget.style.borderColor = '#ddd'
                  }}
                >
                  {athlete.charAt(0).toUpperCase() + athlete.slice(1) || '(No name)'}
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Programs List */}
      {selectedAthlete && !selectedProgram && (
        <div style={{
          padding: '20px',
          backgroundColor: '#f8f9fa',
          borderRadius: '8px',
          border: '1px solid #dee2e6'
        }}>
          <h2 style={{ marginBottom: '15px', fontSize: '18px', color: '#333' }}>
            Programs for {selectedAthlete.charAt(0).toUpperCase() + selectedAthlete.slice(1)}
          </h2>

          {programs === undefined && (
            <p style={{ color: '#666' }}>Loading programs...</p>
          )}

          {programs && programs.length === 0 && (
            <p style={{ color: '#666' }}>No programs found for this athlete.</p>
          )}

          {programs && programs.length > 0 && (
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))',
              gap: '10px'
            }}>
              {programs.map(program => (
                <div
                  key={`${program.programName}-${program.startDate}`}
                  onClick={() => handleProgramSelect(program.programName, program.startDate)}
                  role="button"
                  tabIndex={0}
                  style={{
                    padding: '15px',
                    fontSize: '16px',
                    fontWeight: '500',
                    backgroundColor: 'white',
                    color: '#333',
                    border: '1px solid #ddd',
                    borderRadius: '6px',
                    cursor: 'pointer',
                    transition: 'all 0.2s',
                    textAlign: 'left'
                  }}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter' || event.key === ' ') {
                      event.preventDefault()
                      handleProgramSelect(program.programName, program.startDate)
                    }
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor = '#10b981'
                    e.currentTarget.style.color = 'white'
                    e.currentTarget.style.borderColor = '#10b981'
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = 'white'
                    e.currentTarget.style.color = '#333'
                    e.currentTarget.style.borderColor = '#ddd'
                  }}
                >
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: '10px',
                    marginBottom: '5px'
                  }}>
                    <div style={{ fontWeight: '600' }}>
                      {program.programName}
                    </div>
                    <button
                      type="button"
                      onClick={(event) => {
                        event.stopPropagation()
                        setDeleteProgramError(null)
                        setProgramToDelete({
                          program_name: program.programName,
                          start_date: program.startDate
                        })
                        setShowDeleteProgramModal(true)
                      }}
                      style={{
                        padding: '4px 8px',
                        fontSize: '12px',
                        fontWeight: 600,
                        backgroundColor: '#ef4444',
                        color: 'white',
                        border: 'none',
                        borderRadius: '6px',
                        cursor: 'pointer'
                      }}
                    >
                      Delete
                    </button>
                  </div>
                  {program.startDate && (
                    <div style={{ fontSize: '13px', color: 'inherit', opacity: 0.8 }}>
                      Start: {formatDate(program.startDate)}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {selectedAthlete && (
        <div style={{
          marginTop: '24px',
          padding: '20px',
          backgroundColor: '#ffffff',
          borderRadius: '8px',
          border: '1px solid #e5e7eb'
        }}>
          <h2 style={{ marginTop: 0, marginBottom: '12px', fontSize: '18px', color: '#111827' }}>
            Athlete PRs
          </h2>
          <p style={{ marginTop: 0, color: '#6b7280', fontSize: '13px' }}>
            Store current bests for {selectedAthlete}. Leave blank if not available.
          </p>
          {athletePRs === undefined ? (
            <p style={{ color: '#6b7280', fontSize: '13px' }}>Loading PRs...</p>
          ) : (
            <div style={{ display: 'grid', gap: '16px' }}>
              {prSections.map((section) => (
                <div key={section.title}>
                  <h3 style={{ margin: '0 0 8px', fontSize: '15px', color: '#1f2937' }}>
                    {section.title}
                  </h3>
                  <div className="pr-grid">
                    {section.fields.map((field) => (
                      <label key={field.key} style={{ display: 'grid', gap: '6px', fontSize: '12px', color: '#475569' }}>
                        {field.label}
                        <input
                          type="number"
                          inputMode="decimal"
                          value={prValues[field.key]}
                          onChange={(event) =>
                            setPrValues((prev) => ({ ...prev, [field.key]: event.target.value }))
                          }
                          placeholder="kg"
                          style={{
                            padding: '8px',
                            borderRadius: '6px',
                            border: '1px solid #d1d5db',
                            fontSize: '13px'
                          }}
                        />
                      </label>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
          <div style={{ marginTop: '16px', display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
            <button
              type="button"
              onClick={handleSavePrs}
              disabled={athletePRs === undefined}
              style={{
                padding: '10px 18px',
                fontSize: '14px',
                fontWeight: 600,
                backgroundColor: athletePRs === undefined ? '#93c5fd' : '#2563eb',
                color: 'white',
                border: 'none',
                borderRadius: '6px',
                cursor: athletePRs === undefined ? 'not-allowed' : 'pointer'
              }}
            >
              Save PRs
            </button>
            {prSuccess && (
              <span style={{ color: '#16a34a', fontSize: '13px', fontWeight: 600 }}>
                PRs saved.
              </span>
            )}
            {prError && (
              <span style={{ color: '#dc2626', fontSize: '13px' }}>
                {prError}
              </span>
            )}
          </div>
        </div>
      )}

      {/* Workout View */}
      {selectedAthlete && selectedProgram && (
        <div>
          {selectedProgramData === undefined && (
            <p style={{ color: '#666' }}>Loading workouts...</p>
          )}

          {selectedProgramData && workouts.length > 0 && <WorkoutView data={workouts} />}

          {selectedProgramData && workouts.length === 0 && (
            <p style={{ color: '#666' }}>No workouts found for this program.</p>
          )}
        </div>
      )}

      {showDeleteModal && selectedAthlete && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(15, 23, 42, 0.6)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 50
          }}
        >
          <div
            style={{
              width: 'min(460px, 92vw)',
              backgroundColor: '#ffffff',
              borderRadius: '10px',
              padding: '20px',
              boxShadow: '0 20px 40px rgba(15, 23, 42, 0.2)',
              border: '1px solid #e5e7eb'
            }}
          >
            <h3 style={{ marginTop: 0, marginBottom: '8px', color: '#111827' }}>
              Delete athlete workouts?
            </h3>
            <p style={{ marginTop: 0, color: '#6b7280', fontSize: '14px' }}>
              This removes all workouts, program days, and metadata for
              <strong> {selectedAthlete}</strong>. Library templates are not affected.
            </p>
            {deleteError && (
              <p style={{ marginTop: '10px', color: '#dc2626', fontSize: '13px' }}>
                {deleteError}
              </p>
            )}
            <div style={{ marginTop: '16px', display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
              <button
                type="button"
                onClick={() => setShowDeleteModal(false)}
                style={{
                  padding: '8px 14px',
                  borderRadius: '6px',
                  border: '1px solid #d1d5db',
                  backgroundColor: '#f8fafc',
                  color: '#1f2937',
                  cursor: 'pointer'
                }}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDeleteAthlete}
                style={{
                  padding: '8px 14px',
                  borderRadius: '6px',
                  border: 'none',
                  backgroundColor: '#ef4444',
                  color: 'white',
                  fontWeight: 600,
                  cursor: 'pointer'
                }}
              >
                Delete Workouts
              </button>
            </div>
          </div>
        </div>
      )}

      {showDeleteProgramModal && selectedAthlete && programToDelete && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(15, 23, 42, 0.6)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 50
          }}
        >
          <div
            style={{
              width: 'min(460px, 92vw)',
              backgroundColor: '#ffffff',
              borderRadius: '10px',
              padding: '20px',
              boxShadow: '0 20px 40px rgba(15, 23, 42, 0.2)',
              border: '1px solid #e5e7eb'
            }}
          >
            <h3 style={{ marginTop: 0, marginBottom: '8px', color: '#111827' }}>
              Delete this program?
            </h3>
            <p style={{ marginTop: 0, color: '#6b7280', fontSize: '14px' }}>
              This removes all workouts, program days, and metadata for
              <strong> {programToDelete.program_name}</strong> under
              <strong> {selectedAthlete}</strong>. Library templates are not affected.
            </p>
            {programToDelete.start_date && (
              <p style={{ marginTop: 0, color: '#6b7280', fontSize: '13px' }}>
                Start date: {formatDate(programToDelete.start_date)}
              </p>
            )}
            {deleteProgramError && (
              <p style={{ marginTop: '10px', color: '#dc2626', fontSize: '13px' }}>
                {deleteProgramError}
              </p>
            )}
            <div style={{ marginTop: '16px', display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
              <button
                type="button"
                onClick={() => {
                  setShowDeleteProgramModal(false)
                  setProgramToDelete(null)
                }}
                style={{
                  padding: '8px 14px',
                  borderRadius: '6px',
                  border: '1px solid #d1d5db',
                  backgroundColor: '#f8fafc',
                  color: '#1f2937',
                  cursor: 'pointer'
                }}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDeleteProgram}
                style={{
                  padding: '8px 14px',
                  borderRadius: '6px',
                  border: 'none',
                  backgroundColor: '#ef4444',
                  color: 'white',
                  fontWeight: 600,
                  cursor: 'pointer'
                }}
              >
                Delete Program
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
