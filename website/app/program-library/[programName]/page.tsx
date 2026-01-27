'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import Link from 'next/link'
import ProgramBuilder from '@/app/components/ProgramBuilder'
import ProgramPreview from '@/app/components/ProgramPreview'
import {
  checkLibraryProgramExists,
  checkProgramExists,
  getLibraryProgramTemplate,
  getLibraryProgramWorkouts,
  insertManyLibraryWorkouts,
  insertManyWorkouts,
  replaceLibraryProgramWorkouts,
  upsertLibraryProgramTemplate,
  upsertProgramMetadata
} from '@/lib/supabase-queries'
import { applyProgramOverride, buildGeneratedProgramWeeks } from '@/lib/program-builder'
import { buildBuilderStateFromLibraryWorkouts } from '@/lib/program-library-helpers'
import { validateGeneratedProgramInputs } from '@/lib/program-validation'
import { createExercise } from '@/lib/program-builder-defaults'
import {
  ProgramBuilderDay,
  ProgramLibraryRecord,
  RepTargets,
  WeekTotalReps,
  WorkoutRecord
} from '@/types/workout'
import { parseCount, parseIntensityValues } from '@/lib/value-parse'

type ProgramLibraryEditorProps = {
  params: { programName: string }
}

const defaultRepTargets: RepTargets = {
  snatch: '',
  clean: '',
  jerk: '',
  squat: '',
  pull: ''
}

