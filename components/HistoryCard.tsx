import Ionicons from '@expo/vector-icons/Ionicons'
import { Card } from 'heroui-native'
import React from 'react'
import { Text, View } from 'react-native'

interface HistoryCardProps {
    weekNum: number
    dayNum: number
    mainExercise: string
    day: string
    month: string
  }
  
  const HistoryCard = ({ weekNum, dayNum, mainExercise, day, month }: HistoryCardProps) => {
    return (
      <Card className='mt-4 bg-card-background'>
          <Card.Body>
            <View className='flex-row'>
                <View className='flex-1 w-1 bg-blue-energy/20 py-1 justify-center align-center items-center rounded-xl'>
                  <Text className='text-text-title font-bold mb-2 text-3xl'>{day}</Text>
                  <Text className='text-gray-500 font-bold'>{month}</Text>
                </View>
                <View className='ml-4 w-2/3 justify-center'>
                    <Text className='text-blue-energy text-lg font-bold mb-2'>Week {weekNum} • Day {dayNum}</Text>
                    <Text className='text-text-title text-lg font-bold'>{mainExercise}</Text>
                </View>
                <View className='justify-center'>
                    <Ionicons name="chevron-forward" size={24} color="gray" />
                </View>
            </View>
          </Card.Body>
        </Card>
    )
  }

export default HistoryCard

