import { useCoach } from "@/components/CoachProvider";
import { useUnit } from "@/components/UnitProvider";
import WeightUnitPickerModal from "@/components/WeightUnitPickerModal";
import { useAuth, useUser } from "@clerk/clerk-expo";
import Ionicons from "@expo/vector-icons/Ionicons";
import { useRouter } from "expo-router";
import { useState } from "react";
import { Linking, Pressable, Switch, Text, View } from "react-native";

const SettingsScreen = () => {
  const { signOut } = useAuth();
  const { user } = useUser();
  const router = useRouter();
  const { isCoachUser, coachEnabled, setCoachEnabled } = useCoach();
  const { weightUnit, setWeightUnit } = useUnit();
  const [unitPickerOpen, setUnitPickerOpen] = useState(false);
  const displayName =
    user?.fullName ||
    [user?.firstName, user?.lastName].filter(Boolean).join(" ") ||
    "Unknown";

  return (
    <View className="flex-1 bg-background">
      <View className="mt-12">
        <WeightUnitPickerModal
          visible={unitPickerOpen}
          selectedUnit={weightUnit}
          onSelect={setWeightUnit}
          onClose={() => setUnitPickerOpen(false)}
        />
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
      </View>

      <View className="mt-6 px-5">
        <Pressable
          onPress={() => setUnitPickerOpen(true)}
          className="flex-row items-center justify-between rounded-2xl bg-card-background px-4 py-3.5"
        >
          <View>
            <Text className="text-base text-text-title">Weight Units</Text>
            <Text className="text-xs text-gray-500 mt-1">Default is KG</Text>
          </View>
          <View className="flex-row items-center" style={{ gap: 6 }}>
            <Text className="text-text-title text-base font-semibold">
              {weightUnit === "kg" ? "KG" : "LB"}
            </Text>
            <Ionicons name="chevron-down" size={18} color="#6C6C70" />
          </View>
        </Pressable>
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
            const subject = "App Feedback";
            const body = `Name: ${displayName}\nClerk ID: ${
              user?.id ?? "Unknown"
            }\n\nMessage:\n`;
            const mailto = `mailto:maddisen@meetcal.app?subject=${encodeURIComponent(
              subject,
            )}&body=${encodeURIComponent(body)}`;
            await Linking.openURL(mailto);
          }}
          className="items-center rounded-2xl bg-card-background py-3.5"
        >
          <Text className="text-base font-semibold text-text-title">
            Submit Feedback
          </Text>
        </Pressable>
      </View>

      <View className="mt-4 px-5">
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
    </View>
  );
};

export default SettingsScreen;
