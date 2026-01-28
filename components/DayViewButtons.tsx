import { GlassView } from 'expo-glass-effect'
import React from 'react'
import { Platform, Text, View } from 'react-native'

const DayViewButtons = () => {
  if (Platform.OS !== 'ios') {
    return null
  }

  return (
    <GlassView style={{ borderRadius: 999}}>
      <View className='flex-row items-center justify-between px-8 pt-12 h-32'>
        <Text className='text-base font-semibold text-gray-500'>11</Text>
        <Text className='text-base font-semibold text-gray-500'>12</Text>
        <Text className='text-base font-semibold text-gray-500'>13</Text>
        <Text className='text-base font-semibold text-gray-500'>14</Text>
        <Text className='text-base font-semibold text-gray-500'>15</Text>
        <Text className='text-base font-semibold text-gray-500'>16</Text>
        <Text className='text-base font-semibold text-gray-500'>17</Text>
      </View>
    </GlassView>
  )
}

export default DayViewButtons