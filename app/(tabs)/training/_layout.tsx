import { Stack } from 'expo-router'

const Layout = () => {
  return (
    <Stack
      screenOptions={{
        headerBackButtonDisplayMode: 'minimal',
      }}
    >
      <Stack.Screen name="index" options={{ title: 'Training', headerShown: false }} />
      <Stack.Screen
        name="log"
        options={{
          title: '',
          headerShown: false
        }}
      />
    </Stack>
  )
}

export default Layout
