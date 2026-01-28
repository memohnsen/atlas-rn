import Header from '@/components/Header'
import ProgressCard from '@/components/ProgressCard'
import { Chip } from 'heroui-native'
import React from 'react'
import { ScrollView, Text, View } from 'react-native'

const Progress = () => {
  return (
    <ScrollView className='flex-1 p-5 bg-background'>
      <Header title="Lifting Progress" subtitle="Track your personal records" />

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