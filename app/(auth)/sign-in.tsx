import { useOAuth } from "@clerk/clerk-expo";
import Ionicons from "@expo/vector-icons/Ionicons";
import * as Haptics from "expo-haptics";
import * as Linking from "expo-linking";
import * as WebBrowser from "expo-web-browser";
import { useCallback } from "react";
import { Platform, Pressable, Text, View } from "react-native";
import Animated, { FadeInDown } from "react-native-reanimated";

WebBrowser.maybeCompleteAuthSession();

const SignIn = () => {
  const { startOAuthFlow: startGoogle } = useOAuth({
    strategy: "oauth_google",
  });
  const { startOAuthFlow: startApple } = useOAuth({
    strategy: "oauth_apple",
  });

  const handleOAuth = useCallback(
    async (startFlow: typeof startGoogle) => {
      if (process.env.EXPO_OS === "ios") {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      }
      const redirectUrl = Linking.createURL("/", { scheme: "atlas" });
      const { createdSessionId, setActive } = await startFlow({ redirectUrl });
      if (createdSessionId) {
        await setActive?.({ session: createdSessionId });
      }
    },
    []
  );

  return (
    <View className="flex-1 bg-background justify-end" style={{ padding: 24 }}>
      {/* Branding */}
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
        <Animated.View
          entering={FadeInDown.duration(600).springify().damping(18)}
          style={{ alignItems: "center" }}
        >
          <View
            style={{
              width: 80,
              height: 80,
              borderRadius: 20,
              backgroundColor: "#5386E4",
              justifyContent: "center",
              alignItems: "center",
              borderCurve: "continuous",
              marginBottom: 24,
            }}
          >
            <Text
              style={{
                fontSize: 36,
                fontWeight: "800",
                color: "#FFFFFF",
                letterSpacing: -1,
              }}
            >
              A
            </Text>
          </View>
          <Text
            className="text-text-title"
            style={{
              fontSize: 34,
              fontWeight: "800",
              letterSpacing: -0.5,
            }}
          >
            Atlas
          </Text>
          <Text
            className="text-gray-500"
            style={{
              fontSize: 17,
              marginTop: 8,
              textAlign: "center",
              lineHeight: 22,
            }}
          >
            Track your training, hit your PRs.
          </Text>
        </Animated.View>
      </View>

      {/* Auth Buttons */}
      <Animated.View
        entering={FadeInDown.delay(200).duration(500).springify().damping(18)}
        style={{ gap: 12, paddingBottom: Platform.OS === "android" ? 24 : 16 }}
      >
        <Pressable
          onPress={() => handleOAuth(startGoogle)}
          style={({ pressed }) => ({
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "center",
            gap: 10,
            backgroundColor: pressed ? "#F2F2F7" : "#FFFFFF",
            borderRadius: 14,
            paddingVertical: 16,
            borderCurve: "continuous",
            boxShadow: "0 1px 3px rgba(0, 0, 0, 0.08)",
          })}
        >
          <Ionicons name="logo-google" size={18} color="#111111" />
          <Text
            style={{ color: "#111111", fontSize: 17, fontWeight: "600" }}
          >
            Continue with Google
          </Text>
        </Pressable>

        <Pressable
          onPress={() => handleOAuth(startApple)}
          style={({ pressed }) => ({
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "center",
            gap: 10,
            backgroundColor: pressed ? "#222222" : "#111111",
            borderRadius: 14,
            paddingVertical: 16,
            borderCurve: "continuous",
          })}
        >
          <Ionicons name="logo-apple" size={20} color="#FFFFFF" />
          <Text
            style={{ color: "#FFFFFF", fontSize: 17, fontWeight: "600" }}
          >
            Continue with Apple
          </Text>
        </Pressable>
      </Animated.View>
    </View>
  );
};

export default SignIn;
