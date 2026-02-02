import DayViewButtons from '@/components/DayViewButtons'
import WorkoutCard from '@/components/WorkoutCard'
import { api } from '@/convex/_generated/api'
import { Program } from '@/types/types'
import { useQuery } from 'convex/react'
import { useState } from 'react'
import { View } from 'react-native'

const TrainingCalendar = () => {
  // State
  const [selectedDate, setSelectedDate] = useState(new Date())

  // Convex Query
  const programData = useQuery(api.programs.getAthleteProgram, {
      athleteName: 'maddisen',
      programName: 'test',
      startDate: '2026-02-01'
  })

  // Cast to Program type (handles the _id and _creationTime fields from Convex)
  const program = programData as Program | undefined

  return (
    <View className='flex-1'>
      <View className='absolute top-0 left-0 right-0 z-10'>
        <DayViewButtons program={program} selectedDate={selectedDate} onDateSelect={setSelectedDate}/>
      </View>
      <WorkoutCard program={program} selectedDate={selectedDate} />
    </View>
  )
}

export default TrainingCalendar