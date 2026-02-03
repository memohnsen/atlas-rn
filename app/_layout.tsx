import { Stack } from "expo-router";
import { HeroUINativeProvider, useThemeColor } from "heroui-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { ConvexProvider, ConvexReactClient } from "convex/react";
import "../global.css";

const convex = new ConvexReactClient(process.env.EXPO_PUBLIC_CONVEX_URL!);

function RootStack() {
  const bg = useThemeColor('background');

  return (
    <Stack
      screenOptions={{
        headerShown: false,
      }}
    >
      <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
      <Stack.Screen
        name="set-meet"
        options={{
          presentation: 'formSheet',
          headerShown: true,
          sheetGrabberVisible: true,
          sheetAllowedDetents: [0.75, 1.0],
          headerStyle: { backgroundColor: bg },
          headerTintColor: bg === '#000000' ? '#FFFFFF' : '#000000',
          contentStyle: { backgroundColor: bg },
        }}
      />
    </Stack>
  );
}

export default function RootLayout() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <ConvexProvider client={convex}>
        <HeroUINativeProvider>
          <RootStack />
        </HeroUINativeProvider>
      </ConvexProvider>
    </GestureHandlerRootView>
  );
}
