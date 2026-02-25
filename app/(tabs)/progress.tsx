import AthletePickerModal from '@/components/AthletePickerModal'
import { useCoach } from '@/components/CoachProvider'
import Header from '@/components/Header'
import ProgressCard from '@/components/ProgressCard'
import { useUnit } from '@/components/UnitProvider'
import { api } from '@/convex/_generated/api'
import { Program } from '@/types/program'
import { GroupedPRs, LiftName } from '@/types/prs'
import { resolveAthleteNameFromUser } from '@/utils/athleteName'
import { useAuth, useUser } from '@clerk/clerk-expo'
import { useMutation, useQuery } from 'convex/react'
import { FunctionReference } from 'convex/server'
import { Chip } from 'heroui-native'
import { useState } from 'react'
import { FlatList, Modal, Pressable, Text, TextInput, View } from 'react-native'


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

const parseWeightInput = (value: string): number => {
  const normalized = value.trim().replace(',', '.')
  const parsed = Number(normalized)
  return Number.isFinite(parsed) ? parsed : NaN
}

const getCurrentProgramForUser = "programs:getCurrentProgramForUser" as unknown as FunctionReference<"query">

const Progress = () => {
  const [chipSelected, setChipSelected] = useState("all")
  const { isSignedIn } = useAuth()
  const { user } = useUser()
  const { coachEnabled, selectedAthlete, setSelectedAthlete, athletes } = useCoach()
  const { weightUnit } = useUnit()
  const [pickerOpen, setPickerOpen] = useState(false)
  const [editOpen, setEditOpen] = useState(false)
  const [editValue, setEditValue] = useState('')
  const [editLift, setEditLift] = useState<{ label: string; value: LiftName } | null>(null)
  const upsertPR = useMutation(api.athletePRs.upsertPR)

  const currentProgram = useQuery(
    getCurrentProgramForUser,
    isSignedIn && !coachEnabled ? {} : 'skip'
  ) as Program | null | undefined
  const athleteName = coachEnabled
    ? (selectedAthlete ?? currentProgram?.athleteName)
    : (currentProgram?.athleteName ?? resolveAthleteNameFromUser(user))

  const prData = useQuery(
    api.athletePRs.getAthletePRs,
    isSignedIn && athleteName
      ? { athleteName }
      : 'skip'
  )

  const recentBests = useQuery(
    api.programs.getRecentBestsForAthlete,
    isSignedIn && athleteName
      ? { athleteName }
      : 'skip'
  )

  const toDisplayWeight = (value: number): number => {
    if (!value) return 0
    const factor = weightUnit === 'lb' ? 2.2 : 1
    const converted = value * factor
    return weightUnit === 'lb'
      ? Math.round(converted)
      : Math.round(converted * 10) / 10
  }

  const getOneRm = (p: GroupedPRs | undefined, lift: LiftName): number =>
    toDisplayWeight(p?.[lift]?.["1rm"] ?? 0);

  const getRecentBest = (
    recent: Record<string, number> | undefined,
    liftLabel: string
  ): number => {
    if (!recent) return 0
    const key = normalizeExerciseName(liftLabel)
    return toDisplayWeight(recent[key] ?? 0)
  }

  const handleChipPressed = (filter: SelectedChip) => {
      setChipSelected(filter)
  }

  const filteredCards = LIFT_CARDS.filter(
    (card) => chipSelected === "all" || card.category === chipSelected
  )

  const canEditPRs = Boolean(isSignedIn)

  const handleEditPress = (label: string, value: LiftName) => {
    const currentPr = getOneRm(prData, value)
    setEditLift({ label, value })
    setEditValue(currentPr ? String(currentPr) : '')
    setEditOpen(true)
  }

  const handleSaveEdit = async () => {
    if (!editLift || !athleteName) return
    const parsed = parseWeightInput(editValue)
    if (!Number.isFinite(parsed) || parsed <= 0) return

    const storedWeight = weightUnit === 'lb' ? parsed / 2.2 : parsed
    const normalizedWeight = Math.round(storedWeight * 10) / 10

    await upsertPR({
      athleteName,
      exerciseName: editLift.value,
      repMax: 1,
      weight: normalizedWeight,
    })

    setEditOpen(false)
  }

  const parsedEditValue = parseWeightInput(editValue)
  const canSaveEdit = Number.isFinite(parsedEditValue) && parsedEditValue > 0

  return (
    <View className='flex-1 bg-background'>
      <AthletePickerModal
        visible={pickerOpen}
        athletes={athletes}
        selectedAthlete={selectedAthlete}
        onSelect={setSelectedAthlete}
        onClose={() => setPickerOpen(false)}
      />
      <Modal visible={editOpen} transparent animationType="fade" onRequestClose={() => setEditOpen(false)}>
        <View className="flex-1 justify-center px-6">
          <Pressable className="absolute inset-0 bg-black/50" onPress={() => setEditOpen(false)} />
          <View className="rounded-2xl bg-card-background p-5">
            <Text className="text-text-title text-lg font-semibold mb-4">
              {editLift ? `Edit ${editLift.label} PR` : 'Edit PR'}
            </Text>
            <Text className="text-sm text-text-title mb-4">
              Enter your 1RM in {weightUnit === 'lb' ? 'lbs' : 'kg'}.
            </Text>
            <TextInput
              value={editValue}
              onChangeText={setEditValue}
              keyboardType="numeric"
              placeholder={`e.g. 100 ${weightUnit === 'lb' ? 'lbs' : 'kg'}`}
              placeholderTextColor="#9CA3AF"
              className="rounded-xl border border-card-border bg-background px-4 h-12 text-base text-text-title"
              style={{ textAlignVertical: 'center' }}
            />
            <View className="mt-5 flex-row justify-end gap-3">
              <Pressable
                onPress={() => setEditOpen(false)}
                className="rounded-xl px-4 py-3"
                style={{ backgroundColor: 'transparent' }}
              >
                <Text className="text-text-title text-base font-medium">Cancel</Text>
              </Pressable>
              <Pressable
                onPress={handleSaveEdit}
                disabled={!canSaveEdit}
                className="rounded-xl px-4 py-3"
                style={{ backgroundColor: canSaveEdit ? '#5386E4' : '#9CA3AF' }}
              >
                <Text className="text-white text-base font-medium">Save</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
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
          <View className='px-5'>
            <ProgressCard
              exerciseName={label}
              recentBest={getRecentBest(recentBests, label)}
              pr={getOneRm(prData, value)}
              unit={weightUnit}
              canEdit={canEditPRs}
              onEdit={() => handleEditPress(label, value)}
            />
          </View>
        }
      />
    </View>
  )
}

export default Progress
