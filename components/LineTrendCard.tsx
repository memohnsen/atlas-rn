import React, { useMemo, useState } from "react";
import { LayoutChangeEvent, Text, View } from "react-native";
import Svg, { Circle, Line, Path } from "react-native-svg";

type TrendPoint = {
  label: string;
  value: number | null;
};

type LineTrendCardProps = {
  title: string;
  subtitle: string;
  color: string;
  points: TrendPoint[];
  valueFormatter?: (value: number) => string;
  emptyLabel?: string;
};

const CHART_HEIGHT = 140;
const Y_AXIS_LABEL_WIDTH = 42;
const CHART_PADDING_LEFT = 24;
const CHART_PADDING_RIGHT = 28;
const CHART_PADDING_TOP = 18;
const CHART_PADDING_BOTTOM = 18;

const defaultFormatter = (value: number) =>
  Number.isInteger(value) ? String(value) : value.toFixed(1);

const LineTrendCard = ({
  title,
  subtitle,
  color,
  points,
  valueFormatter = defaultFormatter,
  emptyLabel = "No data available in this range",
}: LineTrendCardProps) => {
  const [width, setWidth] = useState(0);

  const chartPoints = useMemo(() => {
    return points.filter((point) => typeof point.value === "number");
  }, [points]);

  const chartData = useMemo(() => {
    const plotWidth = Math.max(width - Y_AXIS_LABEL_WIDTH, 0);
    if (
      plotWidth <= CHART_PADDING_LEFT + CHART_PADDING_RIGHT ||
      chartPoints.length === 0
    ) {
      return {
        path: "",
        projected: [] as Array<{ x: number; y: number; value: number; label: string }>,
        minValue: 0,
        maxValue: 0,
      };
    }

    const values = chartPoints.map((point) => point.value as number);
    const minValue = Math.min(...values);
    const maxValue = Math.max(...values);
    const valueRange = maxValue - minValue || 1;
    const drawableWidth = plotWidth - CHART_PADDING_LEFT - CHART_PADDING_RIGHT;
    const drawableHeight =
      CHART_HEIGHT - CHART_PADDING_TOP - CHART_PADDING_BOTTOM;

    const projected = chartPoints.map((point, index) => {
      const x =
        CHART_PADDING_LEFT +
        (chartPoints.length === 1
          ? drawableWidth / 2
          : (index / (chartPoints.length - 1)) * drawableWidth);
      const y =
        CHART_PADDING_TOP +
        (1 - ((point.value as number) - minValue) / valueRange) * drawableHeight;
      return { x, y, value: point.value as number, label: point.label };
    });

    const path = projected
      .map((point, index) =>
        `${index === 0 ? "M" : "L"} ${point.x.toFixed(2)} ${point.y.toFixed(2)}`
      )
      .join(" ");

    return { path, projected, minValue, maxValue };
  }, [chartPoints, width]);

  const yAxisLabels = useMemo(() => {
    const min = chartData.minValue;
    const max = chartData.maxValue;
    const mid = min + (max - min) / 2;
    return [max, mid, min].map((value) => valueFormatter(value));
  }, [chartData.maxValue, chartData.minValue, valueFormatter]);

  const handleLayout = (event: LayoutChangeEvent) => {
    const nextWidth = Math.round(event.nativeEvent.layout.width);
    if (nextWidth !== width) setWidth(nextWidth);
  };

  return (
    <View
      className="rounded-2xl bg-card-background p-4"
      style={{ borderCurve: "continuous" }}
    >
      <Text className="text-text-title text-base font-semibold">{title}</Text>
      <Text className="text-gray-500 text-sm mt-1">{subtitle}</Text>

      {chartPoints.length === 0 ? (
        <View
          style={{ height: CHART_HEIGHT }}
          className="items-center justify-center"
        >
          <Text className="text-gray-500 text-sm">{emptyLabel}</Text>
        </View>
      ) : (
        <View style={{ marginTop: 12 }} onLayout={handleLayout}>
          <View style={{ flexDirection: "row", alignItems: "stretch" }}>
            <View
              style={{
                width: Y_AXIS_LABEL_WIDTH,
                height: CHART_HEIGHT,
                justifyContent: "space-between",
                paddingTop: CHART_PADDING_TOP,
                paddingBottom: CHART_PADDING_BOTTOM - 4,
              }}
            >
              {yAxisLabels.map((label, index) => (
                <Text
                  key={`${title}-y-${index}`}
                  className="text-gray-500 text-xs"
                  style={{ textAlign: "right", paddingRight: 6 }}
                >
                  {label}
                </Text>
              ))}
            </View>
            <Svg width={Math.max((width || 0) - Y_AXIS_LABEL_WIDTH, 1)} height={CHART_HEIGHT}>
              <Line
                x1={CHART_PADDING_LEFT}
                y1={CHART_HEIGHT - CHART_PADDING_BOTTOM}
                x2={Math.max((width || 0) - Y_AXIS_LABEL_WIDTH, 1) - CHART_PADDING_RIGHT}
                y2={CHART_HEIGHT - CHART_PADDING_BOTTOM}
                stroke="rgba(156,163,175,0.35)"
                strokeWidth={1}
              />
              {chartData.path ? (
                <Path
                  d={chartData.path}
                  stroke={color}
                  strokeWidth={3}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  fill="none"
                />
              ) : null}
              {chartData.projected.map((point) => (
                <Circle
                  key={`${title}-${point.label}-${point.x}`}
                  cx={point.x}
                  cy={point.y}
                  r={4}
                  fill={color}
                />
              ))}
            </Svg>
          </View>
        </View>
      )}
    </View>
  );
};

export type { TrendPoint };
export default LineTrendCard;
