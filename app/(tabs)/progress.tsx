import AthletePickerModal from '@/components/AthletePickerModal'
import { useCoach } from '@/components/CoachProvider'
import Header from '@/components/Header'
import ProgressCard from '@/components/ProgressCard'
import { api } from '@/convex/_generated/api'
import { GroupedPRs, LiftName } from '@/types/prs'
import { useAuth } from '@clerk/clerk-expo'
import { useQuery } from 'convex/react'
import { Chip } from 'heroui-native'
import { useState } from 'react'
import { FlatList, Pressable, Text, View } from 'react-native'


// add other rep maxes later
// recent bests
// icon adjusts by data

type SelectedChip = "all" | "olympic" | "strength"

const FILTER_CHIPS: { label: string; value: SelectedChip }[] = [
  { label: "All Lifts", value: "all" },
  { label: "Olympic", value: "olympic" },
  { label: "Strength", value: "strength" },
]

type Lifts = "Snatch" | "Clean" | "Jerk" | "Clean & Jerk" | "Back Squat" | "Front Squat"

type LiftCategory = "olympic" | "strength"

const LIFT_CARDS: { label: Lifts; value: LiftName; category: LiftCategory }[] = [
  { label: "Snatch", value: "snatch", category: "olympic" },
  { label: "Clean", value: "clean", category: "olympic" },
  { label: "Jerk", value: "jerk", category: "olympic" },
  { label: "Clean & Jerk", value: "clean_jerk", category: "olympic" },
  { label: "Back Squat", value: "back_squat", category: "strength" },
  { label: "Front Squat", value: "front_squat", category: "strength" },
]

const normalizeExerciseName = (value: string) =>
  value.toLowerCase().trim().replace(/\s+/g, " ");

const Progress = () => {
  const [chipSelected, setChipSelected] = useState("all")
  const { isSignedIn } = useAuth()
  const { coachEnabled, selectedAthlete, setSelectedAthlete, athletes } = useCoach()
  const [pickerOpen, setPickerOpen] = useState(false)

  const prData = useQuery(
    api.athletePRs.getAthletePRs,
    isSignedIn
      ? { athleteName: coachEnabled ? (selectedAthlete ?? 'maddisen') : 'maddisen' }
      : 'skip'
  )

  const recentBests = useQuery(
    api.programs.getRecentBestsForAthlete,
    isSignedIn
      ? { athleteName: coachEnabled ? (selectedAthlete ?? 'maddisen') : 'maddisen' }
      : 'skip'
  )

  const getOneRm = (p: GroupedPRs | undefined, lift: LiftName): number =>
    p?.[lift]?.["1rm"] ?? 0;

  const getRecentBest = (
    recent: Record<string, number> | undefined,
    liftLabel: string
  ): number => {
    if (!recent) return 0
    const key = normalizeExerciseName(liftLabel)
    return recent[key] ?? 0
  }

  const handleChipPressed = (filter: SelectedChip) => {
      setChipSelected(filter)
  }

  const filteredCards = LIFT_CARDS.filter(
    (card) => chipSelected === "all" || card.category === chipSelected
  )

  return (
    <View className='flex-1 bg-background'>
      <AthletePickerModal
        visible={pickerOpen}
        athletes={athletes}
        selectedAthlete={selectedAthlete}
        onSelect={setSelectedAthlete}
        onClose={() => setPickerOpen(false)}
      />
      <FlatList
        data={filteredCards}
        keyExtractor={(item) => item.value}
        contentContainerStyle={{ paddingBottom: 100 }}
        ListHeaderComponent={
          <View className='px-5 pt-16'>
            <View className="flex-row items-center justify-between">
              <View>
                <Header title="Lifting Progress" subtitle="Track your personal records" />
              </View>
              {coachEnabled && (
                <Pressable
                  onPress={() => setPickerOpen(true)}
                  className="rounded-full bg-card-background px-3 py-2"
                >
                  <Text className="text-text-title text-sm font-semibold">
                    {selectedAthlete ? selectedAthlete.charAt(0).toUpperCase() + selectedAthlete.slice(1) : 'Athlete'}
                  </Text>
                </Pressable>
              )}
            </View>

            <View className='flex-row gap-2 mt-6'>
              {FILTER_CHIPS.map(({ label, value }) => (
                <Chip
                  key={value}
                  variant={chipSelected === value ? "primary" : "soft"}
                  size="lg"
                  className="h-8"
                  onPress={() => handleChipPressed(value)}
                >
                  <Chip.Label>{label}</Chip.Label>
                </Chip>
              ))}
            </View>
          </View>
        }
        renderItem={({ item: { label, value } }) =>
          prData ? (
            <View className='px-5'>
              <ProgressCard
                exerciseName={label}
                recentBest={getRecentBest(recentBests, label)}
                pr={getOneRm(prData, value)}
              />
            </View>
          ) : (
            <View className='px-5'>
              <ProgressCard exerciseName="No PRs Found" recentBest={0} pr={0} />
            </View>
          )
        }
      />
    </View>
  )
}

export default Progress
