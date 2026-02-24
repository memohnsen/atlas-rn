type DayScheduleShape = {
  dayNumber: number;
  dayOfWeek?: string;
  dayLabel?: string;
  scheduledDate?: string;
};

const dayNameToIndex: Record<string, number> = {
  sunday: 0,
  sun: 0,
  monday: 1,
  mon: 1,
  tuesday: 2,
  tue: 2,
  tues: 2,
  wednesday: 3,
  wed: 3,
  thursday: 4,
  thu: 4,
  thur: 4,
  thurs: 4,
  friday: 5,
  fri: 5,
  saturday: 6,
  sat: 6,
};

const asDateOnly = (value: Date) => {
  const year = value.getFullYear();
  const month = String(value.getMonth() + 1).padStart(2, "0");
  const day = String(value.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

const parseDateOnly = (value: string) => {
  const [yearStr, monthStr, dayStr] = value.split("-");
  const year = Number(yearStr);
  const month = Number(monthStr);
  const day = Number(dayStr);
  if (!year || !month || !day) {
    throw new Error(`Invalid date: ${value}`);
  }
  return new Date(year, month - 1, day);
};

const getTargetDayIndex = (day: DayScheduleShape) => {
  const rawLabel = (day.dayLabel ?? day.dayOfWeek ?? "").trim().toLowerCase();
  return dayNameToIndex[rawLabel];
};

export const computeInitialScheduledDate = (
  day: DayScheduleShape,
  weekNumber: number,
  startDate: string
) => {
  const programStart = parseDateOnly(startDate);
  const weekOffset = (weekNumber - 1) * 7;
  const targetDayIndex = getTargetDayIndex(day);

  if (targetDayIndex === undefined) {
    const fallback = new Date(programStart);
    fallback.setDate(fallback.getDate() + weekOffset + Math.max(day.dayNumber - 1, 0));
    return asDateOnly(fallback);
  }

  const programStartDayIndex = programStart.getDay();
  let dayOffset = targetDayIndex - programStartDayIndex;
  if (dayOffset < 0) dayOffset += 7;

  const resolved = new Date(programStart);
  resolved.setDate(resolved.getDate() + weekOffset + dayOffset);
  return asDateOnly(resolved);
};

export const resolveEffectiveDayDate = (
  day: DayScheduleShape,
  weekNumber: number,
  startDate: string
) => {
  if (day.scheduledDate) return day.scheduledDate;
  return computeInitialScheduledDate(day, weekNumber, startDate);
};
