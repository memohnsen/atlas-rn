import { Program } from "@/types/program";
import { getTrainingDayByDate } from "@/utils/programUtils";
import { addDays, addMonths, endOfMonth, endOfWeek, format, startOfMonth, startOfWeek } from "date-fns";
import { GlassView } from 'expo-glass-effect';
import { useEffect, useMemo, useState } from 'react';
import { Platform, Text, TouchableOpacity, View } from 'react-native';
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import Animated, { Layout, runOnJS } from "react-native-reanimated";
import DragHandle from './DragHandle';

interface DayViewButtonsProps {
  program?: Program
  selectedDate: Date
  onDateSelect: (date: Date) => void
  isExpanded: boolean
  onExpandedChange: (value: boolean) => void
  coachEnabled?: boolean
  selectedAthlete?: string | null
  onOpenAthletePicker?: () => void
}

const DayViewButtons = ({
  program,
  selectedDate,
  onDateSelect,
  isExpanded,
  onExpandedChange,
  coachEnabled,
  selectedAthlete,
  onOpenAthletePicker,
}: DayViewButtonsProps) => {
  // State
  const [weekAnchor, setWeekAnchor] = useState(() => new Date())
  const [monthAnchor, setMonthAnchor] = useState(() => new Date())

  // Days row
  const weekStart = startOfWeek(weekAnchor, {weekStartsOn: 1})
  const days = Array.from({length: 7}, (_, i) => addDays(weekStart, i))
  const displayMonth = format(isExpanded ? monthAnchor : weekStart, "MMMM")
  const calendarDays = useMemo(() => {
    const monthStart = startOfMonth(monthAnchor)
    const monthEnd = endOfMonth(monthAnchor)
    const gridStart = startOfWeek(monthStart, { weekStartsOn: 1 })
    const gridEnd = endOfWeek(monthEnd, { weekStartsOn: 1 })
    const daysList: Date[] = []

    let cursor = gridStart
    while (cursor <= gridEnd) {
      daysList.push(cursor)
      cursor = addDays(cursor, 1)
    }

    return daysList
  }, [monthAnchor])

  const returnToToday = () => {
    const today = new Date()
    setWeekAnchor(today)
    setMonthAnchor(today)
    onDateSelect(today)
    onExpandedChange(false)
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
    if (isExpanded) {
      setMonthAnchor((prev) => addMonths(prev, 1))
      return
    }
    setWeekAnchor((prev) => addDays(prev, 7));
  };

  const handleSwipeRight = () => {
    if (isExpanded) {
      setMonthAnchor((prev) => addMonths(prev, -1))
      return
    }
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

  const verticalPan = Gesture.Pan()
    .activeOffsetY([-10, 10])
    .failOffsetX([-10, 10])
    .onEnd((e) => {
      if (e.translationY > SWIPE_THRESHOLD) {
        runOnJS(onExpandedChange)(true)
      } else if (e.translationY < -SWIPE_THRESHOLD) {
        runOnJS(onExpandedChange)(false)
      }
    })

  const combinedGesture = Gesture.Simultaneous(pan, verticalPan)

  useEffect(() => {
    setWeekAnchor(selectedDate)
    setMonthAnchor(selectedDate)
  }, [selectedDate])
    
  return (
    <GestureDetector gesture={combinedGesture}>
      <Animated.View layout={Layout.springify()}>
        {Platform.OS === 'ios' && 
          <GlassView style={{ borderRadius: 24}}>
            <View className="flex-row justify-between px-8 pt-14" >
              <View className="flex-row items-center" style={{ gap: 10 }}>
                {coachEnabled && (
                  <TouchableOpacity
                    onPress={onOpenAthletePicker}
                    className="rounded-full bg-card-background px-3 py-1"
                  >
                    <Text className="text-text-title font-semibold text-sm">
                      {selectedAthlete ? selectedAthlete.charAt(0).toUpperCase() + selectedAthlete.slice(1) : 'Athlete'}
                    </Text>
                  </TouchableOpacity>
                )}
                <Text className="text-text-title font-bold font text-xl">{displayMonth}</Text>
              </View>
              <TouchableOpacity onPress={returnToToday}>
                <Text className="text-text-title font-bold font text-md border border-white rounded p-1">Today</Text>
              </TouchableOpacity>
            </View>
            {!isExpanded && (
              <View className='flex-row items-center justify-between px-4 h-20 pt-2'>
                {days.map((d) => {
                  const status = getSessionStatus(d)
                  const isSelected = format(d, 'yyyy-MM-dd') === format(selectedDate, 'yyyy-MM-dd')

                  return (
                    <TouchableOpacity
                      key={format(d, "yyyy-MM-dd")}
                      className="flex-1 justify-center items-center"
                      onPress={() => {
                        onDateSelect(d)
                        onExpandedChange(false)
                      }}
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
            )}
            {isExpanded && (
              <View className="px-4 pb-4">
                <View className="flex-row justify-between mb-2 pt-2">
                  {['M', 'T', 'W', 'T', 'F', 'S', 'S'].map((label) => (
                    <Text key={label} className="text-xs text-gray-500 font-semibold" style={{ width: '14.2857%', textAlign: 'center' }}>
                      {label}
                    </Text>
                  ))}
                </View>
                <View className="flex-row flex-wrap">
                  {calendarDays.map((day) => {
                    const status = getSessionStatus(day)
                    const isSelected = format(day, 'yyyy-MM-dd') === format(selectedDate, 'yyyy-MM-dd')
                    const isInMonth = format(day, 'yyyy-MM') === format(monthAnchor, 'yyyy-MM')

                    return (
                      <TouchableOpacity
                        key={format(day, 'yyyy-MM-dd')}
                        className="items-center justify-center py-2"
                        style={{ width: '14.2857%' }}
                        onPress={() => {
                          onDateSelect(day)
                          onExpandedChange(false)
                        }}
                      >
                        <Text
                          className={`text-sm font-semibold ${isSelected ? 'text-blue-500' : isInMonth ? 'text-text-title' : 'text-gray-400'}`}
                        >
                          {format(day, 'd')}
                        </Text>
                        {status === 'completed' && <View className='w-1 h-1 rounded-full bg-green-500 mt-1' />}
                        {status === 'scheduled' && <View className='w-1 h-1 rounded-full bg-circle mt-1' />}
                        {status === null && <View className='w-1 h-1 rounded-full mt-1' />}
                      </TouchableOpacity>
                    )
                  })}
                </View>
              </View>
            )}
            <DragHandle />
          </GlassView>
         }

         {Platform.OS === 'android' && 
            <View className='rounded-b-2xl overflow-hidden bg-day-card'>
            <View className="flex-row justify-between px-8 pt-14" >
              <View className="flex-row items-center" style={{ gap: 10 }}>
                {coachEnabled && (
                  <TouchableOpacity
                    onPress={onOpenAthletePicker}
                    className="rounded-full bg-card-background px-3 py-1"
                  >
                    <Text className="text-text-title font-semibold text-sm">
                      {selectedAthlete ?? 'Athlete'}
                    </Text>
                  </TouchableOpacity>
                )}
                <Text className="text-text-title font-bold font text-xl">{displayMonth}</Text>
              </View>
              <TouchableOpacity onPress={returnToToday}>
                <Text className="text-text-title font-bold font text-md border border-text-title rounded p-1">Today</Text>
              </TouchableOpacity>
            </View>
            {!isExpanded && (
              <View className='flex-row items-center justify-between px-4 h-20 pt-2'>
                {days.map((d) => {
                  const status = getSessionStatus(d)
                  const isSelected = format(d, 'yyyy-MM-dd') === format(selectedDate, 'yyyy-MM-dd')
  
                  return (
                    <TouchableOpacity
                      key={format(d, "yyyy-MM-dd")}
                      className="flex-1 justify-center items-center"
                      onPress={() => {
                        onDateSelect(d)
                        onExpandedChange(false)
                      }}
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
            )}
            {isExpanded && (
              <View className="px-4 pb-4">
                <View className="flex-row justify-between mb-2 pt-2">
                  {['M', 'T', 'W', 'T', 'F', 'S', 'S'].map((label) => (
                    <Text key={label} className="text-xs text-gray-500 font-semibold" style={{ width: '14.2857%', textAlign: 'center' }}>
                      {label}
                    </Text>
                  ))}
                </View>
                <View className="flex-row flex-wrap">
                  {calendarDays.map((day) => {
                    const status = getSessionStatus(day)
                    const isSelected = format(day, 'yyyy-MM-dd') === format(selectedDate, 'yyyy-MM-dd')
                    const isInMonth = format(day, 'yyyy-MM') === format(monthAnchor, 'yyyy-MM')

                    return (
                      <TouchableOpacity
                        key={format(day, 'yyyy-MM-dd')}
                        className="items-center justify-center py-2"
                        style={{ width: '14.2857%' }}
                        onPress={() => {
                          onDateSelect(day)
                          onExpandedChange(false)
                        }}
                      >
                        <Text
                          className={`text-sm font-semibold ${isSelected ? 'text-blue-500' : isInMonth ? 'text-text-title' : 'text-gray-400'}`}
                        >
                          {format(day, 'd')}
                        </Text>
                        {status === 'completed' && <View className='w-1 h-1 rounded-full bg-green-500 mt-1' />}
                        {status === 'scheduled' && <View className='w-1 h-1 rounded-full bg-circle mt-1' />}
                        {status === null && <View className='w-1 h-1 rounded-full mt-1' />}
                      </TouchableOpacity>
                    )
                  })}
                </View>
              </View>
            )}
            <DragHandle />
          </View>
         }
      </Animated.View>
     </GestureDetector>
  )
}

export default DayViewButtons
