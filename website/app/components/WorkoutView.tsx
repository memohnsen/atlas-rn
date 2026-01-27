'use client'

import { useState, useEffect } from 'react'
import { WorkoutRecord } from '@/types/workout'
import ProgramCharts from './ProgramCharts'

interface WorkoutViewProps {
  data: WorkoutRecord[]
}

export default function WorkoutView({ data }: WorkoutViewProps) {
  const [selectedWeek, setSelectedWeek] = useState(1)

  // Update selected week when data changes
  useEffect(() => {
    if (data.length > 0) {
      const weeks = [...new Set(data.map(d => d.week_number))].sort((a, b) => a - b)
      if (weeks.length > 0) {
        setSelectedWeek(weeks[0])
      }
    }
  }, [data])

  if (data.length === 0) {
    return (
      <div style={{
        padding: '40px',
        textAlign: 'center',
        color: '#666',
        backgroundColor: '#f8f9fa',
        borderRadius: '8px'
      }}>
        <p style={{ fontSize: '18px', marginBottom: '10px' }}>No workout data available</p>
      </div>
    )
  }

  // Get unique weeks and sort them
  const weeks = [...new Set(data.map(d => d.week_number))].sort((a, b) => a - b)

  // Filter data for selected week
  const weekData = data.filter(d => d.week_number === selectedWeek)

  // Group by day, then by exercise
  const groupedByDay: Record<string, Record<string, WorkoutRecord[]>> = {}
  weekData.forEach(item => {
    const day = item.day_number?.toString() || 'N/A'
    if (!groupedByDay[day]) {
      groupedByDay[day] = {}
    }
    const exercise = item.exercise_name
    if (!groupedByDay[day][exercise]) {
      groupedByDay[day][exercise] = []
    }
    groupedByDay[day][exercise].push(item)
  })

  // Sort days
  const sortedDays = Object.keys(groupedByDay).sort((a, b) => {
    if (a === 'N/A') return 1
    if (b === 'N/A') return -1
    return parseInt(a) - parseInt(b)
  })

  return (
    <>
      <p style={{ marginBottom: '20px', color: '#666', fontSize: '14px' }}>
        Total records: {data.length} | Program: {data[0]?.program_name || 'N/A'}
        {data[0]?.athlete_name && ` | Athlete: ${data[0].athlete_name}`}
      </p>

      {/* Program Analytics Charts */}
      <ProgramCharts data={data} />

      {/* Week Tabs */}
      <div
        className="week-tabs"
        style={{
          marginBottom: '30px',
          borderBottom: '2px solid #ddd',
          paddingBottom: '10px'
        }}
      >
        {weeks.map(week => (
          <button
            key={week}
            onClick={() => setSelectedWeek(week)}
            style={{
              padding: '10px 20px',
              fontSize: '16px',
              fontWeight: selectedWeek === week ? 'bold' : 'normal',
              backgroundColor: selectedWeek === week ? '#0070f3' : '#f5f5f5',
              color: selectedWeek === week ? 'white' : '#333',
              border: 'none',
              borderRadius: '6px',
              cursor: 'pointer',
              transition: 'all 0.2s'
            }}
          >
            Week {week}
          </button>
        ))}
      </div>

      {/* Week Content */}
      <div>
        <h2 style={{ marginBottom: '20px', color: '#333' }}>Week {selectedWeek}</h2>

        {sortedDays.map(day => {
          const dayExercises = groupedByDay[day]
          // Sort exercises by exercise_number
          const exerciseNames = Object.keys(dayExercises).sort((a, b) => {
            const numA = dayExercises[a][0]?.exercise_number || 999
            const numB = dayExercises[b][0]?.exercise_number || 999
            return numA - numB
          })

          return (
            <div
              key={day}
              style={{
                marginBottom: '40px'
              }}
            >
              <h3 style={{
                marginBottom: '15px',
                color: '#0070f3',
                fontSize: '20px',
                fontWeight: '600'
              }}>
                Day {day}
              </h3>

              <div
                className="table-scroll"
                style={{
                  border: '1px solid #ddd',
                  borderRadius: '6px'
                }}
              >
                <table style={{
                  width: '100%',
                  borderCollapse: 'collapse',
                  backgroundColor: 'white'
                }}>
                  <thead>
                    <tr style={{
                      backgroundColor: '#f8f9fa',
                      borderBottom: '2px solid #dee2e6'
                    }}>
                      <th style={{
                        padding: '12px 15px',
                        textAlign: 'left',
                        fontWeight: '600',
                        color: '#333',
                        borderRight: '1px solid #dee2e6'
                      }}>Exercise</th>
                      <th style={{
                        padding: '12px 15px',
                        textAlign: 'center',
                        fontWeight: '600',
                        color: '#333',
                        borderRight: '1px solid #dee2e6',
                        minWidth: '80px'
                      }}>Sets</th>
                      <th style={{
                        padding: '12px 15px',
                        textAlign: 'center',
                        fontWeight: '600',
                        color: '#333',
                        borderRight: '1px solid #dee2e6',
                        minWidth: '100px'
                      }}>Reps</th>
                      <th style={{
                        padding: '12px 15px',
                        textAlign: 'center',
                        fontWeight: '600',
                        color: '#333',
                        borderRight: '1px solid #dee2e6',
                        minWidth: '100px'
                      }}>Weight (kg)</th>
                      <th style={{
                        padding: '12px 15px',
                        textAlign: 'center',
                        fontWeight: '600',
                        color: '#333',
                        minWidth: '80px'
                      }}>%</th>
                    </tr>
                  </thead>
                  <tbody>
                    {exerciseNames.flatMap((exerciseName, exerciseIdx) => {
                      const sets = dayExercises[exerciseName]
                      const isLastExercise = exerciseIdx === exerciseNames.length - 1

                      return sets.map((set, setIdx) => {
                        const isLastSet = setIdx === sets.length - 1
                        const isLastRow = isLastExercise && isLastSet
                        const rowKey = `${exerciseName}-${setIdx}`

                        return (
                          <tr
                            key={rowKey}
                            style={{
                              borderBottom: isLastRow ? 'none' : '1px solid #e9ecef',
                              backgroundColor: (exerciseIdx + setIdx) % 2 === 0 ? 'white' : '#f8f9fa'
                            }}
                          >
                            {setIdx === 0 && (
                              <td
                                rowSpan={sets.length}
                                style={{
                                  padding: '12px 15px',
                                  fontWeight: '600',
                                  color: '#333',
                                  borderRight: '1px solid #e9ecef',
                                  verticalAlign: 'top'
                                }}
                              >
                                {exerciseName}
                              </td>
                            )}
                            <td style={{
                              padding: '12px 15px',
                              textAlign: 'center',
                              color: '#666',
                              borderRight: '1px solid #e9ecef'
                            }}>
                              {set.sets || 1}
                            </td>
                            <td style={{
                              padding: '12px 15px',
                              textAlign: 'center',
                              color: '#666',
                              borderRight: '1px solid #e9ecef'
                            }}>
                              {set.reps}
                            </td>
                            <td style={{
                              padding: '12px 15px',
                              textAlign: 'center',
                              color: '#666',
                              borderRight: '1px solid #e9ecef'
                            }}>
                              {set.weights != null ? (
                                `${set.weights}`
                              ) : (
                                <span style={{ color: '#999', fontStyle: 'italic' }}>—</span>
                              )}
                            </td>
                            <td style={{
                              padding: '12px 15px',
                              textAlign: 'center',
                              color: '#666'
                            }}>
                              {set.percent != null ? (
                                `${set.percent}%`
                              ) : (
                                <span style={{ color: '#999', fontStyle: 'italic' }}>—</span>
                              )}
                            </td>
                          </tr>
                        )
                      })
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )
        })}
      </div>
    </>
  )
}
