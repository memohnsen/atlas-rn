export type AnalyticsRange = "4W" | "8W" | "12W" | "All";

export type AnalyticsPoint = {
  weekStart: string;
  volume: number;
  completionRate: number;
  sessionIntensity: number | null;
  dayRating: number | null;
  completedSessions: number;
  totalSessions: number;
};

const formatWeekLabel = (weekStart: string) => {
  const [year, month, day] = weekStart.split("-").map(Number);
  if (!year || !month || !day) return weekStart;
  return `${month}/${day}`;
};

export const buildVolumeTrend = (points: AnalyticsPoint[]) =>
  points.map((point) => ({
    label: formatWeekLabel(point.weekStart),
    value: point.volume,
  }));

export const buildCompletionTrend = (points: AnalyticsPoint[]) =>
  points.map((point) => ({
    label: formatWeekLabel(point.weekStart),
    value: point.completionRate,
  }));

export const buildIntensityTrend = (points: AnalyticsPoint[]) =>
  points.map((point) => ({
    label: formatWeekLabel(point.weekStart),
    value: point.sessionIntensity,
  }));

export const buildDayRatingTrend = (points: AnalyticsPoint[]) =>
  points.map((point) => ({
    label: formatWeekLabel(point.weekStart),
    value: point.dayRating,
  }));
