import ProgressCard from '@/components/ProgressCard'
import { useColors } from '@/constants/colors'
import { Chip } from 'heroui-native'
import React from 'react'
import { ScrollView, Text, View } from 'react-native'

const Progress = () => {
  const colors = useColors()
  return (
    <ScrollView className='flex-1 p-5 bg-background'>
      <Text className='mt-20 text-text-title font-bold text-4xl'>Lifting Progress</Text>
      <Text className='text-gray-500 text-lg mt-2'>Track your personal records</Text>

      <View className='flex-row gap-2 mt-6'>
        <Chip variant="primary" size="lg" className='h-8'>
          <Chip.Label>All Lifts</Chip.Label>
        </Chip>
        <Chip variant="soft" size="lg" className='h-8'>
          <Chip.Label>Olympic</Chip.Label>
        </Chip>
        <Chip variant="soft" size="lg" className='h-8'>
          <Chip.Label>Strength</Chip.Label>
        </Chip>
      </View>

      <ProgressCard exerciseName="Snatch" recentBest={120} pr={116}/>
      <ProgressCard exerciseName="Clean" recentBest={120} pr={116}/>
      <ProgressCard exerciseName="Jerk" recentBest={120} pr={116}/>
      <ProgressCard exerciseName="Clean and Jerk" recentBest={120} pr={116}/>
      <ProgressCard exerciseName="Back Squat" recentBest={120} pr={116}/>
      <ProgressCard exerciseName="Front Squat" recentBest={120} pr={116}/>

      <Text className='mt-2'></Text>
    </ScrollView>
  )
}

export default Progress