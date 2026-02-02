import { Program } from "@/types/program";
import { getTrainingDayByDate } from "@/utils/programUtils";
import { addDays, format, startOfWeek } from "date-fns";
import { GlassView } from 'expo-glass-effect';
import { useState } from 'react';
import { Platform, Text, TouchableOpacity, View } from 'react-native';
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import Animated, { runOnJS } from "react-native-reanimated";
import DragHandle from './DragHandle';

interface DayViewButtonsProps {
  program?: Program
  selectedDate: Date
  onDateSelect: (date: Date) => void
}

const DayViewButtons = ({ program, selectedDate, onDateSelect }: DayViewButtonsProps) => {
  // State
  const [weekAnchor, setWeekAnchor] = useState(() => new Date())

  // Days row
  const weekStart = startOfWeek(weekAnchor, {weekStartsOn: 1})
  const days = Array.from({length: 7}, (_, i) => addDays(weekStart, i))
  const month = format(weekStart, "MMMM")

  const returnToToday = () => {
    setWeekAnchor(new Date())
  }

  // Interactive Circle
  const getSessionStatus = (date: Date) => {
    const result = getTrainingDayByDate(program, date)
    if (!result) return null

    return result.day.completed ? 'completed' : 'scheduled'
  }

  // Gesture handler
  const SWIPE_THRESHOLD = 40;

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
    
  return (
    <GestureDetector gesture={pan}>
      <Animated.View>
        {Platform.OS === 'ios' && 
          <GlassView style={{ borderRadius: 24}}>
            <View className="flex-row justify-between px-8 pt-14" >
              <Text className="text-text-title font-bold font text-xl">{month}</Text>
              <TouchableOpacity onPress={returnToToday}>
                <Text className="text-text-title font-bold font text-md border border-white rounded p-1">Today</Text>
              </TouchableOpacity>
            </View>
            <View className='flex-row items-center justify-between px-4 h-20'>
              {days.map((d) => {
                const status = getSessionStatus(d)
                const isSelected = format(d, 'yyyy-MM-dd') === format(selectedDate, 'yyyy-MM-dd')

                return (
                  <TouchableOpacity
                    key={format(d, "yyyy-MM-dd")}
                    className="flex-1 justify-center items-center"
                    onPress={() => onDateSelect(d)}
                  >
                    <Text className={`text-base font-semibold ${isSelected ? 'text-blue-500' : 'text-gray-500'}`}>
                      {format(d, "EEEEE")}
                    </Text>
                    <Text className={`text-base font-semibold ${isSelected ? 'text-blue-500' : 'text-gray-500'}`}>
                      {format(d, "d")}
                    </Text>

                    {status === 'completed' && <View className='w-1 h-1 rounded-full bg-green-500 mt-1' />}
                    {status === 'scheduled' && <View className='w-1 h-1 rounded-full bg-circle mt-1' />}
                    {status === null && <View className='w-1 h-1 rounded-full mt-1' />}
                  </TouchableOpacity>
                )
              })}
            </View>
            <DragHandle />
          </GlassView>
         }

         {Platform.OS === 'android' && 
            <View className='rounded-b-2xl overflow-hidden bg-day-card'>
            <View className="flex-row justify-between px-8 pt-14" >
              <Text className="text-text-title font-bold font text-xl">{month}</Text>
              <TouchableOpacity onPress={returnToToday}>
                <Text className="text-text-title font-bold font text-md border border-text-title rounded p-1">Today</Text>
              </TouchableOpacity>
            </View>
            <View className='flex-row items-center justify-between px-4 h-20'>
              {days.map((d) => {
                  const status = getSessionStatus(d)
                  const isSelected = format(d, 'yyyy-MM-dd') === format(selectedDate, 'yyyy-MM-dd')
  
                  return (
                    <TouchableOpacity
                      key={format(d, "yyyy-MM-dd")}
                      className="flex-1 justify-center items-center"
                      onPress={() => onDateSelect(d)}
                    >
                      <Text className={`text-base font-semibold ${isSelected ? 'text-blue-500' : 'text-gray-500'}`}>
                        {format(d, "EEEEE")}
                      </Text>
                      <Text className={`text-base font-semibold ${isSelected ? 'text-blue-500' : 'text-gray-500'}`}>
                        {format(d, "d")}
                      </Text>
  
                      {status === 'completed' && <View className='w-1 h-1 rounded-full bg-green-500 mt-1' />}
                      {status === 'scheduled' && <View className='w-1 h-1 rounded-full bg-circle mt-1' />}
                      {status === null && <View className='w-1 h-1 rounded-full mt-1' />}
                    </TouchableOpacity>
                  )
                })}
            </View>
            <DragHandle />
          </View>
         }
      </Animated.View>
     </GestureDetector>
  )
}

export default DayViewButtons