import Header from '@/components/Header'
import { api } from '@/convex/_generated/api'
import type { Doc } from '@/convex/_generated/dataModel'
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons'
import { useQuery } from 'convex/react'
import { Chip } from 'heroui-native'
import { useMemo, useState } from 'react'
import { Alert, FlatList, Linking, Pressable, Text, TextInput, View } from 'react-native'

const ExerciseLibrary = () => {
  const [searchTerm, setSearchTerm] = useState('')
  const [filtersOpen, setFiltersOpen] = useState(false)
  const [primaryFilter, setPrimaryFilter] = useState<string | null>(null)
  const [secondaryFilter, setSecondaryFilter] = useState<string | null>(null)

  const libraryData = useQuery(api.exerciseLibrary.getAllExercises, {
    offset: 0,
    limit: 5000,
  })

  const exercises = (libraryData?.exercises ?? []) as Doc<'exerciseLibrary'>[]
  const totalCount = exercises.length

  const primaryOptions = useMemo(() => {
    const values = new Set<string>()
    exercises.forEach((exercise) => {
      if (exercise.primary) values.add(exercise.primary)
    })
    return Array.from(values).sort((a, b) => a.localeCompare(b))
  }, [exercises])

  const secondaryOptions = useMemo(() => {
    const values = new Set<string>()
    exercises.forEach((exercise) => {
      if (exercise.secondary) values.add(exercise.secondary)
    })
    return Array.from(values).sort((a, b) => a.localeCompare(b))
  }, [exercises])

  const filteredExercises = useMemo(() => {
    const normalizedSearch = searchTerm.trim().toLowerCase()
    const applySearch = normalizedSearch.length >= 3

    return exercises.filter((exercise) => {
      const matchesSearch = applySearch
        ? exercise.name.toLowerCase().includes(normalizedSearch)
        : true
      const matchesPrimary = primaryFilter
        ? exercise.primary?.toLowerCase() === primaryFilter.toLowerCase()
        : true
      const matchesSecondary = secondaryFilter
        ? exercise.secondary?.toLowerCase() === secondaryFilter.toLowerCase()
        : true

      return matchesSearch && matchesPrimary && matchesSecondary
    })
  }, [exercises, primaryFilter, searchTerm, secondaryFilter])

  const subtitle = useMemo(() => {
    const activeFilters = Boolean(primaryFilter || secondaryFilter)
    const isSearching = searchTerm.trim().length >= 3

    if (activeFilters || isSearching) {
      return `Showing ${filteredExercises.length} of ${totalCount} exercises`
    }

    return `${totalCount} exercises`
  }, [filteredExercises.length, primaryFilter, searchTerm, secondaryFilter, totalCount])

  const handleOpenLink = async (link?: string) => {
    if (!link) return
    try {
      await Linking.openURL(link)
    } catch (error) {
      console.error('Failed to open exercise link', error)
      Alert.alert('Link unavailable', 'Unable to open this link right now.')
    }
  }

  return (
    <View className='flex-1 bg-background'>
      <FlatList
        data={filteredExercises}
        keyExtractor={(exercise) => `${exercise._id}`}
        contentContainerStyle={{ paddingBottom: 100 }}
        ListHeaderComponent={
          <View className='px-5 pt-16'>
            <Header title="Exercise Library" subtitle={subtitle} />

            <View className='mt-6 flex-row items-center gap-3'>
              <View className='flex-1 flex-row items-center rounded-2xl bg-card-background px-4 py-3'>
                <MaterialCommunityIcons name="magnify" size={16} color="#6B7280" />
                <TextInput
                  placeholder="Search exercises"
                  placeholderTextColor="#6B7280"
                  value={searchTerm}
                  onChangeText={setSearchTerm}
                  className='ml-2 flex-1 text-base text-text-title'
                />
              </View>
              <Pressable
                className='flex-row items-center gap-2 rounded-2xl bg-card-background px-4 py-3'
                onPress={() => setFiltersOpen((prev) => !prev)}
              >
                <MaterialCommunityIcons name="filter-variant" size={18} color="#6B7280" />
                <Text className='text-sm font-semibold text-text-title'>Filter</Text>
              </Pressable>
            </View>

            {filtersOpen && (
              <View className='mt-5 gap-4 rounded-2xl bg-card-background p-4'>
                <View>
                  <Text className='text-sm font-semibold text-text-title'>Primary Category</Text>
                  <View className='mt-3 flex-row flex-wrap gap-2'>
                    <Chip
                      variant={!primaryFilter ? 'primary' : 'soft'}
                      size="lg"
                      className='h-8'
                      onPress={() => setPrimaryFilter(null)}
                    >
                      <Chip.Label>All</Chip.Label>
                    </Chip>
                    {primaryOptions.map((option) => (
                      <Chip
                        key={`primary-${option}`}
                        variant={primaryFilter === option ? 'primary' : 'soft'}
                        size="lg"
                        className='h-8'
                        onPress={() => setPrimaryFilter(option)}
                      >
                        <Chip.Label>{option}</Chip.Label>
                      </Chip>
                    ))}
                    {primaryOptions.length === 0 && (
                      <Text className='text-sm text-gray-500'>No primary categories yet.</Text>
                    )}
                  </View>
                </View>

                <View>
                  <Text className='text-sm font-semibold text-text-title'>Secondary Category</Text>
                  <View className='mt-3 flex-row flex-wrap gap-2'>
                    <Chip
                      variant={!secondaryFilter ? 'primary' : 'soft'}
                      size="lg"
                      className='h-8'
                      onPress={() => setSecondaryFilter(null)}
                    >
                      <Chip.Label>All</Chip.Label>
                    </Chip>
                    {secondaryOptions.map((option) => (
                      <Chip
                        key={`secondary-${option}`}
                        variant={secondaryFilter === option ? 'primary' : 'soft'}
                        size="lg"
                        className='h-8'
                        onPress={() => setSecondaryFilter(option)}
                      >
                        <Chip.Label>{option}</Chip.Label>
                      </Chip>
                    ))}
                    {secondaryOptions.length === 0 && (
                      <Text className='text-sm text-gray-500'>No secondary categories yet.</Text>
                    )}
                  </View>
                </View>
              </View>
            )}
          </View>
        }
        renderItem={({ item: exercise }) => (
          <Pressable
            onPress={() => handleOpenLink(exercise.link ?? undefined)}
            disabled={!exercise.link}
            className={`mx-5 mt-4 ${exercise.link ? 'opacity-100' : 'opacity-60'}`}
          >
            <View className='rounded-2xl bg-card-background p-4 items-center'>
              <View className='flex-row items-start justify-between'>
                <View className='flex-1 pr-3'>
                  <Text className='text-base font-semibold text-text-title'>
                    {exercise.name}
                  </Text>
                  <View className='mt-2 gap-1'>
                    <Text className='text-sm text-gray-500'>
                      Primary: {exercise.primary ?? 'Unspecified'}
                    </Text>
                    <Text className='text-sm text-gray-500'>
                      Secondary: {exercise.secondary ?? 'Unspecified'}
                    </Text>
                  </View>
                </View>
                <View className='items-center justify-center self-stretch'>
                  <View className='flex-1 justify-center items-center'>
                    <MaterialCommunityIcons name="youtube" size={22} color="#DC2626" />
                    <Text className='mt-1 text-xs font-semibold text-gray-500'>
                      {exercise.link ? 'Watch' : 'No link'}
                    </Text>
                  </View>
                </View>
              </View>
            </View>
          </Pressable>
        )}
        ListEmptyComponent={
          <View className='mx-5 mt-10 items-center rounded-2xl bg-card-background p-6'>
            <MaterialCommunityIcons name="alert-circle-outline" size={28} color="#9CA3AF" />
            <Text className='mt-3 text-base font-semibold text-text-title'>No exercises found</Text>
            <Text className='mt-1 text-sm text-gray-500'>
              Try adjusting your search or filters.
            </Text>
          </View>
        }
      />
    </View>
  )
}

export default ExerciseLibrary
