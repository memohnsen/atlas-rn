import { Stack } from "expo-router";
import { HeroUINativeProvider } from "heroui-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { ConvexProvider, ConvexReactClient } from "convex/react";
import "../global.css";

const convex = new ConvexReactClient(process.env.EXPO_PUBLIC_CONVEX_URL!);

export default function RootLayout() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <ConvexProvider client={convex}>
        <HeroUINativeProvider>
          <Stack
            screenOptions={{
              headerShown: false,
            }}
          />
        </HeroUINativeProvider>
      </ConvexProvider>
    </GestureHandlerRootView>
  );
}
