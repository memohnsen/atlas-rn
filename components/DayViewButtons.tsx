import { addDays, format, startOfWeek } from "date-fns";
import { GlassView } from 'expo-glass-effect';
import React, { useState } from 'react';
import { Platform, Text, TouchableOpacity, View } from 'react-native';
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import Animated, { runOnJS } from "react-native-reanimated";
import DragHandle from './DragHandle';

const DayViewButtons = () => {
  // State
  const [weekAnchor, setWeekAnchor] = useState(() => new Date())

  // Days row
  const weekStart = startOfWeek(weekAnchor, {weekStartsOn: 1})
  const days = Array.from({length: 7}, (_, i) => addDays(weekStart, i))
  const month = format(weekStart, "MMMM")

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
            <View className="flex-row justify-between px-8 pt-14" >
              <Text className="text-text-title font-bold font text-xl">{month}</Text>
              <TouchableOpacity>
                <Text className="text-text-title font-bold font text-md border border-white rounded p-1">Today</Text>
              </TouchableOpacity>
            </View>
            <View className='flex-row items-center justify-between px-4 h-20'>
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
    <GestureDetector gesture={pan}>
      <Animated.View>
        <GlassView style={{ borderRadius: 24}}>
          <View className="flex-row justify-between px-8 pt-14" >
            <Text className="text-text-title font-bold font text-xl">{month}</Text>
            <TouchableOpacity>
              <Text className="text-text-title font-bold font text-md border border-white rounded p-1">Today</Text>
            </TouchableOpacity>
          </View>
          <View className='flex-row items-center justify-between px-4 h-20'>
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
        </GlassView>
      </Animated.View>
     </GestureDetector>
  )
}

export default DayViewButtons