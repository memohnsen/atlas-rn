'use client'

import { useEffect, useRef, useState } from 'react'
import { useConvex } from 'convex/react'
import { api } from '@/convex/_generated/api'
import { GeneratedProgramWeek, ProgramBuilderExercise, RepTargets, WeekTotalReps } from '@/types/workout'

type ExerciseLibraryEntry = {
  name: string
  primary?: string
  secondary?: string
  link?: string
}

type ProgramPreviewProps = {
  weeks: GeneratedProgramWeek[]
  selectedDayNumbers?: number[]
  availableDays?: number[]
  onToggleDay?: (dayNumber: number) => void
  onDayLabelChange?: (dayNumber: number, value: string) => void
  onAddExercise?: (dayNumber: number) => void
  onOverrideChange?: (
    dayNumber: number,
    exerciseId: string,
    field: keyof ProgramBuilderExercise,
    value: string,
    weekNumber: number
  ) => void
  onDeleteExercise?: (dayNumber: number, exerciseId: string) => void
  repTargets?: RepTargets
  weekTotals?: WeekTotalReps[]
}

export default function ProgramPreview({
  weeks,
  selectedDayNumbers,
  availableDays,
  onToggleDay,
  onDayLabelChange,
  onAddExercise,
  onOverrideChange,
  onDeleteExercise,
  repTargets,
  weekTotals
}: ProgramPreviewProps) {
  const convex = useConvex()
  const [editingKey, setEditingKey] = useState<string | null>(null)
  const [editingValue, setEditingValue] = useState('')
  const [exerciseSuggestions, setExerciseSuggestions] = useState<ExerciseLibraryEntry[]>([])
  const [isSearchingExercises, setIsSearchingExercises] = useState(false)
  const searchTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const latestSearchRef = useRef(0)
  const suppressBlurCommitRef = useRef(false)
  const dayOptions = availableDays ?? Array.from({ length: 7 }, (_, index) => index + 1)
  const dayLabelOptions = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']
  const categoryOptions = [
    { value: '', label: 'Select' },
    { value: 'snatch', label: 'Snatch' },
    { value: 'clean', label: 'Clean' },
    { value: 'clean & jerk', label: 'Clean & Jerk' },
    { value: 'jerk', label: 'Jerk' },
    { value: 'squat', label: 'Squat' },
    { value: 'pull', label: 'Pull' },
    { value: 'accessory', label: 'Accessory' },
    { value: 'primer', label: 'Primer' }
  ]
  const supersetGroups = ['', 'A', 'B', 'C', 'D', 'E']
  const supersetPositions = ['', '1', '2', '3', '4']

  const formatIntensity = (value: string) => {
    const trimmed = value.trim()
    if (!trimmed) return ''
    if (trimmed.includes('%')) return trimmed
    const isNumeric = /^\d+(\.\d+)?(-\d+(\.\d+)?)?$/.test(trimmed)
    return isNumeric ? `${trimmed}%` : trimmed
  }

  const getSupersetLabel = (exercise: ProgramBuilderExercise) => {
    const group = exercise.supersetGroup?.trim()
    if (!group) {
      return ''
    }
    const order = exercise.supersetOrder?.trim()
    return `${group}${order || ''}`
  }

  const parseCount = (value: string) => {
    const match = value.match(/(\d+(\.\d+)?)/)
    return match ? Number.parseFloat(match[1]) : null
  }

  const formatNumber = (value: number) => {
    const fixed = value.toFixed(1)
    return fixed.replace(/\.0+$/, '').replace(/(\.\d*?)0+$/, '$1')
  }

  const getWeekTotal = (weekNumber: number) =>
    weekTotals?.find((item) => item.weekNumber === weekNumber)?.total || ''

  const getListValues = (value: string) => {
    const trimmed = value.trim()
    if (!trimmed) {
      return []
    }
    return trimmed.split(',').map((entry) => entry.trim())
  }

  const expandListValues = (value: string, count: number) => {
    const values = getListValues(value)
    if (values.length === 0) {
      return Array.from({ length: count }, () => '')
    }
    if (values.length >= count) {
      return values.slice(0, count)
    }
    const last = values[values.length - 1] || ''
    return [...values, ...Array.from({ length: count - values.length }, () => last)]
  }

  const joinListValues = (values: string[]) => {
    const trimmed = [...values]
    while (trimmed.length > 0 && trimmed[trimmed.length - 1].trim() === '') {
      trimmed.pop()
    }
    return trimmed.join(', ')
  }

  const getExerciseTotalReps = (reps: string, setCount: number) => {
    const values = expandListValues(reps, setCount)
    const numericValues = values.map((entry) => parseCount(entry))
    const hasAny = numericValues.some((value) => value !== null)
    if (!hasAny) {
      return null
    }
    return numericValues.reduce<number>((sum, value) => sum + (value ?? 0), 0)
  }

  const getExerciseAverageIntensity = (intensity: string, setCount: number) => {
    const values = expandListValues(intensity, setCount)
    const numericValues = values.map((entry) => parseCount(entry)).filter((value) => value !== null)
    if (numericValues.length === 0) {
      return null
    }
    const sum = numericValues.reduce((total, value) => total + (value ?? 0), 0)
    return sum / numericValues.length
  }

  const getSetCount = (sets: string, intensity: string, reps: string) => {
    const setsValue = parseCount(sets)
    const base = setsValue && setsValue > 0 ? Math.round(setsValue) : 1
    const intensityCount = getListValues(intensity).length
    const repsCount = getListValues(reps).length
    return Math.max(1, base, intensityCount, repsCount)
  }

  const updateListValue = (
    current: string,
    index: number,
    nextValue: string,
    count: number
  ) => {
    const values = expandListValues(current, count)
    values[index] = nextValue
    return joinListValues(values)
  }

  const trimListValues = (value: string, count: number) =>
    joinListValues(expandListValues(value, count).slice(0, count))

  const handleAddSet = (
    weekNumber: number,
    dayNumber: number,
    exerciseId: string,
    currentSets: string,
    currentIntensity: string,
    currentReps: string
  ) => {
    if (!onOverrideChange) {
      return
    }
    const nextCount = getSetCount(currentSets, currentIntensity, currentReps) + 1
    onOverrideChange(dayNumber, exerciseId, 'sets', String(nextCount), weekNumber)
  }

  const handleRemoveSet = (
    weekNumber: number,
    dayNumber: number,
    exerciseId: string,
    currentSets: string,
    currentIntensity: string,
    currentReps: string
  ) => {
    if (!onOverrideChange) {
      return
    }
    const currentCount = getSetCount(currentSets, currentIntensity, currentReps)
    if (currentCount <= 1) {
      return
    }
    const nextCount = currentCount - 1
    onOverrideChange(dayNumber, exerciseId, 'sets', String(nextCount), weekNumber)
    onOverrideChange(
      dayNumber,
      exerciseId,
      'intensity',
      trimListValues(currentIntensity, nextCount),
      weekNumber
    )
    onOverrideChange(
      dayNumber,
      exerciseId,
      'reps',
      trimListValues(currentReps, nextCount),
      weekNumber
    )
  }

  const getEditKey = (
    weekNumber: number,
    exerciseId: string,
    field: keyof ProgramBuilderExercise
  ) => `${weekNumber}-${exerciseId}-${field}`

  const startEdit = (
    weekNumber: number,
    exerciseId: string,
    field: keyof ProgramBuilderExercise,
    currentValue: string
  ) => {
    setEditingKey(getEditKey(weekNumber, exerciseId, field))
    setEditingValue(currentValue)
  }

  const commitExerciseName = (weekNumber: number, dayNumber: number, exerciseId: string, value: string) => {
    if (!onOverrideChange) {
      setEditingKey(null)
      return
    }

    weeks
      .filter((week) => week.weekNumber >= weekNumber)
      .forEach((week) => {
        onOverrideChange(dayNumber, exerciseId, 'name', value, week.weekNumber)
      })
    setEditingKey(null)
  }

  const commitEdit = (
    weekNumber: number,
    dayNumber: number,
    exerciseId: string,
    field: keyof ProgramBuilderExercise
  ) => {
    if (!onOverrideChange) {
      setEditingKey(null)
      return
    }

    const nextValue = field === 'intensity' ? formatIntensity(editingValue) : editingValue
    if (field === 'name') {
      commitExerciseName(weekNumber, dayNumber, exerciseId, nextValue)
      return
    }
    onOverrideChange(dayNumber, exerciseId, field, nextValue, weekNumber)
    setEditingKey(null)
  }

  useEffect(() => {
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current)
    }

    if (!editingKey?.endsWith('-name')) {
      setExerciseSuggestions([])
      setIsSearchingExercises(false)
      return
    }

    const trimmed = editingValue.trim()
    if (trimmed.length < 3) {
      setExerciseSuggestions([])
      setIsSearchingExercises(false)
      return
    }

    setIsSearchingExercises(true)
    const searchId = latestSearchRef.current + 1
    latestSearchRef.current = searchId
    searchTimeoutRef.current = setTimeout(async () => {
      try {
        const results = await convex.query(api.exerciseLibrary.searchExercises, { query: trimmed })
        if (latestSearchRef.current === searchId) {
          setExerciseSuggestions(results.map(r => ({
            name: r.name,
            primary: r.primary,
            secondary: r.secondary,
            link: r.link
          })))
        }
      } catch (error) {
        console.error('Error searching exercise library:', error)
        if (latestSearchRef.current === searchId) {
          setExerciseSuggestions([])
        }
      } finally {
        if (latestSearchRef.current === searchId) {
          setIsSearchingExercises(false)
        }
      }
    }, 300)

    return () => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current)
      }
    }
  }, [editingKey, editingValue])

  const applyFieldAcrossWeeks = (
    weekNumber: number,
    dayNumber: number,
    exerciseId: string,
    field: keyof ProgramBuilderExercise,
    value: string
  ) => {
    if (!onOverrideChange) {
      return
    }
    weeks
      .filter((week) => week.weekNumber >= weekNumber)
      .forEach((week) => {
        onOverrideChange(dayNumber, exerciseId, field, value, week.weekNumber)
      })
  }

  if (weeks.length === 0) {
    return (
      <div>
        {onToggleDay && (
          <div
            style={{
              marginBottom: '16px',
              padding: '14px 16px',
              borderRadius: '10px',
              border: '1px solid #e2e8f0',
              backgroundColor: '#fff'
            }}
          >
            <p style={{ marginBottom: '10px', fontWeight: '600', color: '#555' }}>
              Select training days
            </p>
            <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
              {dayOptions.map((dayNumber) => {
                const checked = selectedDayNumbers?.includes(dayNumber) ?? false
                return (
                  <label
                    key={dayNumber}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px',
                      padding: '6px 10px',
                      borderRadius: '6px',
                      border: checked ? '1px solid #2563eb' : '1px solid #d1d5db',
                      backgroundColor: checked ? '#eff6ff' : '#fff',
                      cursor: 'pointer',
                      fontSize: '14px'
                    }}
                  >
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={() => onToggleDay(dayNumber)}
                      style={{ accentColor: '#2563eb' }}
                    />
                    Day {dayNumber}
                  </label>
                )
              })}
            </div>
          </div>
        )}
        <div
          style={{
            padding: '20px',
            borderRadius: '8px',
            border: '1px dashed #cbd5f5',
            backgroundColor: '#f8fafc',
            color: '#64748b',
            fontSize: '14px'
          }}
        >
          Select training days and add exercises to preview the generated 4-week program.
        </div>
      </div>
    )
  }

  return (
    <div>
      <h3 style={{ marginBottom: '12px', fontSize: '16px', color: '#1f2937' }}>
        4-Week Program Preview
      </h3>
      {onToggleDay && (
        <div
          style={{
            marginBottom: '16px',
            padding: '14px 16px',
            borderRadius: '10px',
            border: '1px solid #e2e8f0',
            backgroundColor: '#fff'
          }}
        >
          <p style={{ marginBottom: '10px', fontWeight: '600', color: '#555' }}>
            Select training days
          </p>
          <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
            {dayOptions.map((dayNumber) => {
              const checked = selectedDayNumbers?.includes(dayNumber) ?? false
              return (
                <label
                  key={dayNumber}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    padding: '6px 10px',
                    borderRadius: '6px',
                    border: checked ? '1px solid #2563eb' : '1px solid #d1d5db',
                    backgroundColor: checked ? '#eff6ff' : '#fff',
                    cursor: 'pointer',
                    fontSize: '14px'
                  }}
                >
                  <input
                    type="checkbox"
                    checked={checked}
                    onChange={() => onToggleDay(dayNumber)}
                    style={{ accentColor: '#2563eb' }}
                  />
                  Day {dayNumber}
                </label>
              )
            })}
          </div>
        </div>
      )}
      {weeks.map((week) => (
        <div
          key={week.weekNumber}
          style={{
            marginBottom: '18px',
            padding: '16px',
            borderRadius: '10px',
            border: '1px solid #e2e8f0',
            backgroundColor: '#fff'
          }}
        >
          <h4 style={{ marginTop: 0, marginBottom: '12px', color: '#334155' }}>
            Week {week.weekNumber}
          </h4>
          {week.days.map((day) => (
            <div key={day.dayNumber} style={{ marginBottom: '16px' }}>
              <div
                style={{
                  margin: '0 0 8px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px',
                  flexWrap: 'wrap'
                }}
              >
                <p style={{ margin: 0, fontWeight: '600', color: '#475569' }}>
                  Day {day.dayNumber}
                </p>
                <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', color: '#64748b' }}>
                  Day of week
                  <select
                    value={day.dayLabel ?? ''}
                    onChange={(event) => onDayLabelChange?.(day.dayNumber, event.target.value)}
                    disabled={!onDayLabelChange}
                    style={{
                      padding: '6px',
                      borderRadius: '6px',
                      border: '1px solid #d1d5db',
                      fontSize: '13px',
                      backgroundColor: onDayLabelChange ? '#fff' : '#f8fafc'
                    }}
                  >
                    <option value="">Unassigned</option>
                    {dayLabelOptions.map((option) => (
                      <option key={option} value={option}>
                        {option}
                      </option>
                    ))}
                  </select>
                </label>
                {onAddExercise && (
                  <button
                    type="button"
                    onClick={() => onAddExercise(day.dayNumber)}
                    style={{
                      padding: '6px 10px',
                      borderRadius: '6px',
                      border: '1px solid #e2e8f0',
                      backgroundColor: '#f8fafc',
                      color: '#475569',
                      cursor: 'pointer',
                      fontSize: '12px'
                    }}
                  >
                    + Add exercise
                  </button>
                )}
              </div>
              <div className="table-scroll">
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '14px' }}>
                  <thead>
                    <tr style={{ backgroundColor: '#f1f5f9', textAlign: 'left' }}>
                      <th style={{ padding: '8px', border: '1px solid #e2e8f0', width: '260px' }}>Exercise</th>
                      <th style={{ padding: '8px', border: '1px solid #e2e8f0' }}>Set</th>
                      <th style={{ padding: '8px', border: '1px solid #e2e8f0' }}>Intensity</th>
                      <th style={{ padding: '8px', border: '1px solid #e2e8f0' }}>Reps</th>
                      <th style={{ padding: '8px', border: '1px solid #e2e8f0' }}>Data</th>
                    </tr>
                  </thead>
                  <tbody>
                    {day.exercises.flatMap((exercise, index) => {
                      const setCount = getSetCount(
                        exercise.sets || '',
                        exercise.intensity || '',
                        exercise.reps || ''
                      )
                      const intensityValues = expandListValues(exercise.intensity || '', setCount)
                      const repsValues = expandListValues(exercise.reps || '', setCount)
                      const total = getExerciseTotalReps(exercise.reps || '', setCount)
                      const averageIntensity = getExerciseAverageIntensity(
                        exercise.intensity || '',
                        setCount
                      )
                      const tonnage =
                        total !== null && averageIntensity !== null
                          ? total * (averageIntensity / 100)
                          : null
                      return Array.from({ length: setCount }, (_, setIndex) => {
                        const isFirstRow = setIndex === 0

                        return (
                          <tr key={`${exercise.id}-${index}-set-${setIndex}`}>
                            {isFirstRow && (
                              <td
                                rowSpan={setCount}
                                style={{
                                  padding: '8px',
                                  border: '1px solid #e2e8f0',
                                  verticalAlign: 'top',
                                  width: '260px',
                                  maxWidth: '260px'
                                }}
                              >
                                {onOverrideChange ? (
                                  editingKey === getEditKey(week.weekNumber, exercise.id, 'name') ? (
                                    <>
                                      <input
                                        type="text"
                                        value={editingValue}
                                        onChange={(event) => setEditingValue(event.target.value)}
                                        onBlur={() => {
                                          if (suppressBlurCommitRef.current) {
                                            suppressBlurCommitRef.current = false
                                            return
                                          }
                                          commitEdit(week.weekNumber, day.dayNumber, exercise.id, 'name')
                                        }}
                                        onKeyDown={(event) => {
                                          if (event.key === 'Enter') {
                                            event.currentTarget.blur()
                                          }
                                          if (event.key === 'Escape') {
                                            setEditingKey(null)
                                          }
                                        }}
                                        style={{
                                          width: '100%',
                                          padding: '6px',
                                          borderRadius: '6px',
                                          border: '1px solid #d1d5db',
                                          fontSize: '13px',
                                          marginBottom: '6px'
                                        }}
                                        autoFocus
                                      />
                                      {(editingValue.trim().length >= 3 || isSearchingExercises) && (
                                        <div
                                          style={{
                                            border: '1px solid #e2e8f0',
                                            borderRadius: '8px',
                                            backgroundColor: '#fff',
                                            boxShadow: '0 8px 16px rgba(15, 23, 42, 0.08)',
                                            maxHeight: '200px',
                                            overflowY: 'auto'
                                          }}
                                        >
                                          {isSearchingExercises && (
                                            <div
                                              style={{
                                                padding: '8px 10px',
                                                fontSize: '12px',
                                                color: '#64748b'
                                              }}
                                            >
                                              Searching exercise library…
                                            </div>
                                          )}
                                          {!isSearchingExercises && exerciseSuggestions.length === 0 && (
                                            <div
                                              style={{
                                                padding: '8px 10px',
                                                fontSize: '12px',
                                                color: '#64748b'
                                              }}
                                            >
                                              No matches found.
                                            </div>
                                          )}
                                          {exerciseSuggestions.map((exerciseOption) => (
                                            <button
                                              key={exerciseOption.id}
                                              type="button"
                                              onMouseDown={(event) => {
                                                event.preventDefault()
                                                suppressBlurCommitRef.current = true
                                                const nextValue = exerciseOption.name ?? ''
                                                setEditingValue(nextValue)
                                                setExerciseSuggestions([])
                                                setIsSearchingExercises(false)
                                                commitExerciseName(week.weekNumber, day.dayNumber, exercise.id, nextValue)
                                              }}
                                              style={{
                                                display: 'flex',
                                                flexDirection: 'column',
                                                alignItems: 'flex-start',
                                                gap: '2px',
                                                width: '100%',
                                                padding: '8px 10px',
                                                border: 'none',
                                                backgroundColor: 'transparent',
                                                textAlign: 'left',
                                                cursor: 'pointer'
                                              }}
                                            >
                                              <span style={{ fontSize: '13px', color: '#0f172a' }}>
                                                {exerciseOption.name ?? 'Unnamed exercise'}
                                              </span>
                                              {(exerciseOption.primary || exerciseOption.secondary) && (
                                                <span style={{ fontSize: '11px', color: '#64748b' }}>
                                                  {[exerciseOption.primary, exerciseOption.secondary]
                                                    .filter(Boolean)
                                                    .join(' • ')}
                                                </span>
                                              )}
                                            </button>
                                          ))}
                                        </div>
                                      )}
                                    </>
                                  ) : (
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                      <span>{exercise.name || `Exercise ${index + 1}`}</span>
                                      {getSupersetLabel(exercise) && (
                                        <span
                                          style={{
                                            padding: '2px 6px',
                                            borderRadius: '999px',
                                            backgroundColor: '#e0f2fe',
                                            color: '#0369a1',
                                            fontSize: '11px',
                                            fontWeight: 600
                                          }}
                                        >
                                          {getSupersetLabel(exercise)}
                                        </span>
                                      )}
                                      <button
                                        type="button"
                                        onClick={() =>
                                          startEdit(
                                            week.weekNumber,
                                            exercise.id,
                                            'name',
                                            exercise.name || `Exercise ${index + 1}`
                                          )
                                        }
                                        style={{
                                          padding: '4px',
                                          borderRadius: '6px',
                                          border: '1px solid #e2e8f0',
                                          backgroundColor: '#fff',
                                          cursor: 'pointer',
                                          display: 'flex',
                                          alignItems: 'center',
                                          justifyContent: 'center'
                                        }}
                                        aria-label={`Edit exercise name for week ${week.weekNumber}`}
                                      >
                                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none">
                                          <path
                                            d="M4 20h4l11-11-4-4L4 16v4z"
                                            stroke="#475569"
                                            strokeWidth="1.5"
                                            strokeLinecap="round"
                                            strokeLinejoin="round"
                                          />
                                          <path
                                            d="M13 6l4 4"
                                            stroke="#475569"
                                            strokeWidth="1.5"
                                            strokeLinecap="round"
                                            strokeLinejoin="round"
                                          />
                                        </svg>
                                      </button>
                                    </div>
                                  )
                                ) : (
                                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                    <span>{exercise.name || `Exercise ${index + 1}`}</span>
                                    {getSupersetLabel(exercise) && (
                                      <span
                                        style={{
                                          padding: '2px 6px',
                                          borderRadius: '999px',
                                          backgroundColor: '#e0f2fe',
                                          color: '#0369a1',
                                          fontSize: '11px',
                                          fontWeight: 600
                                        }}
                                      >
                                        {getSupersetLabel(exercise)}
                                      </span>
                                    )}
                                  </div>
                                )}
                                <div style={{ marginTop: '8px' }}>
                                  {onOverrideChange ? (
                                    <label style={{ display: 'grid', gap: '6px', fontSize: '12px', color: '#64748b' }}>
                                      Notes
                                      <textarea
                                        value={exercise.notes || ''}
                                        onChange={(event) =>
                                          applyFieldAcrossWeeks(
                                            week.weekNumber,
                                            day.dayNumber,
                                            exercise.id,
                                            'notes',
                                            event.target.value
                                          )
                                        }
                                        rows={3}
                                        style={{
                                          resize: 'vertical',
                                          padding: '6px',
                                          borderRadius: '6px',
                                          border: '1px solid #d1d5db',
                                          fontSize: '13px',
                                          backgroundColor: '#fff',
                                          width: '100%',
                                          maxWidth: '260px'
                                        }}
                                      />
                                    </label>
                                  ) : (
                                    <div style={{ fontSize: '13px', color: '#475569' }}>
                                      {exercise.notes?.trim() ? exercise.notes : '—'}
                                    </div>
                                  )}
                                </div>
                                {onOverrideChange && (
                                  <div style={{ marginTop: '6px', display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                                    <button
                                      type="button"
                                      onClick={() =>
                                        handleAddSet(
                                          week.weekNumber,
                                          day.dayNumber,
                                          exercise.id,
                                          exercise.sets || '',
                                          exercise.intensity || '',
                                          exercise.reps || ''
                                        )
                                      }
                                      style={{
                                        padding: '6px 8px',
                                        borderRadius: '6px',
                                        border: '1px solid #e2e8f0',
                                        backgroundColor: '#f8fafc',
                                        color: '#475569',
                                        cursor: 'pointer',
                                        fontSize: '12px',
                                        width: 'fit-content'
                                      }}
                                    >
                                      + Add set
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() =>
                                        handleRemoveSet(
                                          week.weekNumber,
                                          day.dayNumber,
                                          exercise.id,
                                          exercise.sets || '',
                                          exercise.intensity || '',
                                          exercise.reps || ''
                                        )
                                      }
                                      disabled={setCount <= 1}
                                      style={{
                                        padding: '6px 8px',
                                        borderRadius: '6px',
                                        border: '1px solid #e2e8f0',
                                        backgroundColor: setCount <= 1 ? '#f1f5f9' : '#fff',
                                        color: setCount <= 1 ? '#94a3b8' : '#475569',
                                        cursor: setCount <= 1 ? 'not-allowed' : 'pointer',
                                        fontSize: '12px',
                                        width: 'fit-content'
                                      }}
                                    >
                                      Remove set
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => onDeleteExercise?.(day.dayNumber, exercise.id)}
                                      disabled={!onDeleteExercise}
                                      style={{
                                        padding: '6px 8px',
                                        borderRadius: '6px',
                                        border: '1px solid #fecaca',
                                        backgroundColor: onDeleteExercise ? '#fee2e2' : '#fef2f2',
                                        color: onDeleteExercise ? '#b91c1c' : '#fca5a5',
                                        cursor: onDeleteExercise ? 'pointer' : 'not-allowed',
                                        fontSize: '12px',
                                        width: 'fit-content'
                                      }}
                                    >
                                      Delete exercise
                                    </button>
                                  </div>
                                )}
                              </td>
                            )}
                            <td style={{ padding: '8px', border: '1px solid #e2e8f0' }}>
                              Set {setIndex + 1}
                            </td>
                            <td style={{ padding: '8px', border: '1px solid #e2e8f0' }}>
                              {onOverrideChange ? (
                                <input
                                  type="text"
                                  value={intensityValues[setIndex] || ''}
                                  onChange={(event) =>
                                    onOverrideChange(
                                      day.dayNumber,
                                      exercise.id,
                                      'intensity',
                                      updateListValue(
                                        exercise.intensity || '',
                                        setIndex,
                                        event.target.value,
                                        setCount
                                      ),
                                      week.weekNumber
                                    )
                                  }
                                  onBlur={(event) => {
                                    const formatted = formatIntensity(event.target.value)
                                    if (formatted !== event.target.value) {
                                      onOverrideChange(
                                        day.dayNumber,
                                        exercise.id,
                                        'intensity',
                                        updateListValue(
                                          exercise.intensity || '',
                                          setIndex,
                                          formatted,
                                          setCount
                                        ),
                                        week.weekNumber
                                      )
                                    }
                                  }}
                                  style={{
                                    width: '100%',
                                    padding: '6px',
                                    borderRadius: '6px',
                                    border: '1px solid #d1d5db',
                                    fontSize: '13px',
                                    boxSizing: 'border-box'
                                  }}
                                />
                              ) : (
                                intensityValues[setIndex] || '—'
                              )}
                            </td>
                            <td style={{ padding: '8px', border: '1px solid #e2e8f0' }}>
                              {onOverrideChange ? (
                                <input
                                  type="text"
                                  value={repsValues[setIndex] || ''}
                                  onChange={(event) =>
                                    onOverrideChange(
                                      day.dayNumber,
                                      exercise.id,
                                      'reps',
                                      updateListValue(
                                        exercise.reps || '',
                                        setIndex,
                                        event.target.value,
                                        setCount
                                      ),
                                      week.weekNumber
                                    )
                                  }
                                  style={{
                                    width: '100%',
                                    padding: '6px',
                                    borderRadius: '6px',
                                    border: '1px solid #d1d5db',
                                    fontSize: '13px',
                                    boxSizing: 'border-box'
                                  }}
                                />
                              ) : (
                                repsValues[setIndex] || '—'
                              )}
                            </td>
                            {isFirstRow && (
                              <td
                                rowSpan={setCount}
                                style={{ padding: '8px', border: '1px solid #e2e8f0', verticalAlign: 'top' }}
                              >
                                <div style={{ display: 'grid', gap: '6px', marginBottom: '10px' }}>
                                  <label style={{ fontSize: '12px', color: '#64748b' }}>
                                    Category
                                    <select
                                      value={exercise.category || ''}
                                      onChange={(event) =>
                                        applyFieldAcrossWeeks(
                                          week.weekNumber,
                                          day.dayNumber,
                                          exercise.id,
                                          'category',
                                          event.target.value
                                        )
                                      }
                                      disabled={!onOverrideChange}
                                      style={{
                                        marginTop: '4px',
                                        width: '100%',
                                        padding: '6px',
                                        borderRadius: '6px',
                                        border: '1px solid #d1d5db',
                                        fontSize: '13px',
                                        backgroundColor: onOverrideChange ? '#fff' : '#f8fafc'
                                      }}
                                    >
                                      {categoryOptions.map((option) => (
                                        <option key={option.value || 'select'} value={option.value}>
                                          {option.label}
                                        </option>
                                      ))}
                                    </select>
                                  </label>
                                  <div style={{ display: 'grid', gap: '6px' }}>
                                    <span style={{ fontSize: '12px', color: '#64748b' }}>Superset</span>
                                    <div style={{ display: 'grid', gap: '6px', gridTemplateColumns: '1fr 1fr' }}>
                                      <select
                                        value={exercise.supersetGroup || ''}
                                        onChange={(event) => {
                                          const nextGroup = event.target.value
                                          applyFieldAcrossWeeks(
                                            week.weekNumber,
                                            day.dayNumber,
                                            exercise.id,
                                            'supersetGroup',
                                            nextGroup
                                          )
                                          if (!nextGroup) {
                                            applyFieldAcrossWeeks(
                                              week.weekNumber,
                                              day.dayNumber,
                                              exercise.id,
                                              'supersetOrder',
                                              ''
                                            )
                                          }
                                        }}
                                        disabled={!onOverrideChange}
                                        style={{
                                          padding: '6px',
                                          borderRadius: '6px',
                                          border: '1px solid #d1d5db',
                                          fontSize: '13px',
                                          backgroundColor: onOverrideChange ? '#fff' : '#f8fafc'
                                        }}
                                      >
                                        {supersetGroups.map((group) => (
                                          <option key={group || 'none'} value={group}>
                                            {group || 'Group'}
                                          </option>
                                        ))}
                                      </select>
                                      <select
                                        value={exercise.supersetOrder || ''}
                                        onChange={(event) =>
                                          applyFieldAcrossWeeks(
                                            week.weekNumber,
                                            day.dayNumber,
                                            exercise.id,
                                            'supersetOrder',
                                            event.target.value
                                          )
                                        }
                                        disabled={!exercise.supersetGroup || !onOverrideChange}
                                        style={{
                                          padding: '6px',
                                          borderRadius: '6px',
                                          border: '1px solid #d1d5db',
                                          fontSize: '13px',
                                          backgroundColor: exercise.supersetGroup && onOverrideChange ? '#fff' : '#f8fafc'
                                        }}
                                      >
                                        {supersetPositions.map((position) => (
                                          <option key={position || 'none'} value={position}>
                                            {position || '#'}
                                          </option>
                                        ))}
                                      </select>
                                    </div>
                                  </div>
                                </div>
                                <div style={{ display: 'grid', gap: '6px', fontSize: '12px', color: '#475569' }}>
                                  <div>
                                    Reps:{' '}
                                    {total === null
                                      ? '—'
                                      : Number.isInteger(total)
                                        ? total
                                        : total.toFixed(1)}
                                  </div>
                                  <div>
                                    Avg Intensity:{' '}
                                    {averageIntensity === null
                                      ? '—'
                                      : `${formatNumber(averageIntensity)}%`}
                                  </div>
                                  <div>
                                    Tonnage:{' '}
                                    {tonnage === null
                                      ? '—'
                                      : Number.isInteger(tonnage)
                                        ? tonnage
                                        : tonnage.toFixed(1)}
                                  </div>
                                </div>
                              </td>
                            )}
                          </tr>
                        )
                      })
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          ))}
          {repTargets && weekTotals && (
            <div style={{
              marginTop: '10px',
              paddingTop: '12px',
              borderTop: '1px solid #e2e8f0'
            }}>
              <h5 style={{ margin: '0 0 8px', fontSize: '13px', color: '#475569' }}>
                Weekly category reps vs target
              </h5>
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
                  <thead>
                    <tr style={{ backgroundColor: '#f8fafc', textAlign: 'left' }}>
                      <th style={{ padding: '6px', border: '1px solid #e2e8f0' }}>Category</th>
                      <th style={{ padding: '6px', border: '1px solid #e2e8f0' }}>Actual</th>
                      <th style={{ padding: '6px', border: '1px solid #e2e8f0' }}>Target</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(['snatch', 'clean', 'jerk', 'squat', 'pull'] as const).map((category) => {
                      const totalForWeek = parseCount(getWeekTotal(week.weekNumber))
                      const percent = parseCount(repTargets[category])
                      const target =
                        totalForWeek !== null && percent !== null
                          ? formatNumber(totalForWeek * (percent / 100))
                          : null

                      let actual = 0
                      week.days.forEach((day) => {
                        day.exercises.forEach((exercise) => {
                          const exerciseCategory = (exercise.category || '').toLowerCase().trim()
                          if (!exerciseCategory) {
                            return
                          }
                          const matches =
                            exerciseCategory === 'clean & jerk'
                              ? category === 'clean' || category === 'jerk'
                              : exerciseCategory === category
                          if (!matches) {
                            return
                          }
                          const setCount = getSetCount(
                            exercise.sets || '',
                            exercise.intensity || '',
                            exercise.reps || ''
                          )
                          const exerciseTotal = getExerciseTotalReps(exercise.reps || '', setCount)
                          if (exerciseTotal === null) {
                            return
                          }
                          actual += exerciseTotal
                        })
                      })

                      const actualDisplay = formatNumber(actual)
                      const actualValue = parseCount(actualDisplay)
                      const targetValue = target === null ? null : parseCount(target)
                      const percentDiff =
                        actualValue !== null && targetValue !== null && targetValue !== 0
                          ? (Math.abs(actualValue - targetValue) / targetValue) * 100
                          : null
                      const actualColor =
                        percentDiff === null || percentDiff <= 3
                          ? '#1f2937'
                          : percentDiff <= 5
                            ? '#f97316'
                            : '#dc2626'

                      return (
                        <tr key={category}>
                          <td style={{ padding: '6px', border: '1px solid #e2e8f0', textTransform: 'capitalize' }}>
                            {category}
                          </td>
                          <td style={{ padding: '6px', border: '1px solid #e2e8f0' }}>
                            <span style={{ color: actualColor }}>{actualDisplay}</span>
                          </td>
                          <td style={{ padding: '6px', border: '1px solid #e2e8f0' }}>
                            {target === null ? '—' : target}
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      ))}
    </div>
  )
}
