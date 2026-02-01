import { GlassView } from 'expo-glass-effect';
import React from 'react';
import { Platform, Text, View } from 'react-native';
import DragHandle from './DragHandle';

const DayViewButtons = () => {
  if (Platform.OS === 'android') {
    return (
      <View className='rounded-b-2xl overflow-hidden bg-background'>
        <View className='flex-row items-center justify-between px-4 pt-14 h-34'>
          <View className='flex-1 justify-center items-center'>
            <Text className='text-base font-semibold text-gray-500'>M</Text>
            <Text className='text-base font-semibold text-gray-500'>11</Text>
            <View className='w-2 h-2 rounded bg-green-600 mt-1' />
          </View>
          <View className='flex-1 justify-center items-center'>
            <Text className='text-base font-semibold text-gray-500'>T</Text>
            <Text className='text-base font-semibold text-gray-500'>12</Text>
            <View className='w-2 h-2 rounded bg-green-600 mt-1' />
          </View>
          <View className='flex-1 justify-center items-center'>
            <Text className='text-base font-semibold text-gray-500'>W</Text>
            <Text className='text-base font-semibold text-gray-500'>13</Text>
            <View className='w-2 h-2 rounded bg-green-600 mt-1' />
          </View>
          <View className='flex-1 justify-center items-center'>
            <Text className='text-base font-semibold text-gray-500'>T</Text>
            <Text className='text-base font-semibold text-gray-500'>14</Text>
            <View className='h-3'></View>
          </View>
          <View className='flex-1 justify-center items-center'>
            <Text className='text-base font-semibold text-gray-500'>F</Text>
            <Text className='text-base font-semibold text-gray-500'>15</Text>
            <View className='w-2 h-2 rounded bg-white mt-1' />
          </View>
          <View className='flex-1 justify-center items-center'>
            <Text className='text-base font-semibold text-gray-500'>S</Text>
            <Text className='text-base font-semibold text-gray-500'>16</Text>
            <View className='w-2 h-2 rounded bg-white mt-1' />
          </View>
          <View className='flex-1 justify-center items-center'>
            <Text className='text-base font-semibold text-gray-500'>S</Text>
            <Text className='text-base font-semibold text-gray-500'>17</Text>
            <View className='h-3'></View>
          </View>
        </View>
        <DragHandle />
      </View>
    )
  }

  return (
    <GlassView style={{ borderRadius: 24}}>
      <View className='flex-row items-center justify-between px-4 pt-14 h-34'>
        <View className='flex-1 justify-center items-center'>
          <Text className='text-base font-semibold text-gray-500'>M</Text>
          <Text className='text-base font-semibold text-gray-500'>11</Text>
          <View className='w-2 h-2 rounded bg-green-600 mt-1' />
        </View>
        <View className='flex-1 justify-center items-center'>
          <Text className='text-base font-semibold text-gray-500'>T</Text>
          <Text className='text-base font-semibold text-gray-500'>12</Text>
          <View className='w-2 h-2 rounded bg-green-600 mt-1' />
        </View>
        <View className='flex-1 justify-center items-center'>
          <Text className='text-base font-semibold text-gray-500'>W</Text>
          <Text className='text-base font-semibold text-gray-500'>13</Text>
          <View className='w-2 h-2 rounded bg-green-600 mt-1' />
        </View>
        <View className='flex-1 justify-center items-center'>
          <Text className='text-base font-semibold text-gray-500'>T</Text>
          <Text className='text-base font-semibold text-gray-500'>14</Text>
          <View className='h-3'></View>
        </View>
        <View className='flex-1 justify-center items-center'>
          <Text className='text-base font-semibold text-gray-500'>F</Text>
          <Text className='text-base font-semibold text-gray-500'>15</Text>
          <View className='w-2 h-2 rounded bg-white mt-1' />
        </View>
        <View className='flex-1 justify-center items-center'>
          <Text className='text-base font-semibold text-gray-500'>S</Text>
          <Text className='text-base font-semibold text-gray-500'>16</Text>
          <View className='w-2 h-2 rounded bg-white mt-1' />
        </View>
        <View className='flex-1 justify-center items-center'>
          <Text className='text-base font-semibold text-gray-500'>S</Text>
          <Text className='text-base font-semibold text-gray-500'>17</Text>
          <View className='h-3'></View>
        </View>
      </View>
      <DragHandle />
    </GlassView>
  )
}

export default DayViewButtons