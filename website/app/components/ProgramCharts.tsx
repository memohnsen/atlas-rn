'use client'

import { WorkoutRecord } from '@/types/workout'
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts'

interface ProgramChartsProps {
  data: WorkoutRecord[]
}

export default function ProgramCharts({ data }: ProgramChartsProps) {
  // Calculate weekly rep count
  const weeklyRepData = calculateWeeklyReps(data)

  // Calculate average intensity per week
  const weeklyIntensityData = calculateWeeklyIntensity(data)

  return (
    <div style={{ marginBottom: '40px' }}>
      <h2 style={{ marginBottom: '20px', color: '#333', fontSize: '24px', fontWeight: '600' }}>
        Program Analytics
      </h2>

      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(500px, 1fr))',
        gap: '30px',
        marginBottom: '40px'
      }}>
        {/* Weekly Rep Count Chart */}
        <div style={{
          padding: '20px',
          backgroundColor: 'white',
          borderRadius: '8px',
          border: '1px solid #ddd'
        }}>
          <h3 style={{ marginBottom: '15px', color: '#333', fontSize: '18px', fontWeight: '600' }}>
            Weekly Total Reps
          </h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={weeklyRepData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis
                dataKey="week"
                label={{ value: 'Week', position: 'insideBottom', offset: -5 }}
                stroke="#666"
              />
              <YAxis
                label={{ value: 'Total Reps', angle: -90, position: 'insideLeft' }}
                stroke="#666"
              />
              <Tooltip
                contentStyle={{ backgroundColor: '#fff', border: '1px solid #ddd', borderRadius: '4px' }}
                labelStyle={{ fontWeight: 'bold', color: '#333' }}
              />
              <Bar dataKey="reps" fill="#0070f3" name="Total Reps" />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Average Intensity Chart */}
        <div style={{
          padding: '20px',
          backgroundColor: 'white',
          borderRadius: '8px',
          border: '1px solid #ddd'
        }}>
          <h3 style={{ marginBottom: '15px', color: '#333', fontSize: '18px', fontWeight: '600' }}>
            Average Intensity (%)
          </h3>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={weeklyIntensityData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis
                dataKey="week"
                label={{ value: 'Week', position: 'insideBottom', offset: -5 }}
                stroke="#666"
              />
              <YAxis
                label={{ value: 'Intensity (%)', angle: -90, position: 'insideLeft' }}
                domain={[0, 100]}
                stroke="#666"
              />
              <Tooltip
                contentStyle={{ backgroundColor: '#fff', border: '1px solid #ddd', borderRadius: '4px' }}
                labelStyle={{ fontWeight: 'bold', color: '#333' }}
                formatter={(value: number) => [`${value.toFixed(1)}%`, 'Avg Intensity']}
              />
              <Legend />
              <Line
                type="monotone"
                dataKey="intensity"
                stroke="#10b981"
                strokeWidth={3}
                name="Avg Intensity"
                dot={{ fill: '#10b981', r: 5 }}
                activeDot={{ r: 7 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  )
}

// Helper function to calculate weekly rep totals
function calculateWeeklyReps(data: WorkoutRecord[]) {
  const weeklyData = new Map<number, number>()

  data.forEach(workout => {
    const week = workout.week_number

    // Parse reps (handle ranges like "10-15" by taking the first number)
    let repCount = 0
    const repsStr = String(workout.reps)
    const repMatch = repsStr.match(/(\d+)/)
    if (repMatch) {
      repCount = parseInt(repMatch[1])
    }

    // Multiply by sets if available
    const sets = workout.sets || 1
    const totalReps = repCount * sets

    const currentTotal = weeklyData.get(week) || 0
    weeklyData.set(week, currentTotal + totalReps)
  })

  // Convert to array and sort by week
  return Array.from(weeklyData.entries())
    .map(([week, reps]) => ({
      week: `Week ${week}`,
      reps
    }))
    .sort((a, b) => {
      const weekA = parseInt(a.week.replace('Week ', ''))
      const weekB = parseInt(b.week.replace('Week ', ''))
      return weekA - weekB
    })
}

// Helper function to calculate average intensity per week
function calculateWeeklyIntensity(data: WorkoutRecord[]) {
  const weeklyData = new Map<number, { total: number; count: number }>()

  data.forEach(workout => {
    const week = workout.week_number

    // Only include workouts with a percent value
    if (workout.percent !== null && workout.percent !== undefined) {
      const current = weeklyData.get(week) || { total: 0, count: 0 }
      weeklyData.set(week, {
        total: current.total + workout.percent,
        count: current.count + 1
      })
    }
  })

  // Convert to array and calculate averages
  return Array.from(weeklyData.entries())
    .map(([week, { total, count }]) => ({
      week: `Week ${week}`,
      intensity: count > 0 ? total / count : 0
    }))
    .sort((a, b) => {
      const weekA = parseInt(a.week.replace('Week ', ''))
      const weekB = parseInt(b.week.replace('Week ', ''))
      return weekA - weekB
    })
}
