import { ClerkProvider, useAuth } from "@clerk/clerk-expo";
import { Stack, useRouter, useSegments } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { HeroUINativeProvider, useThemeColor } from "heroui-native";
import { useCallback, useEffect, useState, type ReactNode } from "react";
import { useColorScheme, View, Text, Modal, Pressable, ActivityIndicator } from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withSpring,
  withTiming,
} from "react-native-reanimated";
import { ConvexReactClient } from "convex/react";
import { ConvexProviderWithClerk } from "convex/react-clerk";
import * as SecureStore from "expo-secure-store";
import * as Updates from "expo-updates";
import "../global.css";
import { CoachProvider } from "@/components/CoachProvider";
import { OnboardingProvider, useOnboarding } from "@/components/OnboardingProvider";
import { UnitProvider } from "@/components/UnitProvider";

SplashScreen.preventAutoHideAsync();

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

function LaunchScreen({ onFinish }: { onFinish: () => void }) {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";

  const logoScale = useSharedValue(0.8);
  const logoOpacity = useSharedValue(0);
  const textOpacity = useSharedValue(0);
  const containerOpacity = useSharedValue(1);

  useEffect(() => {
    // Hide native splash immediately — our animated version takes over
    SplashScreen.hideAsync();

    // Animate in
    logoScale.value = withSpring(1, { damping: 14, stiffness: 120 });
    logoOpacity.value = withTiming(1, { duration: 400 });
    textOpacity.value = withDelay(250, withTiming(1, { duration: 400 }));

    // Hold, then fade out
    const timeout = setTimeout(() => {
      containerOpacity.value = withTiming(0, { duration: 300 });
      setTimeout(onFinish, 350);
    }, 1800);

    return () => clearTimeout(timeout);
  }, []);

  const logoStyle = useAnimatedStyle(() => ({
    opacity: logoOpacity.value,
    transform: [{ scale: logoScale.value }],
  }));

  const textStyle = useAnimatedStyle(() => ({
    opacity: textOpacity.value,
  }));

  const containerStyle = useAnimatedStyle(() => ({
    opacity: containerOpacity.value,
  }));

  return (
    <Animated.View
      style={[
        {
          position: "absolute",
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          zIndex: 100,
          backgroundColor: isDark ? "#000000" : "#FFFFFF",
          alignItems: "center",
          justifyContent: "center",
        },
        containerStyle,
      ]}
    >
      <Animated.View style={logoStyle}>
        <View
          style={{
            width: 88,
            height: 88,
            borderRadius: 22,
            borderCurve: "continuous",
            backgroundColor: "#5386E4",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <Text
            style={{
              fontSize: 42,
              fontWeight: "800",
              color: "#FFFFFF",
            }}
          >
            A
          </Text>
        </View>
      </Animated.View>
      <Animated.View style={[{ marginTop: 16 }, textStyle]}>
        <Text
          style={{
            fontSize: 28,
            fontWeight: "800",
            color: isDark ? "#FFFFFF" : "#000000",
          }}
        >
          Atlas
        </Text>
      </Animated.View>
    </Animated.View>
  );
}

function AuthGate({ children }: { children: ReactNode }) {
  const { isLoaded, isSignedIn } = useAuth();
  const { hasOnboarded, isHydrated } = useOnboarding();
  const segments = useSegments();
  const router = useRouter();
  const [showLaunch, setShowLaunch] = useState(true);

  const handleLaunchFinish = useCallback(() => {
    setShowLaunch(false);
  }, []);

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

  return (
    <>
      {children}
      {showLaunch && <LaunchScreen onFinish={handleLaunchFinish} />}
    </>
  );
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
          headerShown: false,
          sheetGrabberVisible: true,
          sheetAllowedDetents: [0.75, 1.0],
          contentStyle: { backgroundColor: bg },
        }}
      />
    </Stack>
  );
}

