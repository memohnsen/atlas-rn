import { ClerkProvider, useAuth } from "@clerk/clerk-expo";
import { Stack, useRouter, useSegments } from "expo-router";
import { HeroUINativeProvider, useThemeColor } from "heroui-native";
import { useEffect, type ReactNode } from "react";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { ConvexReactClient } from "convex/react";
import { ConvexProviderWithClerk } from "convex/react-clerk";
import * as SecureStore from "expo-secure-store";
import "../global.css";
import { CoachProvider } from "@/components/CoachProvider";
import { OnboardingProvider, useOnboarding } from "@/components/OnboardingProvider";
import { UnitProvider } from "@/components/UnitProvider";

const convex = new ConvexReactClient(process.env.EXPO_PUBLIC_CONVEX_URL!);
const publishableKey = process.env.EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY!;

const tokenCache = {
  async getToken(key: string) {
    try {
      return await SecureStore.getItemAsync(key);
    } catch {
      return null;
    }
  },
  async saveToken(key: string, value: string) {
    try {
      await SecureStore.setItemAsync(key, value);
    } catch {
      // Best-effort cache; ignore write errors.
    }
  },
};

function AuthGate({ children }: { children: ReactNode }) {
  const { isLoaded, isSignedIn } = useAuth();
  const { hasOnboarded, isHydrated } = useOnboarding();
  const segments = useSegments();
  const router = useRouter();

  useEffect(() => {
    if (!isLoaded || !isHydrated) return;
    const inAuthGroup = segments[0] === "(auth)";
    const inOnboarding = segments[0] === "onboarding";

    if (!isSignedIn && !inAuthGroup) {
      router.replace("/(auth)/sign-in");
      return;
    }

    if (isSignedIn && inAuthGroup) {
      if (!hasOnboarded) {
        router.replace("/onboarding");
      } else {
        router.replace("/(tabs)");
      }
      return;
    }

    if (isSignedIn && !hasOnboarded && !inOnboarding) {
      router.replace("/onboarding");
      return;
    }
  }, [isLoaded, isSignedIn, hasOnboarded, isHydrated, router, segments]);

  if (!isLoaded || !isHydrated) return null;
  return <>{children}</>;
}

function RootStack() {
  const bg = useThemeColor("background");

  return (
    <Stack
      screenOptions={{
        headerShown: false,
      }}
    >
      <Stack.Screen name="(auth)" options={{ headerShown: false }} />
      <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
      <Stack.Screen name="onboarding" options={{ headerShown: false, gestureEnabled: false }} />
      <Stack.Screen
        name="set-meet"
        options={{
          presentation: "formSheet",
          headerShown: true,
          sheetGrabberVisible: true,
          sheetAllowedDetents: [0.75, 1.0],
          headerStyle: { backgroundColor: bg },
          headerTintColor: bg === "#000000" ? "#FFFFFF" : "#000000",
          contentStyle: { backgroundColor: bg },
        }}
      />
    </Stack>
  );
}

export default function RootLayout() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <ClerkProvider publishableKey={publishableKey} tokenCache={tokenCache}>
        <ConvexProviderWithClerk client={convex} useAuth={useAuth}>
          <HeroUINativeProvider>
            <OnboardingProvider>
              <UnitProvider>
                <CoachProvider>
                  <AuthGate>
                    <RootStack />
                  </AuthGate>
                </CoachProvider>
              </UnitProvider>
            </OnboardingProvider>
          </HeroUINativeProvider>
        </ConvexProviderWithClerk>
      </ClerkProvider>
    </GestureHandlerRootView>
  );
}
