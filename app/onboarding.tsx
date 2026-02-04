import { useOnboarding } from '@/components/OnboardingProvider'
import { useUnit, type WeightUnit } from '@/components/UnitProvider'
import { api } from '@/convex/_generated/api'
import type { LiftName } from '@/types/prs'
import DateTimePicker from '@react-native-community/datetimepicker'
import { useMutation } from 'convex/react'
import { format } from 'date-fns'
import * as Haptics from 'expo-haptics'
import { useRouter } from 'expo-router'
import { Stack } from 'expo-router/stack'
import { useCallback, useRef, useState } from 'react'
import {
  Dimensions,
  FlatList,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
  type ViewToken,
} from 'react-native'
import Animated, { FadeIn, FadeInDown, FadeInUp, FadeOut } from 'react-native-reanimated'

const { width: SCREEN_WIDTH } = Dimensions.get('window')

const LIFTS: { label: string; value: LiftName; category: string }[] = [
  { label: 'Snatch', value: 'snatch', category: 'Olympic' },
  { label: 'Clean', value: 'clean', category: 'Olympic' },
  { label: 'Jerk', value: 'jerk', category: 'Olympic' },
  { label: 'Clean & Jerk', value: 'clean_jerk', category: 'Olympic' },
  { label: 'Back Squat', value: 'back_squat', category: 'Strength' },
  { label: 'Front Squat', value: 'front_squat', category: 'Strength' },
]

const FEATURES = [
  {
    icon: '📋',
    title: 'Personalized Programs',
    description: 'Follow coach-built training programs tailored to your goals',
  },
  {
    icon: '📊',
    title: 'Track Your PRs',
    description: 'Log and monitor personal records across all your lifts',
  },
  {
    icon: '🏆',
    title: 'Meet Countdown',
    description: 'Stay focused with a countdown to your next competition',
  },
  {
    icon: '📖',
    title: 'Exercise Library',
    description: 'Access a comprehensive library with video demonstrations',
  },
]

const TOTAL_STEPS = 4

