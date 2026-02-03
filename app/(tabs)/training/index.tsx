import DayViewButtons from '@/components/DayViewButtons'
import WorkoutCard from '@/components/WorkoutCard'
import { api } from '@/convex/_generated/api'
import { Program } from '@/types/program'
import { useQuery } from 'convex/react'
import { useState } from 'react'
import { Pressable, StyleSheet, View } from 'react-native'

const TrainingCalendar = () => {
  // State
  const [selectedDate, setSelectedDate] = useState(new Date())
  const [isExpanded, setIsExpanded] = useState(false)

  // Convex Query
  const programData = useQuery(api.programs.getAthleteProgram, {
      athleteName: 'maddisen',
      programName: 'test',
      startDate: '2026-02-01'
  })

  const program = programData as Program | undefined

  return (
    <View className='flex-1'>
      {isExpanded && (
        <Pressable
          style={[StyleSheet.absoluteFillObject, styles.overlay]}
          onPress={() => setIsExpanded(false)}
        />
      )}
      <View className='absolute top-0 left-0 right-0 z-10' style={styles.dayView}>
        <DayViewButtons
          program={program}
          selectedDate={selectedDate}
          onDateSelect={setSelectedDate}
          isExpanded={isExpanded}
          onExpandedChange={setIsExpanded}
        />
      </View>
      <WorkoutCard program={program} selectedDate={selectedDate} />
    </View>
  )
}

export default TrainingCalendar

const styles = StyleSheet.create({
  overlay: {
    zIndex: 5,
  },
  dayView: {
    zIndex: 10,
    elevation: 10,
  },
})
