import { useCoach } from "@/components/CoachProvider";
import { useAuth } from "@clerk/clerk-expo";
import Ionicons from "@expo/vector-icons/Ionicons";
import { useRouter } from "expo-router";
import { Pressable, SafeAreaView, Switch, Text, View } from "react-native";

const SettingsScreen = () => {
  const { signOut } = useAuth();
  const router = useRouter();
  const { isCoachUser, coachEnabled, setCoachEnabled } = useCoach();

  return (
    <SafeAreaView className="flex-1 bg-background">
      <View className="px-5 pt-4">
        <View className="flex-row items-center justify-between">
          <Pressable
            onPress={() => router.back()}
            className="h-9 w-9 items-center justify-center rounded-full bg-card-background"
          >
            <Ionicons name="chevron-back" size={24} color="#6C6C70" />
          </Pressable>
          <Text className="text-3xl font-bold text-text-title">Settings</Text>
          <View className="h-9 w-9" />
        </View>
      </View>

      {isCoachUser && (
        <View className="mt-6 px-5">
          <View className="flex-row items-center justify-between rounded-2xl bg-card-background px-4 py-3.5">
            <Text className="text-base text-text-title">Coach Mode</Text>
            <Switch value={coachEnabled} onValueChange={setCoachEnabled} />
          </View>
          <Text className="mt-2 text-xs text-gray-500">
            Enable coach tools for athlete management.
          </Text>
        </View>
      )}

      <View className="mt-10 px-5">
        <Pressable
          onPress={async () => {
            await signOut();
            router.replace("/(auth)/sign-in");
          }}
          className="items-center rounded-2xl bg-red-500 py-3.5"
        >
          <Text className="text-base font-semibold text-white">Sign Out</Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
};

export default SettingsScreen;