export default function OnboardingScreen() {
  const router = useRouter()
  const { completeOnboarding } = useOnboarding()
  const { weightUnit, setWeightUnit } = useUnit()
  const upsertMeet = useMutation(api.athleteMeets.upsertMeet)
  const bulkUpsertPRs = useMutation(api.athletePRs.bulkUpsertPRs)

  const [step, setStep] = useState(0)
  const flatListRef = useRef<FlatList>(null)

  // Weight unit state
  const [selectedUnit, setSelectedUnit] = useState<WeightUnit>(weightUnit)

  // Meet state
  const [meetName, setMeetName] = useState('')
  const [meetDate, setMeetDate] = useState(new Date())

  // PR state
  const [prValues, setPrValues] = useState<Record<LiftName, string>>({
    snatch: '',
    clean: '',
    jerk: '',
    clean_jerk: '',
    back_squat: '',
    front_squat: '',
  })

  const goToStep = useCallback(
    (nextStep: number) => {
      if (process.env.EXPO_OS === 'ios') {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
      }
      flatListRef.current?.scrollToIndex({ index: nextStep, animated: true })
      setStep(nextStep)
    },
    []
  )

  const handleNext = useCallback(() => {
    if (step === 1) {
      // Save weight unit when leaving step 1
      setWeightUnit(selectedUnit)
    }
    if (step < TOTAL_STEPS - 1) {
      goToStep(step + 1)
    }
  }, [step, selectedUnit, setWeightUnit, goToStep])

  const handleFinish = useCallback(async () => {
    if (process.env.EXPO_OS === 'ios') {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)
    }

    // Save weight unit
    setWeightUnit(selectedUnit)

    // Save meet if name provided
    if (meetName.trim()) {
      await upsertMeet({
        athleteName: 'maddisen',
        meetName: meetName.trim(),
        meetDate: format(meetDate, 'yyyy-MM-dd'),
      })
    }

    // Save PRs (only those with values)
    const prsToSave = LIFTS.filter((lift) => {
      const val = Number(prValues[lift.value])
      return Number.isFinite(val) && val > 0
    }).map((lift) => {
      const parsed = Number(prValues[lift.value])
      const storedWeight = selectedUnit === 'lb' ? parsed / 2.2 : parsed
      return {
        exerciseName: lift.value,
        repMax: 1,
        weight: Math.round(storedWeight * 10) / 10,
      }
    })

    if (prsToSave.length > 0) {
      await bulkUpsertPRs({
        athleteName: 'maddisen',
        prs: prsToSave,
      })
    }

    completeOnboarding()
    router.replace('/(tabs)')
  }, [selectedUnit, meetName, meetDate, prValues, setWeightUnit, upsertMeet, bulkUpsertPRs, completeOnboarding, router])

  const onViewableItemsChanged = useRef(
    ({ viewableItems }: { viewableItems: ViewToken[] }) => {
      if (viewableItems.length > 0 && viewableItems[0].index !== null) {
        setStep(viewableItems[0].index)
      }
    }
  ).current

  const renderStep = useCallback(
    ({ index }: { item: number; index: number }) => {
      switch (index) {
        case 0:
          return <WelcomeStep />
        case 1:
          return (
            <UnitStep
              selectedUnit={selectedUnit}
              onSelect={setSelectedUnit}
            />
          )
        case 2:
          return (
            <MeetStep
              meetName={meetName}
              meetDate={meetDate}
              onNameChange={setMeetName}
              onDateChange={setMeetDate}
            />
          )
        case 3:
          return (
            <PRStep
              prValues={prValues}
              onPrChange={(lift, val) =>
                setPrValues((prev) => ({ ...prev, [lift]: val }))
              }
              unit={selectedUnit}
            />
          )
        default:
          return null
      }
    },
    [selectedUnit, meetName, meetDate, prValues]
  )

  const isLastStep = step === TOTAL_STEPS - 1
  const canSkipMeet = step === 2
  const canSkipPRs = step === 3

  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <View className="flex-1 bg-background">
        {/* Progress dots */}
        <Animated.View
          entering={FadeIn.delay(300).duration(400)}
          className="flex-row justify-center pt-16 pb-4"
          style={{ gap: 8 }}
        >
          {Array.from({ length: TOTAL_STEPS }).map((_, i) => (
            <View
              key={i}
              style={{
                width: i === step ? 24 : 8,
                height: 8,
                borderRadius: 4,
                backgroundColor: i === step ? '#5386E4' : i < step ? 'rgba(83, 134, 228, 0.4)' : 'rgba(142, 142, 147, 0.3)',
                borderCurve: 'continuous',
              }}
            />
          ))}
        </Animated.View>

        {/* Content */}
        <FlatList
          ref={flatListRef}
          data={[0, 1, 2, 3]}
          horizontal
          pagingEnabled
          scrollEnabled={false}
          showsHorizontalScrollIndicator={false}
          keyExtractor={(item) => String(item)}
          renderItem={renderStep}
          onViewableItemsChanged={onViewableItemsChanged}
          viewabilityConfig={{ viewAreaCoveragePercentThreshold: 50 }}
          getItemLayout={(_, index) => ({
            length: SCREEN_WIDTH,
            offset: SCREEN_WIDTH * index,
            index,
          })}
        />

        {/* Bottom buttons */}
        <Animated.View
          entering={FadeInUp.delay(400).duration(400)}
          className="px-6 pb-12"
          style={{ gap: 12 }}
        >
          {(canSkipMeet || canSkipPRs) && (
            <Pressable
              onPress={isLastStep ? handleFinish : handleNext}
              className="items-center py-2"
            >
              <Text className="text-gray-500 text-base font-medium">
                Skip for now
              </Text>
            </Pressable>
          )}
          <Pressable
            onPress={isLastStep ? handleFinish : handleNext}
            className="items-center justify-center rounded-2xl py-4"
            style={{
              backgroundColor: '#5386E4',
              borderCurve: 'continuous',
            }}
          >
            <Text className="text-white text-[17px] font-semibold">
              {isLastStep ? 'Get Started' : 'Continue'}
            </Text>
          </Pressable>
        </Animated.View>
      </View>
    </>
  )
}

