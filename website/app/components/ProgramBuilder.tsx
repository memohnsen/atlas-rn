'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { ProgramBuilderDay, RepTargets, WeekTotalReps } from '@/types/workout'

type ProgramBuilderProps = {
  onChange: (days: ProgramBuilderDay[]) => void
  onWeekCountChange?: (count: number) => void
  onRepTargetsChange?: (targets: RepTargets) => void
  onWeekTotalsChange?: (totals: WeekTotalReps[]) => void
  initialDays?: ProgramBuilderDay[]
  initialWeekCount?: number
  initialRepTargets?: RepTargets
  initialWeekTotals?: WeekTotalReps[]
  initialSeed?: string | null
}

const defaultRepTargets: RepTargets = {
  snatch: '',
  clean: '',
  jerk: '',
  squat: '',
  pull: ''
}

export default function ProgramBuilder({
  onChange,
  onWeekCountChange,
  onRepTargetsChange,
  onWeekTotalsChange,
  initialDays,
  initialWeekCount,
  initialRepTargets,
  initialWeekTotals,
  initialSeed
}: ProgramBuilderProps) {
  const [days, setDays] = useState<ProgramBuilderDay[]>(
    () => initialDays ?? []
  )
  const [weekCount, setWeekCount] = useState(4)
  const [repTargets, setRepTargets] = useState<RepTargets>(defaultRepTargets)
  const [week1TotalReps, setWeek1TotalReps] = useState('')
  const [weekTotalOverrides, setWeekTotalOverrides] = useState<Record<number, string>>({})
  const [editingWeekTotal, setEditingWeekTotal] = useState<number | null>(null)
  const [editingWeekValue, setEditingWeekValue] = useState('')
  const initialSeedRef = useRef<string | null>(null)

  useEffect(() => {
    if (!initialSeed) {
      return
    }
    if (initialSeedRef.current === initialSeed) {
      return
    }

    initialSeedRef.current = initialSeed
    setDays(initialDays ?? [])
    setWeekCount(initialWeekCount ?? 4)
    setRepTargets(initialRepTargets ?? defaultRepTargets)

    if (initialWeekTotals) {
      const week1 = initialWeekTotals.find((item) => item.weekNumber === 1)?.total ?? ''
      const overrides: Record<number, string> = {}
      initialWeekTotals.forEach((item) => {
        if (item.weekNumber !== 1 && item.total.trim()) {
          overrides[item.weekNumber] = item.total
        }
      })
      setWeek1TotalReps(week1)
      setWeekTotalOverrides(overrides)
    } else {
      setWeek1TotalReps('')
      setWeekTotalOverrides({})
    }
    setEditingWeekTotal(null)
    setEditingWeekValue('')
  }, [initialSeed, initialDays, initialWeekCount, initialRepTargets, initialWeekTotals])

  const parseCount = (value: string) => {
    const match = value.match(/(\d+(\.\d+)?)/)
    return match ? Number.parseFloat(match[1]) : null
  }

  const formatNumber = (value: number) => {
    const fixed = value.toFixed(1)
    return fixed.replace(/\.0+$/, '').replace(/(\.\d*?)0+$/, '$1')
  }

  const liftPercentTotal = useMemo(() => {
    const snatch = parseCount(repTargets.snatch) || 0
    const clean = parseCount(repTargets.clean) || 0
    const jerk = parseCount(repTargets.jerk) || 0
    return snatch + clean + jerk
  }, [repTargets])

  const strengthPercentTotal = useMemo(() => {
    const squat = parseCount(repTargets.squat) || 0
    const pull = parseCount(repTargets.pull) || 0
    return squat + pull
  }, [repTargets])

  const totalPercent = useMemo(() => {
    const snatch = parseCount(repTargets.snatch) || 0
    const clean = parseCount(repTargets.clean) || 0
    const jerk = parseCount(repTargets.jerk) || 0
    const squat = parseCount(repTargets.squat) || 0
    const pull = parseCount(repTargets.pull) || 0
    return snatch + clean + jerk + squat + pull
  }, [repTargets])

  const allRepTargetsFilled = useMemo(
    () =>
      ['snatch', 'clean', 'jerk', 'squat', 'pull'].every(
        (key) => repTargets[key as keyof RepTargets].trim() !== ''
      ),
    [repTargets]
  )

  const isTotalPercentMismatch = allRepTargetsFilled && Math.abs(totalPercent - 100) > 0.01

  const getWeekTotal = (weekNumber: number) => {
    if (weekNumber === 1) {
      return week1TotalReps
    }

    const override = weekTotalOverrides[weekNumber]
    if (override) {
      return override
    }

    const base = parseCount(week1TotalReps)
    if (base === null) {
      return ''
    }

    if (weekNumber === 2) {
      return formatNumber(base * 1.1)
    }
    if (weekNumber === 3) {
      return formatNumber(base * 0.9)
    }

    return formatNumber(base)
  }

  const commitWeekOverride = (weekNumber: number) => {
    const trimmed = editingWeekValue.trim()
    setWeekTotalOverrides((prev) => {
      const next = { ...prev }
      if (!trimmed) {
        delete next[weekNumber]
      } else {
        next[weekNumber] = trimmed
      }
      return next
    })
    setEditingWeekTotal(null)
  }

  const handleWeekCountChange = (value: string) => {
    const nextValue = Number.parseInt(value, 10)
    if (Number.isNaN(nextValue)) {
      setWeekCount(1)
      return
    }

    const clamped = Math.min(Math.max(nextValue, 1), 12)
    setWeekCount(clamped)
  }

  useEffect(() => {
    onChange(days)
  }, [days, onChange])

  useEffect(() => {
    onWeekCountChange?.(weekCount)
  }, [weekCount, onWeekCountChange])

  useEffect(() => {
    onRepTargetsChange?.(repTargets)
  }, [repTargets, onRepTargetsChange])

  const weekTotals = useMemo<WeekTotalReps[]>(
    () =>
      Array.from({ length: weekCount }, (_, index) => ({
        weekNumber: index + 1,
        total: getWeekTotal(index + 1)
      })),
    [weekCount, week1TotalReps, weekTotalOverrides]
  )

  useEffect(() => {
    onWeekTotalsChange?.(weekTotals)
  }, [weekTotals, onWeekTotalsChange])

  return (
    <div style={{ marginBottom: '32px' }}>
      <div style={{ display: 'grid', gap: '24px' }}>
        <div
          style={{
            display: 'grid',
            gap: '20px',
            gridTemplateColumns: 'repeat(auto-fit, minmax(380px, 1fr))',
            alignItems: 'start'
          }}
        >
      <div style={{
        padding: '24px',
        borderRadius: '12px',
        border: '1px solid #2d3748',
        backgroundColor: '#1a1f2e'
      }}>
        <h3 style={{
          marginTop: 0,
          marginBottom: '16px',
          fontSize: '16px',
          fontWeight: 600,
          color: '#cbd5e1',
          letterSpacing: '-0.01em'
        }}>
          Weekly Total Reps
        </h3>
        <div style={{ marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '12px' }}>
          <label style={{
            fontSize: '13px',
            fontWeight: 600,
            color: '#94a3b8',
            letterSpacing: '0.01em'
          }}>
            Program Length (weeks)
          </label>
          <input
            type="number"
            min={1}
            max={12}
            value={weekCount}
            onChange={(event) => handleWeekCountChange(event.target.value)}
            style={{
              width: '80px',
              padding: '10px',
              borderRadius: '8px',
              border: '1px solid #334155',
              fontSize: '14px',
              backgroundColor: '#0f1419',
              color: '#e2e8f0'
            }}
          />
        </div>
        <div style={{ display: 'grid', gap: '10px', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))' }}>
          {Array.from({ length: weekCount }, (_, index) => index + 1).map((weekNumber) => {
            const isEditable = weekNumber > 1
            const currentValue = getWeekTotal(weekNumber)
            const isEditing = editingWeekTotal === weekNumber
            return (
              <div
                key={weekNumber}
                style={{
                  padding: '12px',
                  borderRadius: '8px',
                  border: '1px solid #334155',
                  backgroundColor: '#0f1419',
                  display: 'grid',
                  gap: '8px'
                }}
              >
                <strong style={{
                  color: '#cbd5e1',
                  fontSize: '13px',
                  fontWeight: 600,
                  letterSpacing: '0.01em'
                }}>
                  Week {weekNumber}
                </strong>
                {weekNumber === 1 ? (
                  <input
                    type="text"
                    value={week1TotalReps}
                    onChange={(event) => setWeek1TotalReps(event.target.value)}
                    placeholder="Total reps"
                    inputMode="numeric"
                    style={{
                      padding: '10px',
                      borderRadius: '8px',
                      border: '1px solid #334155',
                      fontSize: '14px',
                      backgroundColor: '#0a0f1a',
                      color: '#e2e8f0'
                    }}
                  />
                ) : isEditing ? (
                  <input
                    type="text"
                    value={editingWeekValue}
                    onChange={(event) => setEditingWeekValue(event.target.value)}
                    onBlur={() => commitWeekOverride(weekNumber)}
                    onKeyDown={(event) => {
                      if (event.key === 'Enter') {
                        event.currentTarget.blur()
                      }
                      if (event.key === 'Escape') {
                        setEditingWeekTotal(null)
                      }
                    }}
                    placeholder="Override total reps"
                    inputMode="numeric"
                    style={{
                      padding: '10px',
                      borderRadius: '8px',
                      border: '1px solid #334155',
                      fontSize: '14px',
                      backgroundColor: '#0a0f1a',
                      color: '#e2e8f0'
                    }}
                    autoFocus
                  />
                ) : (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{
                      color: '#e2e8f0',
                      fontSize: '14px',
                      fontWeight: 500
                    }}>
                      {currentValue || '—'}
                    </span>
                    {isEditable && (
                      <button
                        type="button"
                        onClick={() => {
                          setEditingWeekTotal(weekNumber)
                          setEditingWeekValue(currentValue)
                        }}
                        style={{
                          padding: '4px',
                          borderRadius: '6px',
                          border: '1px solid #334155',
                          backgroundColor: '#0a0f1a',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          transition: 'all 0.2s'
                        }}
                        aria-label={`Edit week ${weekNumber} total reps`}
                      >
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none">
                          <path
                            d="M4 20h4l11-11-4-4L4 16v4z"
                            stroke="#94a3b8"
                            strokeWidth="1.5"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          />
                          <path
                            d="M13 6l4 4"
                            stroke="#94a3b8"
                            strokeWidth="1.5"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          />
                        </svg>
                      </button>
                    )}
                  </div>
                )}
                {weekNumber > 1 && (
                  <span style={{
                    fontSize: '11px',
                    color: '#64748b',
                    fontWeight: 500,
                    letterSpacing: '0.02em'
                  }}>
                    {weekNumber === 2 && '+10% of week 1'}
                    {weekNumber === 3 && '-10% of week 1'}
                    {weekNumber === 4 && 'Same as week 1'}
                    {weekNumber > 4 && 'Same as week 1'}
                  </span>
                )}
              </div>
            )
          })}
        </div>
      </div>

      <div style={{
        padding: '24px',
        borderRadius: '12px',
        border: '1px solid #2d3748',
        backgroundColor: '#1a1f2e'
      }}>
        <h3 style={{
          marginTop: 0,
          marginBottom: '16px',
          fontSize: '16px',
          fontWeight: 600,
          color: '#cbd5e1',
          letterSpacing: '-0.01em'
        }}>
          Rep Targets (% of weekly total)
        </h3>
        <div style={{ display: 'grid', gap: '10px', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))' }}>
          {[
            { key: 'snatch', label: 'Snatch' },
            { key: 'clean', label: 'Clean' },
            { key: 'jerk', label: 'Jerk' },
            { key: 'squat', label: 'Squat' },
            { key: 'pull', label: 'Pull' }
          ].map((item) => (
            <label key={item.key} style={{
              display: 'grid',
              gap: '8px',
              fontSize: '13px',
              fontWeight: 600,
              color: '#94a3b8',
              letterSpacing: '0.01em'
            }}>
              {item.label}
              <input
                type="text"
                value={repTargets[item.key as keyof typeof repTargets]}
                onChange={(event) =>
                  setRepTargets((prev) => ({ ...prev, [item.key]: event.target.value }))
                }
                placeholder="Percent"
                inputMode="decimal"
                style={{
                  padding: '10px',
                  borderRadius: '8px',
                  border: '1px solid #334155',
                  fontSize: '14px',
                  backgroundColor: '#0f1419',
                  color: '#e2e8f0'
                }}
              />
            </label>
          ))}
        </div>
        <div style={{
          marginTop: '16px',
          display: 'grid',
          gap: '10px',
          gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
          fontSize: '13px'
        }}>
          <div style={{
            padding: '10px 14px',
            borderRadius: '8px',
            backgroundColor: '#0f1419',
            border: '1px solid #334155',
            color: '#cbd5e1'
          }}>
            <strong style={{ fontWeight: 600 }}>Lifts % total:</strong> {formatNumber(liftPercentTotal)}
          </div>
          <div style={{
            padding: '10px 14px',
            borderRadius: '8px',
            backgroundColor: '#0f1419',
            border: '1px solid #334155',
            color: '#cbd5e1'
          }}>
            <strong style={{ fontWeight: 600 }}>Strength % total:</strong> {formatNumber(strengthPercentTotal)}
          </div>
          <div
            style={{
              padding: '10px 14px',
              borderRadius: '8px',
              backgroundColor: '#0f1419',
              border: isTotalPercentMismatch ? '1px solid #f87171' : '1px solid #334155',
              color: isTotalPercentMismatch ? '#fca5a5' : '#cbd5e1',
              fontWeight: isTotalPercentMismatch ? 600 : 500
            }}
          >
            <strong style={{ fontWeight: 600 }}>Total %:</strong> {formatNumber(totalPercent)}
          </div>
        </div>
        <div style={{ marginTop: '20px' }}>
          <h4 style={{
            margin: '0 0 12px',
            fontSize: '14px',
            fontWeight: 600,
            color: '#cbd5e1',
            letterSpacing: '0.01em'
          }}>
            Weekly Rep Targets
          </h4>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
              <thead>
                <tr style={{ backgroundColor: '#0f1419', textAlign: 'left' }}>
                  <th style={{
                    padding: '10px 12px',
                    border: '1px solid #334155',
                    color: '#94a3b8',
                    fontWeight: 600,
                    letterSpacing: '0.01em'
                  }}>Week</th>
                  <th style={{
                    padding: '10px 12px',
                    border: '1px solid #334155',
                    color: '#94a3b8',
                    fontWeight: 600,
                    letterSpacing: '0.01em'
                  }}>Total</th>
                  <th style={{
                    padding: '10px 12px',
                    border: '1px solid #334155',
                    color: '#94a3b8',
                    fontWeight: 600,
                    letterSpacing: '0.01em'
                  }}>Snatch</th>
                  <th style={{
                    padding: '10px 12px',
                    border: '1px solid #334155',
                    color: '#94a3b8',
                    fontWeight: 600,
                    letterSpacing: '0.01em'
                  }}>Clean</th>
                  <th style={{
                    padding: '10px 12px',
                    border: '1px solid #334155',
                    color: '#94a3b8',
                    fontWeight: 600,
                    letterSpacing: '0.01em'
                  }}>Jerk</th>
                  <th style={{
                    padding: '10px 12px',
                    border: '1px solid #334155',
                    color: '#94a3b8',
                    fontWeight: 600,
                    letterSpacing: '0.01em'
                  }}>Squat</th>
                  <th style={{
                    padding: '10px 12px',
                    border: '1px solid #334155',
                    color: '#94a3b8',
                    fontWeight: 600,
                    letterSpacing: '0.01em'
                  }}>Pull</th>
                  <th style={{
                    padding: '10px 12px',
                    border: '1px solid #334155',
                    color: '#94a3b8',
                    fontWeight: 600,
                    letterSpacing: '0.01em'
                  }}>Lifts</th>
                  <th style={{
                    padding: '10px 12px',
                    border: '1px solid #334155',
                    color: '#94a3b8',
                    fontWeight: 600,
                    letterSpacing: '0.01em'
                  }}>Strength</th>
                </tr>
              </thead>
              <tbody>
                {Array.from({ length: weekCount }, (_, index) => index + 1).map((weekNumber) => {
                  const total = parseCount(getWeekTotal(weekNumber) || '')
                  const calc = (value: string) => {
                    const percent = parseCount(value)
                    if (total === null || percent === null) {
                      return null
                    }
                    return total * (percent / 100)
                  }
                  const snatch = calc(repTargets.snatch)
                  const clean = calc(repTargets.clean)
                  const jerk = calc(repTargets.jerk)
                  const squat = calc(repTargets.squat)
                  const pull = calc(repTargets.pull)
                  const lifts = [snatch, clean, jerk].reduce<number>(
                    (sum, val) => sum + (val ?? 0),
                    0
                  )
                  const strength = [squat, pull].reduce<number>(
                    (sum, val) => sum + (val ?? 0),
                    0
                  )

                  const formatValue = (value: number | null) =>
                    value === null ? '—' : formatNumber(value)

                  return (
                    <tr key={weekNumber}>
                      <td style={{
                        padding: '10px 12px',
                        border: '1px solid #334155',
                        color: '#e2e8f0',
                        backgroundColor: '#1a1f2e'
                      }}>Week {weekNumber}</td>
                      <td style={{
                        padding: '10px 12px',
                        border: '1px solid #334155',
                        color: '#cbd5e1',
                        backgroundColor: '#1a1f2e'
                      }}>
                        {total === null ? '—' : formatNumber(total)}
                      </td>
                      <td style={{
                        padding: '10px 12px',
                        border: '1px solid #334155',
                        color: '#cbd5e1',
                        backgroundColor: '#1a1f2e'
                      }}>{formatValue(snatch)}</td>
                      <td style={{
                        padding: '10px 12px',
                        border: '1px solid #334155',
                        color: '#cbd5e1',
                        backgroundColor: '#1a1f2e'
                      }}>{formatValue(clean)}</td>
                      <td style={{
                        padding: '10px 12px',
                        border: '1px solid #334155',
                        color: '#cbd5e1',
                        backgroundColor: '#1a1f2e'
                      }}>{formatValue(jerk)}</td>
                      <td style={{
                        padding: '10px 12px',
                        border: '1px solid #334155',
                        color: '#cbd5e1',
                        backgroundColor: '#1a1f2e'
                      }}>{formatValue(squat)}</td>
                      <td style={{
                        padding: '10px 12px',
                        border: '1px solid #334155',
                        color: '#cbd5e1',
                        backgroundColor: '#1a1f2e'
                      }}>{formatValue(pull)}</td>
                      <td style={{
                        padding: '10px 12px',
                        border: '1px solid #334155',
                        color: '#cbd5e1',
                        backgroundColor: '#1a1f2e'
                      }}>
                        {total === null ? '—' : formatNumber(lifts)}
                      </td>
                      <td style={{
                        padding: '10px 12px',
                        border: '1px solid #334155',
                        color: '#cbd5e1',
                        backgroundColor: '#1a1f2e'
                      }}>
                        {total === null ? '—' : formatNumber(strength)}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>
        </div>

      </div>
    </div>
  )
}