function OtaUpdateModal() {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";
  const [visible, setVisible] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const [isDownloaded, setIsDownloaded] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;
    const checkForUpdates = async () => {
      if (!Updates.isEnabled) return;
      try {
        const result = await Updates.checkForUpdateAsync();
        if (!isMounted || !result.isAvailable) return;
        setVisible(true);
      } catch {
        // Ignore check failures in environments where updates are unavailable.
      }
    };
    checkForUpdates();
    return () => {
      isMounted = false;
    };
  }, []);

  const handleDownload = async () => {
    try {
      setIsDownloading(true);
      setErrorMessage(null);
      await Updates.fetchUpdateAsync();
      setIsDownloaded(true);
    } catch {
      setErrorMessage("Download failed. Please try again.");
    } finally {
      setIsDownloading(false);
    }
  };

  const handleRestartNow = async () => {
    try {
      await Updates.reloadAsync();
    } catch {
      setErrorMessage("Could not restart app. Please reopen manually.");
    }
  };

  return (
    <Modal transparent visible={visible} animationType="fade" onRequestClose={() => setVisible(false)}>
      <View
        style={{
          flex: 1,
          backgroundColor: "rgba(0,0,0,0.45)",
          justifyContent: "center",
          paddingHorizontal: 24,
        }}
      >
        <View
          style={{
            borderRadius: 20,
            borderCurve: "continuous",
            backgroundColor: isDark ? "#1C1C1E" : "#FFFFFF",
            padding: 20,
            gap: 12,
          }}
        >
          <Text style={{ color: isDark ? "#FFF" : "#111827", fontSize: 22, fontWeight: "800" }}>
            Update Available
          </Text>
          <Text style={{ color: isDark ? "#A1A1AA" : "#6B7280", fontSize: 15, lineHeight: 22 }}>
            {isDownloaded
              ? "The new version is downloaded and ready to install."
              : "A newer app version is ready. Download now?"}
          </Text>
          {errorMessage ? (
            <Text style={{ color: "#EF4444", fontSize: 14, fontWeight: "600" }}>
              {errorMessage}
            </Text>
          ) : null}
          {!isDownloaded ? (
            <View style={{ flexDirection: "row", justifyContent: "flex-end", gap: 12, marginTop: 4 }}>
              <Pressable onPress={() => setVisible(false)} style={{ paddingHorizontal: 12, paddingVertical: 10 }}>
                <Text style={{ color: isDark ? "#E5E7EB" : "#374151", fontSize: 16, fontWeight: "600" }}>
                  Cancel
                </Text>
              </Pressable>
              <Pressable
                disabled={isDownloading}
                onPress={handleDownload}
                style={{
                  borderRadius: 12,
                  borderCurve: "continuous",
                  backgroundColor: "#5386E4",
                  paddingHorizontal: 16,
                  paddingVertical: 10,
                  minWidth: 110,
                  alignItems: "center",
                  justifyContent: "center",
                  opacity: isDownloading ? 0.75 : 1,
                }}
              >
                {isDownloading ? (
                  <ActivityIndicator color="#FFFFFF" />
                ) : (
                  <Text style={{ color: "#FFF", fontSize: 16, fontWeight: "700" }}>Download</Text>
                )}
              </Pressable>
            </View>
          ) : (
            <View style={{ flexDirection: "row", justifyContent: "flex-end", gap: 12, marginTop: 4 }}>
              <Pressable onPress={() => setVisible(false)} style={{ paddingHorizontal: 12, paddingVertical: 10 }}>
                <Text style={{ color: isDark ? "#E5E7EB" : "#374151", fontSize: 16, fontWeight: "600" }}>
                  Later
                </Text>
              </Pressable>
              <Pressable
                onPress={handleRestartNow}
                style={{
                  borderRadius: 12,
                  borderCurve: "continuous",
                  backgroundColor: "#5386E4",
                  paddingHorizontal: 16,
                  paddingVertical: 10,
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <Text style={{ color: "#FFF", fontSize: 16, fontWeight: "700" }}>Restart now</Text>
              </Pressable>
            </View>
          )}
        </View>
      </View>
    </Modal>
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
                  <OtaUpdateModal />
                </CoachProvider>
              </UnitProvider>
            </OnboardingProvider>
          </HeroUINativeProvider>
        </ConvexProviderWithClerk>
      </ClerkProvider>
    </GestureHandlerRootView>
  );
}
