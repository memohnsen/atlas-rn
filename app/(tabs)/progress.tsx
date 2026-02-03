import Header from '@/components/Header'
import ProgressCard from '@/components/ProgressCard'
import { api } from '@/convex/_generated/api'
import { GroupedPRs, LiftName } from '@/types/prs'
import { useQuery } from 'convex/react'
import { Chip } from 'heroui-native'
import { useState } from 'react'
import { Platform, ScrollView, View } from 'react-native'


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

  const prData = useQuery(api.athletePRs.getAthletePRs, {
    athleteName: 'maddisen'
  })

  const recentBests = useQuery(api.programs.getRecentBestsForAthlete, {
    athleteName: 'maddisen',
  })

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
    <ScrollView className='flex-1 p-5 bg-background' contentContainerStyle={{ paddingBottom: 20 }}>
      {Platform.OS === 'android' && <View className='h-20' />}
      <Header title="Lifting Progress" subtitle="Track your personal records" />

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

      {prData ? (
        filteredCards.map(({ label, value }) => (
          <ProgressCard
            key={value}
            exerciseName={label}
            recentBest={getRecentBest(recentBests, label)}
            pr={getOneRm(prData, value)}
          />
        ))
      ) : (
        <ProgressCard exerciseName="No PRs Found" recentBest={0} pr={0}/>
      )}

      {Platform.OS === 'android' &&
         <View style={{ height: 120 }} /> 
      }
    </ScrollView>
  )
}

export default Progress
