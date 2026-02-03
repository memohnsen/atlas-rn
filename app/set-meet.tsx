import { api } from '@/convex/_generated/api'
import DateTimePicker from '@react-native-community/datetimepicker'
import { useMutation, useQuery } from 'convex/react'
import { format } from 'date-fns'
import { useRouter } from 'expo-router'
import { Stack } from 'expo-router/stack'
import { useState } from 'react'
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  Text,
  TextInput,
} from 'react-native'

export default function SetMeetScreen() {
  const router = useRouter()
  const existingMeet = useQuery(api.athleteMeets.getNextMeet, {
    athleteName: 'maddisen',
  })
  const upsertMeet = useMutation(api.athleteMeets.upsertMeet)
  const deleteMeet = useMutation(api.athleteMeets.deleteMeet)

  const [meetName, setMeetName] = useState('')
  const [meetDate, setMeetDate] = useState(new Date())
  const [initialized, setInitialized] = useState(false)

  // Pre-fill from existing meet data
  if (existingMeet && !initialized) {
    setMeetName(existingMeet.meetName)
    setMeetDate(new Date(existingMeet.meetDate + 'T00:00:00'))
    setInitialized(true)
  }

  const handleSave = async () => {
    const trimmedName = meetName.trim()

    if (!trimmedName) {
      Alert.alert('Missing Info', 'Enter a meet name.')
      return
    }

    await upsertMeet({
      athleteName: 'maddisen',
      meetName: trimmedName,
      meetDate: format(meetDate, 'yyyy-MM-dd'),
    })

    router.back()
  }

  const handleDelete = () => {
    Alert.alert('Remove Meet', 'Are you sure you want to remove your scheduled meet?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Remove',
        style: 'destructive',
        onPress: async () => {
          await deleteMeet({ athleteName: 'maddisen' })
          router.back()
        },
      },
    ])
  }

  return (
    <>
      <Stack.Screen
        options={{
          title: 'Next Competition',
          headerRight: () => (
            <Pressable onPress={handleSave}>
              <Text className="items-center justify-center text-blue-energy text-base font-semibold px-2">Save</Text>
            </Pressable>
          ),
        }}
      />
      <KeyboardAvoidingView
        className="flex-1"
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <ScrollView
          className="flex-1 bg-background"
          contentContainerStyle={{ padding: 20 }}
          contentInsetAdjustmentBehavior="automatic"
          keyboardDismissMode="on-drag"
        >
          <Text className="text-gray-500 text-sm uppercase tracking-wider mb-2 ml-1">
            Meet Name
          </Text>
          <TextInput
            className="bg-card-background text-text-title text-base rounded-xl px-4 py-3.5"
            style={{ borderCurve: 'continuous' }}
            placeholder="e.g. National Championships"
            placeholderTextColor="#8E8E93"
            value={meetName}
            onChangeText={setMeetName}
            autoFocus
            returnKeyType="done"
          />

          <Text className="text-gray-500 text-sm uppercase tracking-wider mb-2 ml-1 mt-6">
            Date
          </Text>
          <DateTimePicker
            value={meetDate}
            mode="date"
            display="inline"
            minimumDate={new Date()}
            onChange={(_event, selectedDate) => {
              if (selectedDate) setMeetDate(selectedDate)
            }}
            style={{ alignSelf: 'center' }}
          />

          {existingMeet && (
            <Pressable onPress={handleDelete} className="mt-6 items-center py-3">
              <Text className="text-red-500 text-base font-medium">Remove Meet</Text>
            </Pressable>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </>
  )
}
