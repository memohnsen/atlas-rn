import { useCoach } from "@/components/CoachProvider";
import Header from "@/components/Header";
import LineTrendCard from "@/components/LineTrendCard";
import {
  AnalyticsPoint,
  AnalyticsRange,
  buildDayRatingTrend,
  buildIntensityTrend,
  buildVolumeTrend,
} from "@/utils/analytics";
import { useAuth } from "@clerk/clerk-expo";
import { useQuery } from "convex/react";
import { FunctionReference } from "convex/server";
import { Chip } from "heroui-native";
import { useMemo, useState } from "react";
import { FlatList, Platform, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

const RANGE_OPTIONS: AnalyticsRange[] = ["4W", "8W", "12W", "All"];
const getAnalyticsForCurrentUser =
  "programs:getAnalyticsForCurrentUser" as unknown as FunctionReference<"query">;

const AnalyticsScreen = () => {
  const { isSignedIn } = useAuth();
  const { coachEnabled, selectedAthlete, athletes } = useCoach();
  const insets = useSafeAreaInsets();
  const [range, setRange] = useState<AnalyticsRange>("All");

  const analyticsData = useQuery(
    getAnalyticsForCurrentUser,
    isSignedIn
      ? {
          range,
          athleteName: coachEnabled
            ? (selectedAthlete ?? undefined)
            : undefined,
        }
      : "skip",
  ) as AnalyticsPoint[] | undefined;

  const points = analyticsData ?? [];

  const volumeTrend = useMemo(() => buildVolumeTrend(points), [points]);
  const intensityTrend = useMemo(() => buildIntensityTrend(points), [points]);
  const dayRatingTrend = useMemo(() => buildDayRatingTrend(points), [points]);

  return (
    <View className="flex-1 bg-background">
      <FlatList
        data={[0]}
        keyExtractor={(item) => String(item)}
        contentContainerStyle={{
          paddingHorizontal: 20,
          paddingTop: Platform.OS === "ios" ? Math.max(insets.top, 16) : 52,
          paddingBottom: insets.bottom + 170,
        }}
        renderItem={() => (
          <View style={{ gap: 12 }}>
            <LineTrendCard
              title="Weekly Volume"
              subtitle="Total lifted load (kg)"
              color="#5386E4"
              points={volumeTrend}
              valueFormatter={(value) => Math.round(value).toString()}
            />
            <LineTrendCard
              title="Session Intensity"
              subtitle="Average effort (1-10)"
              color="#F59E0B"
              points={intensityTrend}
              valueFormatter={(value) => value.toFixed(1)}
            />
            <LineTrendCard
              title="Day Rating"
              subtitle="Average readiness score (1-5)"
              color="#22D3EE"
              points={dayRatingTrend}
              valueFormatter={(value) => value.toFixed(1)}
            />
          </View>
        )}
        ListHeaderComponent={
          <View>
            <Header
              title="Analytics"
              subtitle={
                coachEnabled
                  ? `${selectedAthlete ?? athletes[0] ?? "Athlete"} trends`
                  : "Training trends over time"
              }
            />
            <View className="mt-6 flex-row gap-2">
              {RANGE_OPTIONS.map((option) => (
                <Chip
                  key={option}
                  variant={range === option ? "primary" : "soft"}
                  size="lg"
                  className="h-8"
                  onPress={() => setRange(option)}
                >
                  <Chip.Label>{option}</Chip.Label>
                </Chip>
              ))}
            </View>
            {points.length === 0 && (
              <View className="mt-6 rounded-2xl bg-card-background p-4">
                <Text className="text-gray-500 text-sm">
                  No completed sessions in this range yet.
                </Text>
              </View>
            )}
            <View style={{ height: 12 }} />
          </View>
        }
      />
    </View>
  );
};

export default AnalyticsScreen;
