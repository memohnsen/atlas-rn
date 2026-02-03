import AthletePickerModal from '@/components/AthletePickerModal'
import { useCoach } from '@/components/CoachProvider'
import DayViewButtons from '@/components/DayViewButtons'
import WorkoutCard from '@/components/WorkoutCard'
import { api } from '@/convex/_generated/api'
import { Program } from '@/types/program'
import { useAuth } from '@clerk/clerk-expo'
import { useQuery } from 'convex/react'
import { useState } from 'react'
import { Pressable, StyleSheet, View } from 'react-native'

const TrainingCalendar = () => {
  // State
  const [selectedDate, setSelectedDate] = useState(new Date())
  const [isExpanded, setIsExpanded] = useState(false)
  const { isSignedIn } = useAuth()
  const { coachEnabled, selectedAthlete, setSelectedAthlete, athletes } = useCoach()
  const [pickerOpen, setPickerOpen] = useState(false)

  // Convex Query
  const coachProgram = useQuery(
    api.programs.getCurrentProgramForAthlete,
    coachEnabled && selectedAthlete ? { athleteName: selectedAthlete } : 'skip'
  )

  const programData = useQuery(
    api.programs.getAthleteProgram,
    !coachEnabled && isSignedIn
      ? {
          athleteName: 'maddisen',
          programName: 'test',
          startDate: '2026-02-01',
        }
      : 'skip'
  )

  const program = (coachEnabled ? coachProgram : programData) as Program | undefined

  return (
    <View className='flex-1'>
      <AthletePickerModal
        visible={pickerOpen}
        athletes={athletes}
        selectedAthlete={selectedAthlete}
        onSelect={setSelectedAthlete}
        onClose={() => setPickerOpen(false)}
      />
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
          coachEnabled={coachEnabled}
          selectedAthlete={selectedAthlete}
          onOpenAthletePicker={() => setPickerOpen(true)}
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