export default function ProgramLibraryEditorPage({ params }: ProgramLibraryEditorProps) {
  const decodedProgramName = decodeURIComponent(params.programName)
  const [days, setDays] = useState<ProgramBuilderDay[]>([])
  const [weekCount, setWeekCount] = useState(4)
  const [repTargets, setRepTargets] = useState<RepTargets>(defaultRepTargets)
  const [weekTotals, setWeekTotals] = useState<WeekTotalReps[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'success' | 'error'>('idle')
  const [saveMessage, setSaveMessage] = useState<string | null>(null)
  const [copyName, setCopyName] = useState('')
  const [copyStatus, setCopyStatus] = useState<'idle' | 'saving' | 'success' | 'error'>('idle')
  const [copyMessage, setCopyMessage] = useState<string | null>(null)
  const [assignAthlete, setAssignAthlete] = useState('')
  const [assignProgramName, setAssignProgramName] = useState('')
  const [assignStartDate, setAssignStartDate] = useState('')
  const [assignStatus, setAssignStatus] = useState<'idle' | 'assigning' | 'success' | 'error'>(
    'idle'
  )
  const [assignMessage, setAssignMessage] = useState<string | null>(null)
  const seedRef = useRef<string | null>(null)

  const normalizedProgramName = decodedProgramName.trim().toLowerCase()

  const generatedProgram = useMemo(
    () => buildGeneratedProgramWeeks(days, weekCount),
    [days, weekCount]
  )

  const handleDayLabelChange = (dayNumber: number, value: string) => {
    setDays((prev) =>
      prev.map((day) =>
        day.dayNumber === dayNumber
          ? { ...day, dayLabel: value }
          : day
      )
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

  useEffect(() => {
    let mounted = true

    const loadLibraryProgram = async () => {
      setLoading(true)
      setError(null)
      try {
        const [workouts, template] = await Promise.all([
          getLibraryProgramWorkouts(normalizedProgramName),
          getLibraryProgramTemplate(normalizedProgramName)
        ])

        if (!mounted) {
          return
        }

        const { days: initialDays, weekCount: initialWeekCount } =
          buildBuilderStateFromLibraryWorkouts(workouts)

        setDays(initialDays)
        setWeekCount(template?.week_count ?? initialWeekCount)
        setRepTargets(template?.rep_targets ?? defaultRepTargets)
        setWeekTotals(template?.week_totals ?? [])
        setCopyName('')
        seedRef.current = `${normalizedProgramName}-${Date.now()}`
      } catch (err) {
        if (!mounted) {
          return
        }
        const message = (err as Error)?.message || String(err)
        setError(message)
      } finally {
        if (mounted) {
          setLoading(false)
        }
      }
    }

    loadLibraryProgram()

    return () => {
      mounted = false
    }
  }, [normalizedProgramName])

  const buildLibraryRecords = (programName: string):
    Omit<ProgramLibraryRecord, 'id' | 'created_at' | 'updated_at'>[] => {
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
            program_name: programName,
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

  const buildWorkoutRecords = (athlete: string, program: string, start: string):
    Omit<WorkoutRecord, 'id' | 'created_at' | 'updated_at'>[] => {
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

  const handleSaveChanges = async () => {
    if (generatedProgram.length === 0) {
      setSaveStatus('error')
      setSaveMessage('No program data to save. Please add days and exercises first.')
      return
    }

    const validation = validateGeneratedProgramInputs(generatedProgram)
    if (!validation.isValid) {
      setSaveStatus('error')
      setSaveMessage(validation.message || 'Please complete all exercise inputs before saving.')
      return
    }

    setSaveStatus('saving')
    setSaveMessage(null)

    try {
      const records = buildLibraryRecords(normalizedProgramName)
      await replaceLibraryProgramWorkouts(normalizedProgramName, records)
      await upsertLibraryProgramTemplate({
        program_name: normalizedProgramName,
        rep_targets: repTargets,
        week_totals: weekTotals,
        week_count: weekCount
      })
      setSaveStatus('success')
      setSaveMessage('Library program updated successfully!')
    } catch (err) {
      const message = (err as Error)?.message || String(err)
      setSaveStatus('error')
      setSaveMessage(
        message.includes('SUPABASE')
          ? 'Supabase is not configured. Please add NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY to your .env.local file.'
          : 'Failed to update library program: ' + message
      )
    }
  }

  const handleSaveCopy = async () => {
    if (generatedProgram.length === 0) {
      setCopyStatus('error')
      setCopyMessage('No program data to save. Please add days and exercises first.')
      return
    }

    const validation = validateGeneratedProgramInputs(generatedProgram)
    if (!validation.isValid) {
      setCopyStatus('error')
      setCopyMessage(validation.message || 'Please complete all exercise inputs before saving.')
      return
    }

    const trimmedCopyName = copyName.trim()
    if (!trimmedCopyName) {
      setCopyStatus('error')
      setCopyMessage('Please enter a name for the copied program.')
      return
    }

    const normalizedCopyName = trimmedCopyName.toLowerCase()

    setCopyStatus('saving')
    setCopyMessage(null)

    try {
      const exists = await checkLibraryProgramExists(normalizedCopyName)
      if (exists) {
        setCopyStatus('error')
        setCopyMessage(`Program "${trimmedCopyName}" already exists in the library.`)
        return
      }

      const records = buildLibraryRecords(normalizedCopyName)
      await insertManyLibraryWorkouts(records)
      await upsertLibraryProgramTemplate({
        program_name: normalizedCopyName,
        rep_targets: repTargets,
        week_totals: weekTotals,
        week_count: weekCount
      })
      setCopyStatus('success')
      setCopyMessage('Library copy saved successfully!')
    } catch (err) {
      const message = (err as Error)?.message || String(err)
      setCopyStatus('error')
      setCopyMessage(
        message.includes('SUPABASE')
          ? 'Supabase is not configured. Please add NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY to your .env.local file.'
          : 'Failed to save copy: ' + message
      )
    }
  }

  const handleAssign = async () => {
    if (generatedProgram.length === 0) {
      setAssignStatus('error')
      setAssignMessage('No program data to assign. Please add days and exercises first.')
      return
    }

    const validation = validateGeneratedProgramInputs(generatedProgram)
    if (!validation.isValid) {
      setAssignStatus('error')
      setAssignMessage(validation.message || 'Please complete all exercise inputs before assigning.')
      return
    }

    if (!assignAthlete.trim() || !assignProgramName.trim() || !assignStartDate.trim()) {
      setAssignStatus('error')
      setAssignMessage('Please enter athlete name, program name, and start date.')
      return
    }

    const normalizedAthlete = assignAthlete.trim().toLowerCase()
    const normalizedProgram = assignProgramName.trim().toLowerCase()
    const start = assignStartDate.trim()

    setAssignStatus('assigning')
    setAssignMessage(null)

    try {
      const exists = await checkProgramExists(normalizedAthlete, normalizedProgram)
      if (exists) {
        setAssignStatus('error')
        setAssignMessage(
          `Program "${assignProgramName.trim()}" already exists for athlete "${assignAthlete.trim()}".`
        )
        return
      }

      const records = buildWorkoutRecords(normalizedAthlete, normalizedProgram, start)
      await insertManyWorkouts(records)
      await upsertProgramMetadata({
        athlete_name: normalizedAthlete,
        program_name: normalizedProgram,
        start_date: start,
        rep_targets: repTargets,
        week_totals: weekTotals,
        week_count: weekCount
      })
      setAssignStatus('success')
      setAssignMessage('Program assigned successfully!')
    } catch (err) {
      const message = (err as Error)?.message || String(err)
      setAssignStatus('error')
      setAssignMessage(
        message.includes('SUPABASE')
          ? 'Supabase is not configured. Please add NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY to your .env.local file.'
          : 'Failed to assign program: ' + message
      )
    }
  }

  return (
    <div className="page-container">
      <div className="page-header">
        <h1 style={{ margin: 0, color: '#111827' }}>
          Edit Library Program: {decodedProgramName}
        </h1>
        <div className="header-actions">
          <Link
            href="/program-library"
            style={{
              padding: '10px 20px',
              fontSize: '14px',
              fontWeight: 600,
              backgroundColor: '#6b7280',
              color: 'white',
              border: 'none',
              borderRadius: '6px',
              textDecoration: 'none'
            }}
          >
            ← Back to Library
          </Link>
        </div>
      </div>

      {loading && <p style={{ color: '#6b7280' }}>Loading program details...</p>}
      {error && (
        <p style={{ color: '#dc2626' }}>Failed to load program details: {error}</p>
      )}

      {!loading && !error && (
        <>
          <div style={{
            marginBottom: '24px',
            padding: '20px',
            backgroundColor: '#f9fafb',
            borderRadius: '8px',
            border: '1px solid #e5e7eb'
          }}>
            <h2 style={{ marginBottom: '12px', fontSize: '18px', color: '#111827' }}>
              Save updates to the library
            </h2>
            <p style={{ marginTop: 0, color: '#6b7280', fontSize: '14px' }}>
              This will overwrite the existing library program with your current edits.
            </p>
            <button
              type="button"
              onClick={handleSaveChanges}
              disabled={saveStatus === 'saving'}
              style={{
                padding: '10px 18px',
                fontSize: '14px',
                fontWeight: 600,
                backgroundColor: saveStatus === 'saving' ? '#93c5fd' : '#2563eb',
                color: 'white',
                border: 'none',
                borderRadius: '6px',
                cursor: saveStatus === 'saving' ? 'not-allowed' : 'pointer'
              }}
            >
              {saveStatus === 'saving' ? 'Saving...' : 'Save Changes'}
            </button>
            {saveMessage && (
              <p style={{
                marginTop: '10px',
                color: saveStatus === 'error' ? '#dc2626' : '#16a34a',
                fontWeight: 600
              }}>
                {saveMessage}
              </p>
            )}
          </div>

          <div style={{
            marginBottom: '24px',
            padding: '20px',
            backgroundColor: '#ffffff',
            borderRadius: '8px',
            border: '1px solid #e5e7eb'
          }}>
            <h2 style={{ marginBottom: '12px', fontSize: '18px', color: '#111827' }}>
              Save as a new library copy
            </h2>
            <div style={{ display: 'grid', gap: '12px' }}>
              <div>
                <label style={{ display: 'block', marginBottom: '5px', fontWeight: 600, color: '#374151' }}>
                  New Program Name <span style={{ color: '#dc2626' }}>*</span>
                </label>
                <input
                  type="text"
                  value={copyName}
                  onChange={(event) => setCopyName(event.target.value)}
                  placeholder="Enter new library program name"
                  style={{
                    width: '100%',
                    padding: '10px',
                    fontSize: '14px',
                    border: '1px solid #d1d5db',
                    borderRadius: '4px'
                  }}
                />
              </div>
              <button
                type="button"
                onClick={handleSaveCopy}
                disabled={copyStatus === 'saving'}
                style={{
                  padding: '10px 18px',
                  fontSize: '14px',
                  fontWeight: 600,
                  backgroundColor: copyStatus === 'saving' ? '#fcd34d' : '#f59e0b',
                  color: 'white',
                  border: 'none',
                  borderRadius: '6px',
                  cursor: copyStatus === 'saving' ? 'not-allowed' : 'pointer'
                }}
              >
                {copyStatus === 'saving' ? 'Saving...' : 'Save Copy'}
              </button>
              {copyMessage && (
                <p style={{
                  marginTop: '6px',
                  color: copyStatus === 'error' ? '#dc2626' : '#16a34a',
                  fontWeight: 600
                }}>
                  {copyMessage}
                </p>
              )}
            </div>
          </div>

          <div style={{
            marginBottom: '24px',
            padding: '20px',
            backgroundColor: '#f9fafb',
            borderRadius: '8px',
            border: '1px solid #e5e7eb'
          }}>
            <h2 style={{ marginBottom: '12px', fontSize: '18px', color: '#111827' }}>
              Assign edited program to an athlete
            </h2>
            <div style={{ display: 'grid', gap: '12px' }}>
              <div>
                <label style={{ display: 'block', marginBottom: '5px', fontWeight: 600, color: '#374151' }}>
                  Athlete Name <span style={{ color: '#dc2626' }}>*</span>
                </label>
                <input
                  type="text"
                  value={assignAthlete}
                  onChange={(event) => setAssignAthlete(event.target.value)}
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
                  Program Name <span style={{ color: '#dc2626' }}>*</span>
                </label>
                <input
                  type="text"
                  value={assignProgramName}
                  onChange={(event) => setAssignProgramName(event.target.value)}
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
                  value={assignStartDate}
                  onChange={(event) => setAssignStartDate(event.target.value)}
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
              onClick={handleAssign}
              disabled={assignStatus === 'assigning'}
              style={{
                marginTop: '16px',
                padding: '10px 18px',
                fontSize: '14px',
                fontWeight: 600,
                backgroundColor: assignStatus === 'assigning' ? '#a7f3d0' : '#059669',
                color: 'white',
                border: 'none',
                borderRadius: '6px',
                cursor: assignStatus === 'assigning' ? 'not-allowed' : 'pointer'
              }}
            >
              {assignStatus === 'assigning' ? 'Assigning...' : 'Assign Program'}
            </button>
            {assignMessage && (
              <p style={{
                marginTop: '10px',
                color: assignStatus === 'error' ? '#dc2626' : '#16a34a',
                fontWeight: 600
              }}>
                {assignMessage}
              </p>
            )}
          </div>

          <ProgramBuilder
            onChange={setDays}
            onWeekCountChange={setWeekCount}
            onRepTargetsChange={setRepTargets}
            onWeekTotalsChange={setWeekTotals}
            initialDays={days}
            initialWeekCount={weekCount}
            initialRepTargets={repTargets}
            initialWeekTotals={weekTotals}
            initialSeed={seedRef.current}
          />

          <div style={{ marginBottom: '24px' }}>
          <ProgramPreview
            weeks={generatedProgram}
            repTargets={repTargets}
            weekTotals={weekTotals}
            onDayLabelChange={handleDayLabelChange}
            onAddExercise={handleAddExercise}
            onOverrideChange={(dayNumber, exerciseId, field, value, weekNumber) =>
              setDays((prev) =>
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
