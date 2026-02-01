import Ionicons from '@expo/vector-icons/Ionicons'
import { Card, Divider } from 'heroui-native'
import React from 'react'
import { View } from 'react-native'

interface ProgressCardProps {
  exerciseName: string
  recentBest: number
  pr: number
}

const ProgressCard = ({ exerciseName, recentBest, pr }: ProgressCardProps) => {
  return (
    <Card className='mt-4 bg-card-background'>
        <Card.Body>
          <View className='flex-row justify-between mb-2'>
            <Card.Title className='text-2xl font-bold'>{exerciseName}</Card.Title>
            <Ionicons name="arrow-up-circle" size={32} color="green" />
          </View>
          <Divider />
          <View className='flex-row justify-between my-2'>
            <Card.Description className='mt-2'>Recent Best</Card.Description>
            <Card.Description className='mt-2'>PR</Card.Description>
          </View>
          <View className='flex-row justify-between'>
            <Card.Title className='mb-2 text-2xl font-bold text-blue-energy'>{recentBest}kg</Card.Title>
            <Card.Title className='mb-2 text-2xl font-bold'>{pr}kg</Card.Title>
          </View>
        </Card.Body>
      </Card>
  )
}

export default ProgressCard
