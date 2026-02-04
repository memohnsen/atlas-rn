'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { useQuery, useMutation, useConvex } from 'convex/react'
import { api } from '@/convex/_generated/api'
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
  const athletesFromDb =
    (useQuery(api.programs.getAthletes, {}) as string[] | undefined) ?? []
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
    const user = USER_ID.trim()

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
          rating: 'Average' as const,
          sessionIntensity: undefined,
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

  const [selectedWeek, setSelectedWeek] = useState<number | 'all'>(1)
  const [detailsPanelOpen, setDetailsPanelOpen] = useState(false)

  const filteredWeeks = useMemo(() => {
    if (selectedWeek === 'all') return generatedProgram
    return generatedProgram.filter(week => week.weekNumber === selectedWeek)
  }, [generatedProgram, selectedWeek])

  return (
    <div style={{
      minHeight: '100vh',
      backgroundColor: '#0a0f1a',
      fontFamily: '"Styrene A", -apple-system, BlinkMacSystemFont, sans-serif',
      color: '#e2e8f0'
    }}>
      {/* Header */}
      <div style={{
        borderBottom: '1px solid #1e293b',
        backgroundColor: '#0f1419',
        position: 'sticky',
        top: 0,
        zIndex: 50
      }}>
        <div style={{
          maxWidth: '1800px',
          margin: '0 auto',
          padding: '20px 32px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '24px'
        }}>
          <div>
            <h1 style={{
              margin: 0,
              fontSize: '28px',
              fontWeight: 700,
              letterSpacing: '-0.02em',
              background: 'linear-gradient(135deg, #f8fafc 0%, #94a3b8 100%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              backgroundClip: 'text'
            }}>
              Program Builder
            </h1>
          </div>
          <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
            <Link
              href="/analytics"
              style={{
                padding: '10px 18px',
                fontSize: '14px',
                fontWeight: 600,
                backgroundColor: 'transparent',
                color: '#94a3b8',
                border: '1px solid #334155',
                borderRadius: '8px',
                textDecoration: 'none',
                transition: 'all 0.2s',
                letterSpacing: '0.01em'
              }}
            >
              Analytics
            </Link>
            <Link
              href="/program-library"
              style={{
                padding: '10px 18px',
                fontSize: '14px',
                fontWeight: 600,
                backgroundColor: 'transparent',
                color: '#94a3b8',
                border: '1px solid #334155',
                borderRadius: '8px',
                textDecoration: 'none',
                transition: 'all 0.2s',
                letterSpacing: '0.01em'
              }}
            >
              Library
            </Link>
            <button
              type="button"
              onClick={() => setDetailsPanelOpen(!detailsPanelOpen)}
              style={{
                padding: '10px 18px',
                fontSize: '14px',
                fontWeight: 600,
                backgroundColor: detailsPanelOpen ? '#1e3a8a' : '#1e40af',
                color: '#e0e7ff',
                border: 'none',
                borderRadius: '8px',
                cursor: 'pointer',
                transition: 'all 0.2s',
                letterSpacing: '0.01em'
              }}
            >
              {detailsPanelOpen ? 'Hide Details' : 'Program Details'}
            </button>
          </div>
        </div>

        {/* Week Navigation */}
        {generatedProgram.length > 0 && (
          <div style={{
            maxWidth: '1800px',
            margin: '0 auto',
            padding: '16px 32px',
            borderTop: '1px solid #1e293b',
            display: 'flex',
            gap: '8px',
            alignItems: 'center',
            overflowX: 'auto'
          }}>
            <button
              type="button"
              onClick={() => setSelectedWeek('all')}
              style={{
                padding: '8px 20px',
                fontSize: '13px',
                fontWeight: 600,
                backgroundColor: selectedWeek === 'all' ? '#0f766e' : 'transparent',
                color: selectedWeek === 'all' ? '#ccfbf1' : '#64748b',
                border: selectedWeek === 'all' ? '1px solid #14b8a6' : '1px solid #334155',
                borderRadius: '8px',
                cursor: 'pointer',
                transition: 'all 0.2s',
                whiteSpace: 'nowrap',
                letterSpacing: '0.02em'
              }}
            >
              All Weeks
            </button>
            {Array.from({ length: weekCount }, (_, i) => i + 1).map((weekNum) => (
              <button
                key={weekNum}
                type="button"
                onClick={() => setSelectedWeek(weekNum)}
                style={{
                  padding: '8px 20px',
                  fontSize: '13px',
                  fontWeight: 600,
                  backgroundColor: selectedWeek === weekNum ? '#0f766e' : 'transparent',
                  color: selectedWeek === weekNum ? '#ccfbf1' : '#64748b',
                  border: selectedWeek === weekNum ? '1px solid #14b8a6' : '1px solid #334155',
                  borderRadius: '8px',
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                  whiteSpace: 'nowrap',
                  letterSpacing: '0.02em'
                }}
              >
                Week {weekNum}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Details Panel (Collapsible) */}
      {detailsPanelOpen && (
        <div style={{
          maxWidth: '1800px',
          margin: '0 auto',
          padding: '32px',
          borderBottom: '1px solid #1e293b',
          backgroundColor: '#0f1419'
        }}>
          <div style={{
            display: 'grid',
            gap: '24px',
            gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))'
          }}>
            {/* Template Section */}
            <div style={{
              padding: '20px',
              backgroundColor: '#1a1f2e',
              borderRadius: '12px',
              border: '1px solid #2d3748'
            }}>
              <h3 style={{
                margin: '0 0 16px',
                fontSize: '16px',
                fontWeight: 600,
                color: '#cbd5e1',
                letterSpacing: '-0.01em'
              }}>
                Preset Template
              </h3>
              <div style={{ display: 'grid', gap: '12px' }}>
                <select
                  value={selectedTemplate}
                  onChange={(event) => setSelectedTemplate(event.target.value as ProgramBuilderTemplateId)}
                  style={{
                    padding: '12px',
                    fontSize: '14px',
                    border: '1px solid #334155',
                    borderRadius: '8px',
                    backgroundColor: '#0f1419',
                    color: '#e2e8f0',
                    width: '100%'
                  }}
                >
                  {programBuilderTemplateOptions.map((option) => (
                    <option key={option.id} value={option.id}>
                      {option.label}
                    </option>
                  ))}
                </select>
                <button
                  type="button"
                  onClick={handleLoadTemplate}
                  style={{
                    padding: '12px',
                    fontSize: '14px',
                    fontWeight: 600,
                    backgroundColor: templateActive ? '#14b8a6' : '#0f766e',
                    color: '#f0fdfa',
                    border: 'none',
                    borderRadius: '8px',
                    cursor: 'pointer',
                    letterSpacing: '0.01em'
                  }}
                >
                  {templateActive ? 'Reload Template' : 'Load Template'}
                </button>
              </div>
            </div>

            {/* Program Details */}
            <div style={{
              padding: '20px',
              backgroundColor: '#1a1f2e',
              borderRadius: '12px',
              border: '1px solid #2d3748'
            }}>
              <h3 style={{
                margin: '0 0 16px',
                fontSize: '16px',
                fontWeight: 600,
                color: '#cbd5e1',
                letterSpacing: '-0.01em'
              }}>
                Program Information
              </h3>
              <div style={{ display: 'grid', gap: '14px' }}>
                <div>
                  <label style={{
                    display: 'block',
                    marginBottom: '6px',
                    fontSize: '13px',
                    fontWeight: 600,
                    color: '#94a3b8',
                    letterSpacing: '0.01em'
                  }}>
                    Athlete Name <span style={{ color: '#f87171' }}>*</span>
                  </label>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <select
                      value={athleteName}
                      onChange={(event) => handleSelectAthlete(event.target.value)}
                      disabled={athletesFromDb === undefined}
                      style={{
                        flex: 1,
                        padding: '12px',
                        fontSize: '14px',
                        border: '1px solid #334155',
                        borderRadius: '8px',
                        backgroundColor: athletesFromDb === undefined ? '#1e293b' : '#0f1419',
                        color: '#e2e8f0',
                        colorScheme: 'dark'
                      }}
                    >
                      <option value="" style={{ backgroundColor: '#0f1419', color: '#e2e8f0' }}>
                        {athletesFromDb === undefined ? 'Loading...' : 'Select athlete'}
                      </option>
                      {athletes.map((athlete) => (
                        <option key={athlete} value={athlete} style={{ backgroundColor: '#0f1419', color: '#e2e8f0' }}>
                          {athlete || 'Unnamed athlete'}
                        </option>
                      ))}
                    </select>
                    <button
                      type="button"
                      onClick={() => setShowNewAthleteInput(true)}
                      disabled={showNewAthleteInput}
                      style={{
                        padding: '12px 16px',
                        fontSize: '13px',
                        fontWeight: 600,
                        borderRadius: '8px',
                        border: '1px solid #334155',
                        backgroundColor: showNewAthleteInput ? '#1e293b' : '#1e40af',
                        color: showNewAthleteInput ? '#64748b' : '#e0e7ff',
                        cursor: showNewAthleteInput ? 'not-allowed' : 'pointer',
                        whiteSpace: 'nowrap'
                      }}
                    >
                      + New
                    </button>
                  </div>
                  {showNewAthleteInput && (
                    <div style={{ marginTop: '8px', display: 'flex', gap: '8px' }}>
                      <input
                        type="text"
                        ref={newAthleteInputRef}
                        value={newAthleteName}
                        onChange={(event) => setNewAthleteName(event.target.value)}
                        placeholder="New athlete name"
                        style={{
                          flex: 1,
                          padding: '12px',
                          fontSize: '14px',
                          border: '1px solid #334155',
                          borderRadius: '8px',
                          backgroundColor: '#0f1419',
                          color: '#e2e8f0'
                        }}
                      />
                      <button
                        type="button"
                        onClick={handleAddNewAthlete}
                        style={{
                          padding: '12px 16px',
                          fontSize: '13px',
                          fontWeight: 600,
                          borderRadius: '8px',
                          border: 'none',
                          backgroundColor: '#14b8a6',
                          color: '#f0fdfa',
                          cursor: 'pointer',
                          whiteSpace: 'nowrap'
                        }}
                      >
                        Save
                      </button>
                      <button
                        type="button"
                        onClick={handleCancelNewAthlete}
                        style={{
                          padding: '12px 16px',
                          fontSize: '13px',
                          fontWeight: 600,
                          borderRadius: '8px',
                          border: '1px solid #334155',
                          backgroundColor: 'transparent',
                          color: '#94a3b8',
                          cursor: 'pointer'
                        }}
                      >
                        Cancel
                      </button>
                    </div>
                  )}
                  {athleteInputError && (
                    <p style={{
                      marginTop: '6px',
                      marginBottom: 0,
                      fontSize: '12px',
                      color: '#f87171'
                    }}>
                      {athleteInputError}
                    </p>
                  )}
                </div>
                <div>
                  <label style={{
                    display: 'block',
                    marginBottom: '6px',
                    fontSize: '13px',
                    fontWeight: 600,
                    color: '#94a3b8',
                    letterSpacing: '0.01em'
                  }}>
                    Program Name <span style={{ color: '#f87171' }}>*</span>
                  </label>
                  <input
                    type="text"
                    value={programName}
                    onChange={(event) => setProgramName(event.target.value)}
                    placeholder="Enter program name"
                    style={{
                      width: '100%',
                      padding: '12px',
                      fontSize: '14px',
                      border: '1px solid #334155',
                      borderRadius: '8px',
                      backgroundColor: '#0f1419',
                      color: '#e2e8f0'
                    }}
                  />
                </div>
                <div>
                  <label style={{
                    display: 'block',
                    marginBottom: '6px',
                    fontSize: '13px',
                    fontWeight: 600,
                    color: '#94a3b8',
                    letterSpacing: '0.01em'
                  }}>
                    Start Date <span style={{ color: '#f87171' }}>*</span>
                  </label>
                  <input
                    type="date"
                    value={startDate}
                    onChange={(event) => setStartDate(event.target.value)}
                    style={{
                      padding: '12px',
                      fontSize: '14px',
                      border: '1px solid #334155',
                      borderRadius: '8px',
                      backgroundColor: '#0f1419',
                      color: '#e2e8f0',
                      colorScheme: 'dark'
                    }}
                  />
                </div>
              </div>
              <div style={{ marginTop: '16px', display: 'flex', gap: '12px' }}>
                <button
                  type="button"
                  onClick={handlePushToDatabase}
                  disabled={pushDisabled}
                  style={{
                    flex: 1,
                    padding: '12px',
                    fontSize: '14px',
                    fontWeight: 600,
                    backgroundColor: pushDisabled ? '#1e293b' : '#1e40af',
                    color: pushDisabled ? '#64748b' : '#e0e7ff',
                    border: 'none',
                    borderRadius: '8px',
                    cursor: pushDisabled ? 'not-allowed' : 'pointer',
                    letterSpacing: '0.01em'
                  }}
                >
                  {pushingToDatabase ? 'Pushing...' : 'Push to Database'}
                </button>
                <button
                  type="button"
                  onClick={handleSaveToLibrary}
                  disabled={saveToLibraryDisabled}
                  style={{
                    flex: 1,
                    padding: '12px',
                    fontSize: '14px',
                    fontWeight: 600,
                    backgroundColor: saveToLibraryDisabled ? '#1e293b' : '#6366f1',
                    color: saveToLibraryDisabled ? '#64748b' : '#e0e7ff',
                    border: 'none',
                    borderRadius: '8px',
                    cursor: saveToLibraryDisabled ? 'not-allowed' : 'pointer',
                    letterSpacing: '0.01em'
                  }}
                >
                  {savingToLibrary ? 'Saving...' : 'Save to Library'}
                </button>
              </div>
              {(pushSuccess || librarySuccess) && (
                <p style={{
                  marginTop: '12px',
                  marginBottom: 0,
                  fontSize: '13px',
                  color: '#5eead4',
                  fontWeight: 600
                }}>
                  {pushSuccess && 'Program pushed successfully!'}
                  {librarySuccess && 'Program saved to library!'}
                </p>
              )}
              {(error || libraryError) && (
                <p style={{
                  marginTop: '12px',
                  marginBottom: 0,
                  fontSize: '13px',
                  color: '#fca5a5',
                  whiteSpace: 'pre-line'
                }}>
                  {error || libraryError}
                </p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Main Content */}
      <div style={{
        maxWidth: '1800px',
        margin: '0 auto',
        padding: '32px'
      }}>
        <ProgramBuilder
          onChange={setDays}
          onWeekCountChange={setWeekCount}
          onRepTargetsChange={setRepTargets}
          onWeekTotalsChange={setWeekTotals}
        />
        <div style={{ marginTop: '32px' }}>
          <ProgramPreview
            weeks={filteredWeeks}
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
    </div>
  )
}
