import { addDays, format, startOfWeek } from "date-fns";
import { GlassView } from 'expo-glass-effect';
import React, { useState } from 'react';
import { Platform, Text, View } from 'react-native';
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import Animated, { runOnJS } from "react-native-reanimated";
import DragHandle from './DragHandle';

const DayViewButtons = () => {
  // State
  const [weekAnchor, setWeekAnchor] = useState(() => new Date())

  // Days row
  const weekStart = startOfWeek(weekAnchor, {weekStartsOn: 1})
  const days = Array.from({length: 7}, (_, i) => addDays(weekStart, i))

  // Gesture handler
  const SWIPE_THRESHOLD = 40; // px-ish; tweak

  const handleSwipeLeft = () => {
    setWeekAnchor((prev) => addDays(prev, 7));
  };

  const handleSwipeRight = () => {
    setWeekAnchor((prev) => addDays(prev, -7));
  };

  const pan = Gesture.Pan()
    .activeOffsetX([-10, 10]) // don't activate on tiny movement
    .failOffsetY([-10, 10])   // ignore vertical-ish drags
    .onEnd((e) => {
      if (e.translationX < -SWIPE_THRESHOLD) {
        runOnJS(handleSwipeLeft)();
      } else if (e.translationX > SWIPE_THRESHOLD) {
        runOnJS(handleSwipeRight)();
      }
    });

  if (Platform.OS === 'android') {
    return (
      <GestureDetector gesture={pan}>
        <Animated.View>
          <View className='rounded-b-2xl overflow-hidden bg-background'>
            <View className='flex-row items-center justify-between px-4 pt-14 h-34'>
              {days.map((d) => (
                <View key={format(d, "yyyy-MM-dd")} className="flex-1 justify-center items-center">
                  <Text className="text-base font-semibold text-gray-500">{format(d, "EEEEE")}</Text>
                  <Text className="text-base font-semibold text-gray-500">{format(d, "d")}</Text>

                  {/* show white dot if session uncompleted, green if completed, nil if nothing */}
                  <View className='w-2 h-2 rounded bg-white mt-1' />
                </View>
              ))}
            </View>
            <DragHandle />
          </View>
        </Animated.View>
      </GestureDetector>
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