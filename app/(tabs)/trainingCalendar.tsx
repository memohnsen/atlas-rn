import DayViewButtons from '@/components/DayViewButtons'
import LiquidGlassButton from '@/components/LiquidGlassButton'
import WorkoutSchemeCard from '@/components/WorkoutSchemeCard'
import React from 'react'
import { ScrollView, Text, View } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'

const TrainingCalendar = () => {
  const insets = useSafeAreaInsets()

  return (
    <View className='flex-1'>
      <View className='absolute top-0 left-0 right-0 z-10'>
        <DayViewButtons />
      </View>
      <ScrollView className='bg-background p-4'  contentContainerStyle={{ paddingBottom: 100 }} style={{ paddingTop: insets.top + 100}}>
        <View className="flex flex-row items-center justify-between mb-4">
          <View className='flex-1 justify-center'>
            <Text className='text-text-title font-bold text-xl'>Day 1 - Snatch</Text>
            <Text className='text-gray-500 text-md mt-1'>4-Day Template</Text>
          </View>
          <View className='flex-row gap-x-2'>
            <LiquidGlassButton icon='checkmark' iconSize={24} height={40} width={40} iconColor='green' />
            <LiquidGlassButton icon='ellipsis-horizontal' iconSize={24} height={40} width={40} iconColor='teal'/>
          </View>
        </View>
        <WorkoutSchemeCard exerciseName='Snatch' />
        <WorkoutSchemeCard exerciseName='Back Squat' />
      </ScrollView>
    </View>
  )
}

export default TrainingCalendar