import DayViewButtons from '@/components/DayViewButtons'
import WorkoutSchemeCard from '@/components/WorkoutSchemeCard'
import React from 'react'
import { ScrollView, Text, View } from 'react-native'

const TrainingCalendar = () => {
  return (
    <View className='flex-1'>
      <View className='absolute top-0 left-0 right-0 z-10'>
        <DayViewButtons />
      </View>
      <ScrollView className='bg-background p-4' contentContainerStyle={{ paddingTop: 80, paddingBottom: 80 }}>
        <Text className='text-text-title font-bold text-xl'>Day 1 - Snatch</Text>
        <Text className='text-gray-500 text-md mt-1 mb-4'>4-Day Template</Text>
        <WorkoutSchemeCard exerciseName='Snatch' />
        <WorkoutSchemeCard exerciseName='Back Squat' />
      </ScrollView>
    </View>
  )
}

export default TrainingCalendar