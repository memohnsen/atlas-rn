'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import Link from 'next/link'
import ProgramBuilder from '../components/ProgramBuilder'
import ProgramPreview from '../components/ProgramPreview'
import {
  ProgramBuilderDay,
  RepTargets,
  WeekTotalReps,
  WorkoutRecord
} from '@/types/workout'
import { applyProgramOverride, buildGeneratedProgramWeeks } from '@/lib/program-builder'
import { validateGeneratedProgramInputs } from '@/lib/program-validation'
import { formatDate } from '@/lib/date-format'
import { buildBuilderStateFromWorkouts } from '@/lib/program-editor-helpers'
import { parseCount, parseIntensityValues } from '@/lib/value-parse'
import { createExercise } from '@/lib/program-builder-defaults'
import {
  deleteProgram,
  getAthletes,
  getProgramsForAthlete,
  getWorkoutsForAthleteProgram,
  insertManyWorkouts
} from '@/lib/supabase-queries'

type ProgramOption = {
  program_name: string
  start_date: string
}

export default function ProgramEditorPage() {
  const [athletes, setAthletes] = useState<string[]>([])
  const [programs, setPrograms] = useState<ProgramOption[]>([])
  const [selectedAthlete, setSelectedAthlete] = useState('')
  const [selectedProgram, setSelectedProgram] = useState<ProgramOption | null>(null)
  const [seedDays, setSeedDays] = useState<ProgramBuilderDay[]>([])
  const [builderDays, setBuilderDays] = useState<ProgramBuilderDay[]>([])
  const [builderWeekCount, setBuilderWeekCount] = useState(4)
  const [repTargets, setRepTargets] = useState<RepTargets>({
    snatch: '',
    clean: '',
    jerk: '',
    squat: '',
    pull: ''
  })
  const [weekTotals, setWeekTotals] = useState<WeekTotalReps[]>([])
  const [builderSeed, setBuilderSeed] = useState<string | null>(null)
  const [loadingPrograms, setLoadingPrograms] = useState(false)
  const [loadingWorkouts, setLoadingWorkouts] = useState(false)
  const [pushingToDatabase, setPushingToDatabase] = useState(false)
  const [pushSuccess, setPushSuccess] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const successTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const generatedProgram = useMemo(
    () => buildGeneratedProgramWeeks(builderDays, builderWeekCount),
    [builderDays, builderWeekCount]
  )

  const handleDayLabelChange = (dayNumber: number, value: string) => {
    setBuilderDays((prev) =>
      prev.map((day) =>
        day.dayNumber === dayNumber
          ? { ...day, dayLabel: value }
          : day
      )
    )
  }

  const handleAddExercise = (dayNumber: number) => {
    setBuilderDays((prev) =>
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

  useEffect(() => {
    const loadAthletes = async () => {
      setError(null)
      try {
        const result = await getAthletes()
        setAthletes(result)
      } catch (err) {
        console.error('Error loading athletes:', err)
        setError('Failed to load athletes.')
      }
    }

    loadAthletes()
  }, [])

  useEffect(() => {
    if (!selectedAthlete) {
      setPrograms([])
      setSelectedProgram(null)
      return
    }

    const loadPrograms = async () => {
      setLoadingPrograms(true)
      setError(null)
      try {
        const result = await getProgramsForAthlete(selectedAthlete)
        setPrograms(result)
      } catch (err) {
        console.error('Error loading programs:', err)
        setError('Failed to load programs.')
      } finally {
        setLoadingPrograms(false)
      }
    }

    loadPrograms()
  }, [selectedAthlete])

  useEffect(() => {
    if (!selectedAthlete || !selectedProgram) {
      setSeedDays([])
      setBuilderDays([])
      setBuilderWeekCount(4)
      setBuilderSeed(null)
      return
    }

    const loadWorkouts = async () => {
      setLoadingWorkouts(true)
      setError(null)
      setPushSuccess(false)

      try {
        const data = await getWorkoutsForAthleteProgram(
          selectedAthlete,
          selectedProgram.program_name,
          selectedProgram.start_date
        )
        const { days, weekCount } = buildBuilderStateFromWorkouts(data)
        setSeedDays(days)
        setBuilderDays(days)
        setBuilderWeekCount(weekCount)
        setBuilderSeed(`${selectedAthlete}-${selectedProgram.program_name}-${selectedProgram.start_date}`)
      } catch (err) {
        console.error('Error loading workouts:', err)
        setError('Failed to load workouts.')
        setSeedDays([])
        setBuilderDays([])
      } finally {
        setLoadingWorkouts(false)
      }
    }

    loadWorkouts()
  }, [selectedAthlete, selectedProgram])

  useEffect(() => {
    return () => {
      if (successTimeoutRef.current) {
        clearTimeout(successTimeoutRef.current)
      }
    }
  }, [])

  const buildWorkoutRecords = (): Omit<WorkoutRecord, 'id' | 'created_at' | 'updated_at'>[] => {
    if (!selectedProgram) {
      return []
    }
    const athlete = selectedAthlete.trim().toLowerCase()
    const program = selectedProgram.program_name.trim().toLowerCase()
    const start = selectedProgram.start_date

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

  const handlePushToDatabase = async () => {
    if (!selectedProgram || !selectedAthlete) {
      setError('Please select an athlete and program first.')
      return
    }

    if (generatedProgram.length === 0) {
      setError('No program data to push. Please add days and exercises first.')
      return
    }

    setPushingToDatabase(true)
    setError(null)
    setPushSuccess(false)

    try {
      const validation = validateGeneratedProgramInputs(generatedProgram)
      if (!validation.isValid) {
        setError(validation.message || 'Please complete all exercise inputs before pushing.')
        setPushingToDatabase(false)
        return
      }
      await deleteProgram(
        selectedAthlete.trim().toLowerCase(),
        selectedProgram.program_name.trim().toLowerCase(),
        selectedProgram.start_date
      )

      const records = buildWorkoutRecords()
      await insertManyWorkouts(records)
      setPushSuccess(true)
      if (successTimeoutRef.current) {
        clearTimeout(successTimeoutRef.current)
      }
      successTimeoutRef.current = setTimeout(() => setPushSuccess(false), 3000)
    } catch (err) {
      const errorMessage = (err as Error)?.message || String(err)
      if (errorMessage.includes('SUPABASE') || errorMessage.includes('not configured')) {
        setError(
          'Supabase is not configured. Please add NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY to your .env.local file.'
        )
      } else {
        setError('Failed to push updates: ' + errorMessage)
      }
    } finally {
      setPushingToDatabase(false)
    }
  }

  return (
    <div className="page-container">
      <div className="page-header">
        <h1 style={{ margin: 0, color: '#333' }}>Edit Athlete Program</h1>
        <div className="header-actions">
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
        Select an athlete and program, update the plan, and push changes back to Supabase.
      </p>

      <div
        style={{
          marginBottom: '24px',
          padding: '20px',
          backgroundColor: '#f8f9fa',
          borderRadius: '8px',
          border: '1px solid #dee2e6'
        }}
      >
        <h2 style={{ marginBottom: '15px', fontSize: '18px', color: '#333' }}>
          Select Program
        </h2>
        <div style={{ display: 'grid', gap: '14px', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))' }}>
          <div>
            <label style={{ display: 'block', marginBottom: '5px', fontWeight: '600', color: '#555' }}>
              Athlete Name <span style={{ color: '#d00' }}>*</span>:
            </label>
            <select
              value={selectedAthlete}
              onChange={(event) => setSelectedAthlete(event.target.value)}
              style={{
                width: '100%',
                padding: '10px',
                fontSize: '14px',
                border: '1px solid #ddd',
                borderRadius: '4px',
                boxSizing: 'border-box'
              }}
            >
              <option value="">Select athlete</option>
              {athletes.map((athlete) => (
                <option key={athlete} value={athlete}>
                  {athlete}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label style={{ display: 'block', marginBottom: '5px', fontWeight: '600', color: '#555' }}>
              Program <span style={{ color: '#d00' }}>*</span>:
            </label>
            <select
              value={selectedProgram ? `${selectedProgram.program_name}-${selectedProgram.start_date}` : ''}
              onChange={(event) => {
                const next = programs.find(
                  (program) =>
                    `${program.program_name}-${program.start_date}` === event.target.value
                )
                setSelectedProgram(next ?? null)
              }}
              disabled={!selectedAthlete || loadingPrograms}
              style={{
                width: '100%',
                padding: '10px',
                fontSize: '14px',
                border: '1px solid #ddd',
                borderRadius: '4px',
                backgroundColor: !selectedAthlete ? '#f3f4f6' : 'white',
                boxSizing: 'border-box'
              }}
            >
              <option value="">
                {loadingPrograms ? 'Loading programs...' : 'Select program'}
              </option>
              {programs.map((program) => (
                <option
                  key={`${program.program_name}-${program.start_date}`}
                  value={`${program.program_name}-${program.start_date}`}
                >
                  {program.program_name} · {formatDate(program.start_date)}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label style={{ display: 'block', marginBottom: '5px', fontWeight: '600', color: '#555' }}>
              Start Date:
            </label>
            <input
              type="text"
              value={selectedProgram ? formatDate(selectedProgram.start_date) : ''}
              readOnly
              style={{
                width: '100%',
                padding: '10px',
                fontSize: '14px',
                border: '1px solid #ddd',
                borderRadius: '4px',
                backgroundColor: '#f3f4f6',
                boxSizing: 'border-box'
              }}
            />
          </div>
        </div>
        <div style={{ marginTop: '14px', fontSize: '13px', color: '#6b7280' }}>
          {loadingWorkouts
            ? 'Loading program data...'
            : selectedProgram
              ? 'Use the builder below to update the plan.'
              : 'Pick an athlete and program to load workouts.'}
        </div>
        <button
          type="button"
          onClick={handlePushToDatabase}
          disabled={!selectedProgram || pushingToDatabase}
          style={{
            marginTop: '16px',
            padding: '10px 20px',
            fontSize: '14px',
            fontWeight: '600',
            backgroundColor: pushingToDatabase || !selectedProgram ? '#93c5fd' : '#2563eb',
            color: 'white',
            border: 'none',
            borderRadius: '6px',
            cursor: pushingToDatabase || !selectedProgram ? 'not-allowed' : 'pointer'
          }}
        >
          {pushingToDatabase ? 'Pushing...' : 'Push Updates to Supabase'}
        </button>
        {pushSuccess && (
          <p style={{ marginTop: '10px', color: '#16a34a', fontWeight: 600 }}>
            Updates pushed successfully!
          </p>
        )}
        {error && (
          <p style={{ marginTop: '10px', color: '#dc2626', whiteSpace: 'pre-line' }}>
            {error}
          </p>
        )}
      </div>

      {selectedProgram && (
        <>
          <ProgramBuilder
            onChange={setBuilderDays}
            onWeekCountChange={setBuilderWeekCount}
            onRepTargetsChange={setRepTargets}
            onWeekTotalsChange={setWeekTotals}
            initialDays={seedDays}
            initialWeekCount={builderWeekCount}
            initialSeed={builderSeed}
          />
          <div style={{ marginBottom: '24px' }}>
          <ProgramPreview
            weeks={generatedProgram}
            repTargets={repTargets}
            weekTotals={weekTotals}
            onDayLabelChange={handleDayLabelChange}
            onAddExercise={handleAddExercise}
            onOverrideChange={(dayNumber, exerciseId, field, value, weekNumber) =>
              setBuilderDays((prev) =>
                applyProgramOverride(prev, dayNumber, exerciseId, field, value, weekNumber)
              )
              }
            />
          </div>
        </>
      )}
    </div>
  )
}