// Step 0: Welcome & Features
function WelcomeStep() {
  return (
    <View style={{ width: SCREEN_WIDTH }} className="flex-1 px-6 justify-center">
      <Animated.View entering={FadeInDown.duration(500).springify().damping(18)}>
        <View className="items-center mb-10">
          <View
            className="h-20 w-20 items-center justify-center rounded-2xl mb-5"
            style={{ backgroundColor: '#5386E4', borderCurve: 'continuous' }}
          >
            <Text className="text-4xl font-extrabold text-white">A</Text>
          </View>
          <Text className="text-text-title text-[28px] font-bold text-center">
            Welcome to Atlas
          </Text>
          <Text className="text-gray-500 text-base mt-2 text-center leading-6">
            Everything you need to train smarter
          </Text>
        </View>
      </Animated.View>

      <View style={{ gap: 16 }}>
        {FEATURES.map((feature, index) => (
          <Animated.View
            key={feature.title}
            entering={FadeInDown.delay(150 + index * 100)
              .duration(400)
              .springify()
              .damping(18)}
          >
            <View
              className="flex-row items-center rounded-2xl bg-card-background px-4 py-4"
              style={{ gap: 14, borderCurve: 'continuous' }}
            >
              <View
                className="h-11 w-11 items-center justify-center rounded-xl"
                style={{ backgroundColor: 'rgba(83, 134, 228, 0.1)', borderCurve: 'continuous' }}
              >
                <Text style={{ fontSize: 22 }}>{feature.icon}</Text>
              </View>
              <View className="flex-1">
                <Text className="text-text-title text-base font-semibold">
                  {feature.title}
                </Text>
                <Text className="text-gray-500 text-sm mt-0.5" numberOfLines={2}>
                  {feature.description}
                </Text>
              </View>
            </View>
          </Animated.View>
        ))}
      </View>
    </View>
  )
}

// Step 1: Weight Unit Selection
function UnitStep({
  selectedUnit,
  onSelect,
}: {
  selectedUnit: WeightUnit
  onSelect: (unit: WeightUnit) => void
}) {
  const handleSelect = (unit: WeightUnit) => {
    if (process.env.EXPO_OS === 'ios') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
    }
    onSelect(unit)
  }

  return (
    <View style={{ width: SCREEN_WIDTH }} className="flex-1 px-6 justify-center">
      <Animated.View entering={FadeInDown.duration(500).springify().damping(18)}>
        <Text className="text-text-title text-[28px] font-bold text-center">
          Choose Your Units
        </Text>
        <Text className="text-gray-500 text-base mt-2 text-center leading-6">
          Select how you want weights displayed
        </Text>
      </Animated.View>

      <View className="mt-10" style={{ gap: 12 }}>
        {([
          { value: 'kg' as WeightUnit, label: 'Kilograms', abbr: 'KG' },
          { value: 'lb' as WeightUnit, label: 'Pounds', abbr: 'LB' },
        ]).map((option, index) => {
          const isSelected = option.value === selectedUnit
          return (
            <Animated.View
              key={option.value}
              entering={FadeInDown.delay(200 + index * 100).duration(400).springify().damping(18)}
            >
              <Pressable
                onPress={() => handleSelect(option.value)}
                className="flex-row items-center justify-between rounded-2xl px-5 py-5"
                style={{
                  backgroundColor: isSelected ? 'rgba(83, 134, 228, 0.12)' : undefined,
                  borderWidth: 2,
                  borderColor: isSelected ? '#5386E4' : 'rgba(142, 142, 147, 0.2)',
                  borderCurve: 'continuous',
                }}
              >
                <View>
                  <Text className="text-text-title text-lg font-semibold">
                    {option.label}
                  </Text>
                  <Text className="text-gray-500 text-sm mt-0.5">
                    Display weights in {option.abbr}
                  </Text>
                </View>
                <View
                  className="h-10 w-10 items-center justify-center rounded-full"
                  style={{
                    backgroundColor: isSelected ? '#5386E4' : 'rgba(142, 142, 147, 0.15)',
                  }}
                >
                  <Text
                    className="text-sm font-bold"
                    style={{ color: isSelected ? '#FFFFFF' : '#8E8E93' }}
                  >
                    {option.abbr}
                  </Text>
                </View>
              </Pressable>
            </Animated.View>
          )
        })}
      </View>

      <Animated.View entering={FadeIn.delay(500).duration(400)}>
        <Text className="text-gray-500 text-sm text-center mt-6">
          You can change this anytime in Settings
        </Text>
      </Animated.View>
    </View>
  )
}

