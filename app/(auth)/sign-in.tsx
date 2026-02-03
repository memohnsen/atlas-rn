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
      const redirectUrl = Linking.createURL("oauth-native-callback", {
        scheme: "atlas",
      });
      const { createdSessionId, setActive } = await startFlow({ redirectUrl });
      if (createdSessionId) {
        await setActive?.({ session: createdSessionId });
      }
    },
    []
  );

  return (
    <View className="flex-1 bg-background justify-end p-6">
      {/* Branding */}
      <View className="flex-1 items-center justify-center">
        <Animated.View
          entering={FadeInDown.duration(600).springify().damping(18)}
          className="items-center"
        >
          <View
            className="h-20 w-20 items-center justify-center rounded-2xl bg-blue-energy mb-6"
            style={{ borderCurve: "continuous" }}
          >
            <Text className="text-4xl font-extrabold text-white">
              A
            </Text>
          </View>
          <Text className="text-text-title text-[34px] font-extrabold">
            Atlas
          </Text>
          <Text className="text-gray-500 text-[17px] mt-2 text-center leading-6">
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
            backgroundColor: pressed ? "#F2F2F7" : "#FFFFFF",
            borderCurve: "continuous",
            boxShadow: "0 1px 3px rgba(0, 0, 0, 0.08)",
          })}
          className="flex-row items-center justify-center rounded-2xl border border-gray-200 py-4"
        >
          <Ionicons name="logo-google" size={18} color="#111111" />
          <Text className="text-gray-900 text-[17px] font-semibold ml-2">
            Continue with Google
          </Text>
        </Pressable>

        <Pressable
          onPress={() => handleOAuth(startApple)}
          style={({ pressed }) => ({
            backgroundColor: pressed ? "#222222" : "#111111",
            borderCurve: "continuous",
          })}
          className="flex-row items-center justify-center rounded-2xl py-4"
        >
          <Ionicons name="logo-apple" size={20} color="#FFFFFF" />
          <Text className="text-white text-[17px] font-semibold ml-2">
            Continue with Apple
          </Text>
        </Pressable>
      </Animated.View>
    </View>
  );
};

export default SignIn;
