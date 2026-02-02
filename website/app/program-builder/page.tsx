'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { useQuery, useMutation, useConvex } from 'convex/react'
import { api } from '../../../convex/_generated/api'
import Link from 'next/link'
import ProgramBuilder from '../components/ProgramBuilder'
import ProgramPreview from '../components/ProgramPreview'
import {
  ProgramBuilderDay,
  ProgramBuilderExercise,
  ProgramLibraryRecord,
  RepTargets,
  WeekTotalReps,
  WorkoutRecord
} from '@/types/workout'
import { applyProgramOverride, buildGeneratedProgramWeeks } from '@/lib/program-builder'
import { validateGeneratedProgramInputs } from '@/lib/program-validation'
import {
  buildDefaultDays,
  buildDefaultsIfSequential,
  createEmptyDay,
  createExercise,
  programBuilderTemplateOptions,
  ProgramBuilderTemplateId
} from '@/lib/program-builder-defaults'
import { parseCount, parseIntensityValues, parseRepsValues } from '@/lib/value-parse'

// TODO: Replace with actual user ID from authentication
const USER_ID = 'default-user'

export default function ProgramBuilderPage() {
  const [days, setDays] = useState<ProgramBuilderDay[]>([])
  const [weekCount, setWeekCount] = useState(4)
  const [repTargets, setRepTargets] = useState<RepTargets>({
    snatch: '',
    clean: '',
    jerk: '',
    squat: '',
    pull: ''
  })
  // Convex queries
  const athletesFromDb = useQuery(api.programs.getAthletes, { userId: USER_ID }) ?? []
  const [localAthletes, setLocalAthletes] = useState<string[]>([])
  const athletes = [...athletesFromDb, ...localAthletes].filter((v, i, a) => a.indexOf(v) === i).sort()

  // Convex mutations and queries
  const convex = useConvex()
  const insertProgram = useMutation(api.programs.insertProgram)
  const saveTemplate = useMutation(api.programTemplates.saveTemplate)

  const [showNewAthleteInput, setShowNewAthleteInput] = useState(false)
  const [newAthleteName, setNewAthleteName] = useState('')
  const [athleteInputError, setAthleteInputError] = useState<string | null>(null)
  const [weekTotals, setWeekTotals] = useState<WeekTotalReps[]>([])
  const [athleteName, setAthleteName] = useState('')
  const [programName, setProgramName] = useState('')
  const [startDate, setStartDate] = useState('')
  const [pushingToDatabase, setPushingToDatabase] = useState(false)
  const [pushSuccess, setPushSuccess] = useState(false)
  const [savingToLibrary, setSavingToLibrary] = useState(false)
  const [librarySuccess, setLibrarySuccess] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [libraryError, setLibraryError] = useState<string | null>(null)
  const [templateActive, setTemplateActive] = useState(false)
  const [selectedTemplate, setSelectedTemplate] = useState<ProgramBuilderTemplateId>('classic')
  const successTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const librarySuccessTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const newAthleteInputRef = useRef<HTMLInputElement | null>(null)

  const generatedProgram = useMemo(
    () => buildGeneratedProgramWeeks(days, weekCount, { enableWeekAdjustments: templateActive }),
    [days, weekCount, templateActive]
  )
  const programValidation = useMemo(
    () => validateGeneratedProgramInputs(generatedProgram),
    [generatedProgram]
  )
  const pushDisabled = pushingToDatabase
    || generatedProgram.length === 0
    || !athleteName.trim()
    || !programName.trim()
    || !startDate.trim()
  const saveToLibraryDisabled = savingToLibrary
    || generatedProgram.length === 0
    || !programName.trim()

  const handleLoadTemplate = () => {
    const selectedNumbers = days.map((day) => day.dayNumber)
    const templateCount = [3, 4, 5].includes(selectedNumbers.length)
      ? selectedNumbers.length
      : 4
    setDays(buildDefaultDays(templateCount, selectedTemplate))
    setTemplateActive(true)
  }

  const handleToggleDay = (dayNumber: number) => {
    setDays((prev) => {
      const exists = prev.find((day) => day.dayNumber === dayNumber)
      const nextNumbers = exists
        ? prev.filter((day) => day.dayNumber !== dayNumber).map((day) => day.dayNumber)
        : [...prev.map((day) => day.dayNumber), dayNumber]
      if (templateActive) {
        const defaultDays = buildDefaultsIfSequential(nextNumbers, selectedTemplate)
        if (defaultDays) {
          return defaultDays
        }
      }
      if (exists) {
        return prev.filter((day) => day.dayNumber !== dayNumber)
      }

      const nextDay = createEmptyDay(dayNumber)
      return [...prev, nextDay].sort((a, b) => a.dayNumber - b.dayNumber)
    })
  }

  const handleDayLabelChange = (dayNumber: number, value: string) => {
    setDays((prev) =>
      prev.map((day) =>
        day.dayNumber === dayNumber
          ? { ...day, dayLabel: value }
          : day
      )
    )
  }

  const handleDeleteExercise = (dayNumber: number, exerciseId: string) => {
    setDays((prev) =>
      prev.map((day) => {
        if (day.dayNumber !== dayNumber) {
          return day
        }

        const nextExercises = day.exercises.filter((exercise) => exercise.id !== exerciseId)
        if (nextExercises.length === day.exercises.length) {
          return day
        }

        let nextOverrides = day.weekOverrides
        if (nextOverrides) {
          const cleanedOverrides: Record<number, Record<string, Partial<ProgramBuilderExercise>>> = {}
          Object.entries(nextOverrides).forEach(([weekKey, overrides]) => {
            const nextOverrideSet = { ...overrides }
            delete nextOverrideSet[exerciseId]
            if (Object.keys(nextOverrideSet).length > 0) {
              cleanedOverrides[Number(weekKey)] = nextOverrideSet
            }
          })
          nextOverrides = Object.keys(cleanedOverrides).length > 0 ? cleanedOverrides : undefined
        }

        return {
          ...day,
          exercises: nextExercises,
          weekOverrides: nextOverrides
        }
      })
    )
  }

  const handleAddExercise = (dayNumber: number) => {
    setDays((prev) =>
      prev.map((day) => {
        if (day.dayNumber !== dayNumber) {
          return day
        }
        const nextIndex = day.exercises.length
        const nextExercise = createExercise(dayNumber, nextIndex)
        return {
          ...day,
          exercises: [...day.exercises, nextExercise]
        }
      })
    )
  }

  // Athletes are loaded via Convex useQuery hook above

  useEffect(() => {
    if (showNewAthleteInput) {
      newAthleteInputRef.current?.focus()
    }
  }, [showNewAthleteInput])

  useEffect(() => {
    return () => {
      if (successTimeoutRef.current) {
        clearTimeout(successTimeoutRef.current)
      }
      if (librarySuccessTimeoutRef.current) {
        clearTimeout(librarySuccessTimeoutRef.current)
      }
    }
  }, [])

  const buildWorkoutRecords = (): Omit<WorkoutRecord, 'id' | 'created_at' | 'updated_at'>[] => {
    const athlete = athleteName.trim().toLowerCase()
    const program = programName.trim().toLowerCase()
    const start = startDate.trim()
    const user = userId.trim()

    return generatedProgram.flatMap((week) =>
      week.days.flatMap((day) =>
        day.exercises.flatMap((exercise, exerciseIndex) => {
          const dayLabel = (day.dayLabel ?? day.dayOfWeek ?? '').trim()
          const dayOfWeek = dayLabel ? dayLabel.toLowerCase() : null
          const intensityValues = parseIntensityValues(exercise.intensity || '')
          const parsedSets = Math.max(parseCount(exercise.sets || '') || 1, 1)
          const setCount =
            intensityValues.length > 0
              ? Math.max(intensityValues.length, parsedSets)
              : parsedSets
          const supersetGroup = exercise.supersetGroup?.trim() || null
          const supersetOrder = supersetGroup
            ? Number.parseInt(exercise.supersetOrder || '', 10)
            : null
          const normalizedSupersetOrder = Number.isNaN(supersetOrder ?? NaN) ? null : supersetOrder

          return Array.from({ length: setCount }, (_, setIndex) => ({
            user_id: user,
            athlete_name: athlete,
            program_name: program,
            start_date: start,
            week_number: week.weekNumber,
            day_number: day.dayNumber,
            day_of_week: dayOfWeek,
            exercise_number: exerciseIndex + 1,
            exercise_name: exercise.name || `Exercise ${exerciseIndex + 1}`,
            exercise_category: exercise.category?.trim() || null,
            exercise_notes: exercise.notes?.trim() || null,
            superset_group: supersetGroup,
            superset_order: normalizedSupersetOrder,
            sets: setIndex + 1,
            reps: exercise.reps || '',
            weights: null,
            percent: intensityValues[setIndex] ?? intensityValues[intensityValues.length - 1] ?? null,
            athlete_comments: null,
            completed: false
          }))
        })
      )
    )
  }

  const buildLibraryRecords = ():
    Omit<ProgramLibraryRecord, 'id' | 'created_at' | 'updated_at'>[] => {
    const program = programName.trim().toLowerCase()

    return generatedProgram.flatMap((week) =>
      week.days.flatMap((day) =>
        day.exercises.flatMap((exercise, exerciseIndex) => {
          const dayLabel = (day.dayLabel ?? day.dayOfWeek ?? '').trim()
          const dayOfWeek = dayLabel ? dayLabel.toLowerCase() : null
          const intensityValues = parseIntensityValues(exercise.intensity || '')
          const parsedSets = Math.max(parseCount(exercise.sets || '') || 1, 1)
          const setCount =
            intensityValues.length > 0
              ? Math.max(intensityValues.length, parsedSets)
              : parsedSets
          const supersetGroup = exercise.supersetGroup?.trim() || null
          const supersetOrder = supersetGroup
            ? Number.parseInt(exercise.supersetOrder || '', 10)
            : null
          const normalizedSupersetOrder = Number.isNaN(supersetOrder ?? NaN) ? null : supersetOrder

          return Array.from({ length: setCount }, (_, setIndex) => ({
            user_id: 'manual',
            program_name: program,
            week_number: week.weekNumber,
            day_number: day.dayNumber,
            day_of_week: dayOfWeek,
            exercise_number: exerciseIndex + 1,
            exercise_name: exercise.name || `Exercise ${exerciseIndex + 1}`,
            exercise_category: exercise.category?.trim() || null,
            exercise_notes: exercise.notes?.trim() || null,
            superset_group: supersetGroup,
            superset_order: normalizedSupersetOrder,
            sets: setIndex + 1,
            reps: exercise.reps || '',
            weights: null,
            percent: intensityValues[setIndex] ?? intensityValues[intensityValues.length - 1] ?? null,
            athlete_comments: null,
            completed: false
          }))
        })
      )
    )
  }

  const handleSelectAthlete = (value: string) => {
    setAthleteName(value)
    if (value) {
      setShowNewAthleteInput(false)
      setNewAthleteName('')
      setAthleteInputError(null)
    }
  }

  const handleAddNewAthlete = () => {
    const trimmedName = newAthleteName.trim()
    if (!trimmedName) {
      setAthleteInputError('Please enter an athlete name.')
      return
    }

    setAthleteInputError(null)
    setAthleteName(trimmedName)
    setLocalAthletes((prev) => {
      const normalized = trimmedName.toLowerCase()
      const exists = [...athletesFromDb, ...prev].some((athlete) => athlete.trim().toLowerCase() === normalized)
      if (exists) {
        return prev
      }
      return [...prev, trimmedName].sort((a, b) => a.localeCompare(b))
    })
    setNewAthleteName('')
    setShowNewAthleteInput(false)
  }

  const handleCancelNewAthlete = () => {
    setShowNewAthleteInput(false)
    setNewAthleteName('')
    setAthleteInputError(null)
  }

  const handlePushToDatabase = async () => {
    if (generatedProgram.length === 0) {
      setError('No program data to push. Please add days and exercises first.')
      return
    }

    if (!athleteName.trim() || !programName.trim() || !startDate.trim()) {
      setError('Please enter athlete name, program name, and start date before pushing.')
      return
    }

    setPushingToDatabase(true)
    setError(null)
    setPushSuccess(false)

    try {
      if (!programValidation.isValid) {
        setError(programValidation.message || 'Please complete all exercise inputs before pushing.')
        setPushingToDatabase(false)
        return
      }
      const normalizedAthlete = athleteName.trim().toLowerCase()
      const normalizedProgram = programName.trim().toLowerCase()
      const start = startDate.trim()

      // Check if program exists
      const exists = await convex.query(api.programs.checkProgramExists, {
        userId: USER_ID,
        athleteName: normalizedAthlete,
        programName: normalizedProgram,
        startDate: start
      })
      if (exists) {
        setError(
          `Program "${programName.trim()}" already exists for athlete "${athleteName.trim()}". ` +
          'Please use a different program name or delete the existing program first.'
        )
        setPushingToDatabase(false)
        return
      }

      // Transform to nested Convex structure
      const weeks = generatedProgram.map((week) => ({
        weekNumber: week.weekNumber,
        days: week.days.map((day) => ({
          dayNumber: day.dayNumber,
          dayOfWeek: day.dayOfWeek || undefined,
          dayLabel: day.dayLabel || undefined,
          completed: false,
          rating: undefined,
          completedAt: undefined,
          exercises: day.exercises.map((ex, idx) => {
            const intensityValues = ex.intensity ? parseIntensityValues(ex.intensity) : []
            const repsValues = ex.reps ? parseRepsValues(ex.reps) : []
            return {
              exerciseNumber: idx + 1,
              exerciseName: ex.name || `Exercise ${idx + 1}`,
              exerciseCategory: ex.category || undefined,
              exerciseNotes: ex.notes || undefined,
              supersetGroup: ex.supersetGroup || undefined,
              supersetOrder: ex.supersetOrder ? parseInt(ex.supersetOrder) : undefined,
              sets: ex.sets ? parseInt(ex.sets) : undefined,
              reps: repsValues.length > 1 ? repsValues : (repsValues[0] ?? ''),
              weights: undefined,
              percent: intensityValues.length > 1 ? intensityValues : (intensityValues[0] ?? undefined),
              completed: false,
              athleteComments: undefined,
            }
          }),
        })),
      }))

      await insertProgram({
        userId: USER_ID,
        athleteName: normalizedAthlete,
        programName: normalizedProgram,
        startDate: start,
        weekCount,
        repTargets,
        weekTotals,
        weeks,
      })

      setPushSuccess(true)
      if (successTimeoutRef.current) {
        clearTimeout(successTimeoutRef.current)
      }
      successTimeoutRef.current = setTimeout(() => setPushSuccess(false), 3000)
    } catch (err) {
      const errorMessage = (err as Error)?.message || String(err)
      setError('Failed to push to database: ' + errorMessage)
    } finally {
      setPushingToDatabase(false)
    }
  }

  const handleSaveToLibrary = async () => {
    if (generatedProgram.length === 0) {
      setLibraryError('No program data to save. Please add days and exercises first.')
      return
    }

    if (!programName.trim()) {
      setLibraryError('Please enter a program name before saving to the library.')
      return
    }

    setSavingToLibrary(true)
    setLibraryError(null)
    setLibrarySuccess(false)

    try {
      if (!programValidation.isValid) {
        setLibraryError(programValidation.message || 'Please complete all exercise inputs before saving.')
        setSavingToLibrary(false)
        return
      }
      const normalizedProgram = programName.trim().toLowerCase()

      // Check if template exists
      const exists = await convex.query(api.programTemplates.checkTemplateExists, {
        userId: USER_ID,
        programName: normalizedProgram
      })
      if (exists) {
        setLibraryError(
          `Program "${programName.trim()}" already exists in the library. ` +
          'Please use a different program name or delete the existing program first.'
        )
        setSavingToLibrary(false)
        return
      }

      // Transform to nested Convex structure
      const weeks = generatedProgram.map((week) => ({
        weekNumber: week.weekNumber,
        days: week.days.map((day) => ({
          dayNumber: day.dayNumber,
          dayOfWeek: day.dayOfWeek || undefined,
          dayLabel: day.dayLabel || undefined,
          exercises: day.exercises.map((ex, idx) => {
            const intensityValues = ex.intensity ? parseIntensityValues(ex.intensity) : []
            const repsValues = ex.reps ? parseRepsValues(ex.reps) : []
            return {
              exerciseNumber: idx + 1,
              exerciseName: ex.name || `Exercise ${idx + 1}`,
              exerciseCategory: ex.category || undefined,
              exerciseNotes: ex.notes || undefined,
              supersetGroup: ex.supersetGroup || undefined,
              supersetOrder: ex.supersetOrder ? parseInt(ex.supersetOrder) : undefined,
              sets: ex.sets ? parseInt(ex.sets) : undefined,
              reps: repsValues.length > 1 ? repsValues : (repsValues[0] ?? ''),
              weights: undefined,
              percent: intensityValues.length > 1 ? intensityValues : (intensityValues[0] ?? undefined),
            }
          }),
        })),
      }))

      await saveTemplate({
        userId: USER_ID,
        programName: normalizedProgram,
        weekCount,
        repTargets,
        weekTotals,
        weeks,
      })

      setLibrarySuccess(true)
      if (librarySuccessTimeoutRef.current) {
        clearTimeout(librarySuccessTimeoutRef.current)
      }
      librarySuccessTimeoutRef.current = setTimeout(() => setLibrarySuccess(false), 3000)
    } catch (err) {
      const errorMessage = (err as Error)?.message || String(err)
      setLibraryError('Failed to save to library: ' + errorMessage)
    } finally {
      setSavingToLibrary(false)
    }
  }

  return (
    <div className="page-container">
      <div className="page-header">
        <h1 style={{ margin: 0, color: '#333' }}>Program Builder</h1>
        <div className="header-actions">
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
            href="/program-library"
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
            Program Library
          </Link>
          <Link
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
          </Link>
        </div>
      </div>

      <p style={{ marginBottom: '20px', color: '#666', fontSize: '14px' }}>
        Build a program template by selecting training days and adding exercises.
      </p>

      <div style={{
        marginBottom: '24px',
        padding: '16px',
        backgroundColor: '#ffffff',
        borderRadius: '8px',
        border: '1px solid #e5e7eb',
        display: 'flex',
        alignItems: 'center',
        gap: '16px',
        flexWrap: 'wrap'
      }}>
        <div style={{ flex: '1 1 240px' }}>
          <h2 style={{ margin: 0, fontSize: '16px', color: '#111827' }}>
            Preset template
          </h2>
          <p style={{ margin: '6px 0 0', fontSize: '13px', color: '#6b7280' }}>
            Loads the default day setup and week-over-week intensity logic.
          </p>
        </div>
        <div style={{ minWidth: '220px' }}>
          <label
            htmlFor="template-select"
            style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#374151' }}
          >
            Template type
          </label>
          <select
            id="template-select"
            value={selectedTemplate}
            onChange={(event) => setSelectedTemplate(event.target.value as ProgramBuilderTemplateId)}
            style={{
              marginTop: '6px',
              padding: '8px 10px',
              fontSize: '14px',
              border: '1px solid #d1d5db',
              borderRadius: '6px',
              backgroundColor: '#fff',
              width: '100%'
            }}
          >
            {programBuilderTemplateOptions.map((option) => (
              <option key={option.id} value={option.id}>
                {option.label}
              </option>
            ))}
          </select>
        </div>
        <button
          type="button"
          onClick={handleLoadTemplate}
          style={{
            padding: '10px 18px',
            fontSize: '14px',
            fontWeight: 600,
            backgroundColor: templateActive ? '#0f172a' : '#111827',
            color: 'white',
            border: 'none',
            borderRadius: '6px',
            cursor: 'pointer'
          }}
        >
          {templateActive ? 'Reload Template' : 'Load Template'}
        </button>
      </div>

      <div style={{
        marginBottom: '24px',
        padding: '20px',
        backgroundColor: '#f8f9fa',
        borderRadius: '8px',
        border: '1px solid #dee2e6'
      }}>
        <h2 style={{ marginBottom: '15px', fontSize: '18px', color: '#333' }}>
          Program Details
        </h2>
        <div style={{ display: 'grid', gap: '14px' }}>
          <div>
            <label style={{ display: 'block', marginBottom: '5px', fontWeight: '600', color: '#555' }}>
              Athlete Name <span style={{ color: '#d00' }}>*</span>:
            </label>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px', alignItems: 'center' }}>
              <select
                value={athleteName}
                onChange={(event) => handleSelectAthlete(event.target.value)}
                disabled={athletesFromDb === undefined}
                style={{
                  flex: '1 1 220px',
                  padding: '10px',
                  fontSize: '14px',
                  border: '1px solid #ddd',
                  borderRadius: '4px',
                  backgroundColor: athletesFromDb === undefined ? '#f3f4f6' : '#fff'
                }}
              >
                <option value="">
                  {athletesFromDb === undefined ? 'Loading athletes...' : 'Select athlete'}
                </option>
                {athletes.map((athlete) => (
                  <option key={athlete} value={athlete}>
                    {athlete || 'Unnamed athlete'}
                  </option>
                ))}
              </select>
              <button
                type="button"
                onClick={() => setShowNewAthleteInput(true)}
                disabled={showNewAthleteInput}
                style={{
                  padding: '10px 14px',
                  fontSize: '13px',
                  fontWeight: 600,
                  borderRadius: '6px',
                  border: '1px solid #cbd5f5',
                  backgroundColor: showNewAthleteInput ? '#e5e7eb' : '#eef2ff',
                  color: showNewAthleteInput ? '#9ca3af' : '#1e3a8a',
                  cursor: showNewAthleteInput ? 'not-allowed' : 'pointer'
                }}
              >
                Add new
              </button>
            </div>
            {showNewAthleteInput && (
              <div style={{ marginTop: '10px', display: 'flex', flexWrap: 'wrap', gap: '10px' }}>
                <input
                  type="text"
                  ref={newAthleteInputRef}
                  value={newAthleteName}
                  onChange={(event) => setNewAthleteName(event.target.value)}
                  placeholder="New athlete name"
                  style={{
                    flex: '1 1 200px',
                    padding: '10px',
                    fontSize: '14px',
                    border: '1px solid #d1d5db',
                    borderRadius: '4px'
                  }}
                />
                <button
                  type="button"
                  onClick={handleAddNewAthlete}
                  style={{
                    padding: '10px 14px',
                    fontSize: '13px',
                    fontWeight: 600,
                    borderRadius: '6px',
                    border: '1px solid #16a34a',
                    backgroundColor: '#16a34a',
                    color: '#fff',
                    cursor: 'pointer'
                  }}
                >
                  Save athlete
                </button>
                <button
                  type="button"
                  onClick={handleCancelNewAthlete}
                  style={{
                    padding: '10px 14px',
                    fontSize: '13px',
                    fontWeight: 600,
                    borderRadius: '6px',
                    border: '1px solid #e5e7eb',
                    backgroundColor: '#f8fafc',
                    color: '#475569',
                    cursor: 'pointer'
                  }}
                >
                  Cancel
                </button>
                <p style={{ flexBasis: '100%', margin: 0, fontSize: '12px', color: '#6b7280' }}>
                  New athletes are saved when you push the program to the database.
                </p>
              </div>
            )}
            {athleteInputError && (
              <p style={{ marginTop: '6px', marginBottom: 0, fontSize: '12px', color: '#dc2626' }}>
                {athleteInputError}
              </p>
            )}
          </div>
          <div>
            <label style={{ display: 'block', marginBottom: '5px', fontWeight: '600', color: '#555' }}>
              Program Name <span style={{ color: '#d00' }}>*</span>:
            </label>
            <input
              type="text"
              value={programName}
              onChange={(event) => setProgramName(event.target.value)}
              placeholder="Enter program name"
              style={{
                width: '100%',
                padding: '10px',
                fontSize: '14px',
                border: '1px solid #ddd',
                borderRadius: '4px'
              }}
            />
          </div>
          <div>
            <label style={{ display: 'block', marginBottom: '5px', fontWeight: '600', color: '#555' }}>
              Start Date <span style={{ color: '#d00' }}>*</span>:
            </label>
            <input
              type="date"
              value={startDate}
              onChange={(event) => setStartDate(event.target.value)}
              style={{
                padding: '10px',
                fontSize: '14px',
                border: '1px solid #ddd',
                borderRadius: '4px'
              }}
            />
            <p style={{ marginTop: '6px', marginBottom: 0, fontSize: '12px', color: '#6b7280' }}>
              The date when this program starts for the athlete.
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={handlePushToDatabase}
          disabled={pushDisabled}
          style={{
            marginTop: '16px',
            padding: '10px 20px',
            fontSize: '14px',
            fontWeight: '600',
            backgroundColor: pushDisabled ? '#e5e7eb' : '#2563eb',
            color: pushDisabled ? '#9ca3af' : 'white',
            border: `1px solid ${pushDisabled ? '#d1d5db' : '#2563eb'}`,
            borderRadius: '6px',
            cursor: pushDisabled ? 'not-allowed' : 'pointer'
          }}
        >
          {pushingToDatabase ? 'Pushing...' : 'Push Program to Database'}
        </button>
        {pushSuccess && (
          <p style={{ marginTop: '10px', color: '#16a34a', fontWeight: 600 }}>
            Program pushed successfully!
          </p>
        )}
        {error && (
          <p style={{ marginTop: '10px', color: '#dc2626', whiteSpace: 'pre-line' }}>
            {error}
          </p>
        )}
        <div style={{ marginTop: '20px', paddingTop: '16px', borderTop: '1px solid #e5e7eb' }}>
          <button
            type="button"
            onClick={handleSaveToLibrary}
            disabled={saveToLibraryDisabled}
            style={{
              padding: '10px 20px',
              fontSize: '14px',
              fontWeight: '600',
              backgroundColor: saveToLibraryDisabled ? '#e5e7eb' : '#4f46e5',
              color: saveToLibraryDisabled ? '#9ca3af' : 'white',
              border: `1px solid ${saveToLibraryDisabled ? '#d1d5db' : '#4f46e5'}`,
              borderRadius: '6px',
              cursor: saveToLibraryDisabled ? 'not-allowed' : 'pointer'
            }}
          >
            {savingToLibrary ? 'Saving...' : 'Save Program to Library'}
          </button>
          {librarySuccess && (
            <p style={{ marginTop: '10px', color: '#16a34a', fontWeight: 600 }}>
              Program saved to the library!
            </p>
          )}
          {libraryError && (
            <p style={{ marginTop: '10px', color: '#dc2626', whiteSpace: 'pre-line' }}>
              {libraryError}
            </p>
          )}
        </div>
      </div>

      <ProgramBuilder
        onChange={setDays}
        onWeekCountChange={setWeekCount}
        onRepTargetsChange={setRepTargets}
        onWeekTotalsChange={setWeekTotals}
      />
      <div style={{ marginBottom: '24px' }}>
      <ProgramPreview
        weeks={generatedProgram}
        repTargets={repTargets}
        weekTotals={weekTotals}
        selectedDayNumbers={days.map((day) => day.dayNumber)}
        onToggleDay={handleToggleDay}
        onDayLabelChange={handleDayLabelChange}
        onAddExercise={handleAddExercise}
        onOverrideChange={(dayNumber, exerciseId, field, value, weekNumber) =>
          setDays((prev) =>
            applyProgramOverride(prev, dayNumber, exerciseId, field, value, weekNumber)
          )
          }
        onDeleteExercise={handleDeleteExercise}
        />
      </div>
    </div>
  )
}