// Step 2: Meet Setup
function MeetStep({
  meetName,
  meetDate,
  onNameChange,
  onDateChange,
}: {
  meetName: string
  meetDate: Date
  onNameChange: (name: string) => void
  onDateChange: (date: Date) => void
}) {
  return (
    <View style={{ width: SCREEN_WIDTH }} className="flex-1">
      <ScrollView
        contentContainerStyle={{ paddingHorizontal: 24, paddingTop: 8, paddingBottom: 40 }}
        keyboardDismissMode="on-drag"
      >
        <Animated.View entering={FadeInDown.duration(500).springify().damping(18)}>
          <Text className="text-text-title text-[28px] font-bold text-center">
            Next Competition
          </Text>
          <Text className="text-gray-500 text-base mt-2 text-center leading-6">
            Set your upcoming meet to stay on track
          </Text>
        </Animated.View>

        <Animated.View
          entering={FadeInDown.delay(200).duration(400).springify().damping(18)}
          className="mt-8"
        >
          <Text className="text-gray-500 text-sm uppercase tracking-wider mb-2 ml-1">
            Meet Name
          </Text>
          <TextInput
            className="bg-card-background text-text-title text-base rounded-xl px-4 py-3.5"
            style={{ borderCurve: 'continuous' }}
            placeholder="e.g. National Championships"
            placeholderTextColor="#8E8E93"
            value={meetName}
            onChangeText={onNameChange}
            returnKeyType="done"
          />
        </Animated.View>

        <Animated.View
          entering={FadeInDown.delay(300).duration(400).springify().damping(18)}
          className="mt-6"
        >
          <Text className="text-gray-500 text-sm uppercase tracking-wider mb-2 ml-1">
            Date
          </Text>
          <DateTimePicker
            value={meetDate}
            mode="date"
            display="inline"
            minimumDate={new Date()}
            onChange={(_event, selectedDate) => {
              if (selectedDate) onDateChange(selectedDate)
            }}
            style={{ alignSelf: 'center' }}
          />
        </Animated.View>
      </ScrollView>
    </View>
  )
}

// Step 3: PR Entry
function PRStep({
  prValues,
  onPrChange,
  unit,
}: {
  prValues: Record<LiftName, string>
  onPrChange: (lift: LiftName, value: string) => void
  unit: WeightUnit
}) {
  const unitLabel = unit === 'lb' ? 'lbs' : 'kg'

  return (
    <View style={{ width: SCREEN_WIDTH }} className="flex-1">
      <ScrollView
        contentContainerStyle={{ paddingHorizontal: 24, paddingTop: 8, paddingBottom: 40 }}
        keyboardDismissMode="on-drag"
      >
        <Animated.View entering={FadeInDown.duration(500).springify().damping(18)}>
          <Text className="text-text-title text-[28px] font-bold text-center">
            Your Current PRs
          </Text>
          <Text className="text-gray-500 text-base mt-2 text-center leading-6">
            Enter your 1-rep maxes to track progress
          </Text>
        </Animated.View>

        <View className="mt-8" style={{ gap: 12 }}>
          {LIFTS.map((lift, index) => (
            <Animated.View
              key={lift.value}
              entering={FadeInDown.delay(150 + index * 60)
                .duration(400)
                .springify()
                .damping(18)}
            >
              <View
                className="flex-row items-center justify-between rounded-2xl bg-card-background px-4 py-3"
                style={{ borderCurve: 'continuous' }}
              >
                <View className="flex-1 mr-3">
                  <Text className="text-text-title text-base font-semibold">
                    {lift.label}
                  </Text>
                  <Text className="text-gray-500 text-xs mt-0.5">
                    {lift.category}
                  </Text>
                </View>
                <View className="flex-row items-center" style={{ gap: 6 }}>
                  <TextInput
                    value={prValues[lift.value]}
                    onChangeText={(val) => onPrChange(lift.value, val)}
                    keyboardType="numeric"
                    placeholder="0"
                    placeholderTextColor="#8E8E93"
                    className="bg-background text-text-title text-base rounded-xl px-3 h-11 text-right"
                    style={{
                      width: 80,
                      borderCurve: 'continuous',
                      fontVariant: ['tabular-nums'],
                    }}
                  />
                  <Text className="text-gray-500 text-sm font-medium" style={{ width: 24 }}>
                    {unitLabel}
                  </Text>
                </View>
              </View>
            </Animated.View>
          ))}
        </View>

        <Animated.View entering={FadeIn.delay(600).duration(400)}>
          <Text className="text-gray-500 text-sm text-center mt-6">
            Leave blank if you're not sure — you can update these later
          </Text>
        </Animated.View>
      </ScrollView>
    </View>
  )
}
