import { v } from "convex/values";
import { MutationCtx, QueryCtx, query, mutation } from "./_generated/server";
import { getUserId } from "./auth";
import { computeInitialScheduledDate, resolveEffectiveDayDate } from "./schedule";
import { Id } from "./_generated/dataModel";

const normalizeExerciseName = (value: string) =>
  value.toLowerCase().trim().replace(/\s+/g, " ");

const isAdminUser = (userId: string) =>
  Boolean(process.env.ADMIN_CLERK_USER_ID) &&
  userId === process.env.ADMIN_CLERK_USER_ID;

const DAY_RATING_TO_SCORE: Record<
  "Trash" | "Below Average" | "Average" | "Above Average" | "Crushing It",
  number
> = {
  Trash: 1,
  "Below Average": 2,
  Average: 3,
  "Above Average": 4,
  "Crushing It": 5,
};

const parseDateOnly = (value: string) => {
  const [year, month, day] = value.split("-").map(Number);
  if (!year || !month || !day) return null;
  return new Date(year, month - 1, day);
};

const formatDateOnly = (date: Date) =>
  `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(
    date.getDate()
  ).padStart(2, "0")}`;

const getProgramEndDate = (program: { startDate: string; weekCount: number }) => {
  const startDate = parseDateOnly(program.startDate);
  if (!startDate) return null;
  const totalDays = Math.max(program.weekCount * 7 - 1, 0);
  const endDate = new Date(startDate);
  endDate.setDate(endDate.getDate() + totalDays);
  return formatDateOnly(endDate);
};

const pickCurrentProgram = <
  T extends {
    startDate: string;
    weekCount: number;
  }
>(
  programs: T[],
  today: string
) => {
  const activePrograms = programs
    .filter((program) => {
      const endDate = getProgramEndDate(program);
      if (!endDate) return false;
      return today >= program.startDate && today <= endDate;
    })
    .sort((a, b) => (a.startDate < b.startDate ? 1 : -1));
  if (activePrograms.length > 0) return activePrograms[0];

  const pastPrograms = programs
    .filter((program) => program.startDate <= today)
    .sort((a, b) => (a.startDate < b.startDate ? 1 : -1));
  if (pastPrograms.length > 0) return pastPrograms[0];

  const futurePrograms = programs
    .filter((program) => program.startDate > today)
    .sort((a, b) => (a.startDate > b.startDate ? 1 : -1));
  return futurePrograms[0] ?? null;
};

const getExerciseSetCount = (exercise: {
  reps: string | string[];
  percent?: number | number[];
  setWeights?: number[];
  sets?: number;
}) => {
  const repsCount = Array.isArray(exercise.reps) ? exercise.reps.length : 1;
  const percentCount = Array.isArray(exercise.percent)
    ? exercise.percent.length
    : exercise.percent !== undefined
      ? 1
      : 0;
  const setWeightsCount = exercise.setWeights?.length ?? 0;
  return Math.max(repsCount, percentCount, setWeightsCount, exercise.sets ?? 0, 1);
};

const getSetValue = (
  value: number | number[] | string | string[] | undefined,
  index: number
) => {
  if (value === undefined) return undefined;
  if (Array.isArray(value)) return value[index] ?? value[0];
  return value;
};

const getWeekBucketStart = (date: string) => {
  const parsedDate = parseDateOnly(date);
  if (!parsedDate) return null;
  const dayOfWeek = parsedDate.getDay();
  const diffToMonday = (dayOfWeek + 6) % 7;
  parsedDate.setDate(parsedDate.getDate() - diffToMonday);
  return formatDateOnly(parsedDate);
};

const resolveExerciseVolume = (
  exercise: {
    exerciseName: string;
    reps: string | string[];
    setWeights?: number[];
    percent?: number | number[];
    weights?: number;
    completed: boolean;
  },
  prLookup: Record<string, number>
) => {
  if (!exercise.completed) return 0;
  const setCount = getExerciseSetCount(exercise);
  let volume = 0;
  for (let index = 0; index < setCount; index += 1) {
    const repsValue = Number(getSetValue(exercise.reps, index) ?? 0);
    if (!Number.isFinite(repsValue) || repsValue <= 0) continue;

    const storedSetWeight = Number(exercise.setWeights?.[index] ?? 0);
    if (Number.isFinite(storedSetWeight) && storedSetWeight > 0) {
      volume += storedSetWeight * repsValue;
      continue;
    }

    const percentValue = Number(getSetValue(exercise.percent, index) ?? 0);
    const oneRepMax = prLookup[normalizeExerciseName(exercise.exerciseName)];
    if (Number.isFinite(percentValue) && percentValue > 0 && oneRepMax) {
      volume += (percentValue / 100) * oneRepMax * repsValue;
      continue;
    }

    if (typeof exercise.weights === "number" && exercise.weights > 0) {
      volume += exercise.weights * repsValue;
    }
  }
  return volume;
};

const ensureProgramOwnership = async (
  ctx: MutationCtx | QueryCtx,
  programId: Id<"programs">
) => {
  const userId = await getUserId(ctx);
  const program = await ctx.db.get(programId);
  if (!program) throw new Error("Program not found");
  if (program.userId !== userId) throw new Error("Unauthorized");
  return program;
};

// Get all unique athletes for the current signed-in user
export const getAthletes = query({
  args: {},
  handler: async (ctx, args) => {
    const userId = await getUserId(ctx);
    const programs = isAdminUser(userId)
      ? await ctx.db.query("programs").collect()
      : await ctx.db
          .query("programs")
          .withIndex("by_user", (q) => q.eq("userId", userId))
          .collect();

    // Get unique athlete names
    const athleteNames = [...new Set(programs.map((p) => p.athleteName))];
    return athleteNames.sort();
  },
});

// Get all programs for a specific athlete for the current signed-in user
export const getProgramsForAthlete = query({
  args: {
    athleteName: v.string(),
  },
  handler: async (ctx, args) => {
    const userId = await getUserId(ctx);
    const programs = isAdminUser(userId)
      ? await ctx.db
          .query("programs")
          .withIndex("by_athlete", (q) => q.eq("athleteName", args.athleteName))
          .collect()
      : await ctx.db
          .query("programs")
          .withIndex("by_user_athlete", (q) =>
            q.eq("userId", userId).eq("athleteName", args.athleteName)
          )
          .collect();

    return programs;
  },
});

// Get the most recent program for an athlete for the current signed-in user
export const getCurrentProgramForAthlete = query({
  args: {
    athleteName: v.string(),
  },
  handler: async (ctx, args) => {
    const userId = await getUserId(ctx);
    const programs = isAdminUser(userId)
      ? await ctx.db
          .query("programs")
          .withIndex("by_athlete", (q) => q.eq("athleteName", args.athleteName))
          .collect()
      : await ctx.db
          .query("programs")
          .withIndex("by_user_athlete", (q) =>
            q.eq("userId", userId).eq("athleteName", args.athleteName)
          )
          .collect();

    if (programs.length === 0) return null;

    programs.sort((a, b) => (a.startDate < b.startDate ? 1 : -1));
    return programs[0];
  },
});

export const getCurrentProgramForUser = query({
  args: {
    athleteName: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const userId = await getUserId(ctx);
    const programs = args.athleteName
      ? await ctx.db
          .query("programs")
          .withIndex("by_user_athlete", (q) =>
            q.eq("userId", userId).eq("athleteName", args.athleteName!)
          )
          .collect()
      : await ctx.db
          .query("programs")
          .withIndex("by_user", (q) => q.eq("userId", userId))
          .collect();

    if (programs.length === 0) return null;

    const today = formatDateOnly(new Date());
    return pickCurrentProgram(programs, today);
  },
});

// Coach dashboard summary for current user's athletes
export const getCoachDashboard = query({
  args: {},
  handler: async (ctx, args) => {
    const userId = await getUserId(ctx);
    const programs = isAdminUser(userId)
      ? await ctx.db.query("programs").collect()
      : await ctx.db
          .query("programs")
          .withIndex("by_user", (q) => q.eq("userId", userId))
          .collect();

    const byAthlete = new Map<string, typeof programs[number]>();
    for (const program of programs) {
      const existing = byAthlete.get(program.athleteName);
      if (!existing || program.startDate > existing.startDate) {
        byAthlete.set(program.athleteName, program);
      }
    }

    return Array.from(byAthlete.values()).map((program) => {
      const sessionsRemaining = program.weeks.reduce((sum, week) => {
        const remaining = week.days.filter((day) => !day.completed).length;
        return sum + remaining;
      }, 0);

      return {
        athleteName: program.athleteName,
        programName: program.programName,
        startDate: program.startDate,
        weekCount: program.weekCount,
        sessionsRemaining,
      };
    });
  },
});

// Get a specific program for the training calendar for current user
export const getAthleteProgram = query({
  args: {
    athleteName: v.string(),
    programName: v.string(),
    startDate: v.string(),
  },
  handler: async (ctx, args) => {
    const userId = await getUserId(ctx);
    const program = isAdminUser(userId)
      ? await ctx.db
          .query("programs")
          .withIndex("by_athlete_program", (q) =>
            q
              .eq("athleteName", args.athleteName)
              .eq("programName", args.programName)
              .eq("startDate", args.startDate)
          )
          .first()
      : await ctx.db
          .query("programs")
          .withIndex("by_user_athlete_program", (q) =>
            q
              .eq("userId", userId)
              .eq("athleteName", args.athleteName)
              .eq("programName", args.programName)
              .eq("startDate", args.startDate)
          )
          .first();

    return program;
  },
});

// Get flattened workouts for analytics for current user
export const getWorkoutsForAnalytics = query({
  args: {
    athleteName: v.string(),
    programName: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const userId = await getUserId(ctx);
    const programs = isAdminUser(userId)
      ? await ctx.db
          .query("programs")
          .withIndex("by_athlete", (q) => q.eq("athleteName", args.athleteName))
          .collect()
      : await ctx.db
          .query("programs")
          .withIndex("by_user_athlete", (q) =>
            q.eq("userId", userId).eq("athleteName", args.athleteName)
          )
          .collect();

    // Filter by program name if provided
    const filteredPrograms = args.programName
      ? programs.filter((p) => p.programName === args.programName)
      : programs;

    // Flatten to individual exercises for analytics
    const workouts = filteredPrograms.flatMap((program) =>
      program.weeks.flatMap((week) =>
        week.days.flatMap((day) =>
          day.exercises.map((ex) => ({
            athleteName: program.athleteName,
            programName: program.programName,
            startDate: program.startDate,
            weekNumber: week.weekNumber,
            dayNumber: day.dayNumber,
            dayOfWeek: day.dayOfWeek,
            ...ex,
          }))
        )
      )
    );

    return workouts;
  },
});

// Get recent bests (heaviest weight in last 3 months) for an athlete
export const getRecentBestsForAthlete = query({
  args: {
    athleteName: v.string(),
  },
  handler: async (ctx, args) => {
    const userId = await getUserId(ctx);
    const programs = isAdminUser(userId)
      ? await ctx.db
          .query("programs")
          .withIndex("by_athlete", (q) => q.eq("athleteName", args.athleteName))
          .collect()
      : await ctx.db
          .query("programs")
          .withIndex("by_user_athlete", (q) =>
            q.eq("userId", userId).eq("athleteName", args.athleteName)
          )
          .collect();

    const cutoffDate = new Date();
    cutoffDate.setMonth(cutoffDate.getMonth() - 3);
    const cutoffTimestamp = cutoffDate.getTime();

    const bests: Record<string, number> = {};

    programs.forEach((program) => {
      program.weeks.forEach((week) => {
        week.days.forEach((day) => {
          if (!day.completed || !day.completedAt) return;
          if (day.completedAt < cutoffTimestamp) return;

          day.exercises.forEach((exercise) => {
            if (!exercise.completed) return;
            if (typeof exercise.weights !== "number") return;
            const normalizedName = normalizeExerciseName(exercise.exerciseName);
            const currentBest = bests[normalizedName];
            if (currentBest === undefined || exercise.weights > currentBest) {
              bests[normalizedName] = exercise.weights;
            }
          });
        });
      });
    });

    return bests;
  },
});

// Get athlete schedule summaries (last session + days remaining) for current user
export const getAthleteScheduleSummaries = query({
  args: {},
  handler: async (ctx, args) => {
    const userId = await getUserId(ctx);
    const programs = isAdminUser(userId)
      ? await ctx.db.query("programs").collect()
      : await ctx.db
          .query("programs")
          .withIndex("by_user", (q) => q.eq("userId", userId))
          .collect();

    // Group by athlete
    const athleteMap = new Map<
      string,
      {
        athleteName: string;
        lastScheduledDate: string | null;
        daysRemaining: number;
      }
    >();

    programs.forEach((program) => {
      const effectiveDates = program.weeks.flatMap((week) =>
        week.days.map((day) =>
          resolveEffectiveDayDate(day, week.weekNumber, program.startDate)
        )
      );
      const sortedEffectiveDates = effectiveDates.sort();
      const lastScheduledDate =
        sortedEffectiveDates.length > 0
          ? sortedEffectiveDates[sortedEffectiveDates.length - 1]
          : null;
      if (!lastScheduledDate) return;

      const existing = athleteMap.get(program.athleteName);
      if (!existing || lastScheduledDate > existing.lastScheduledDate!) {
        const [year, month, day] = lastScheduledDate.split("-").map(Number);
        const lastDate = new Date(year, month - 1, day);
        const today = new Date();
        const daysRemaining = Math.ceil(
          (lastDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)
        );

        athleteMap.set(program.athleteName, {
          athleteName: program.athleteName,
          lastScheduledDate,
          daysRemaining,
        });
      }
    });

    return Array.from(athleteMap.values());
  },
});

export const getAnalyticsForCurrentUser = query({
  args: {
    range: v.union(v.literal("4W"), v.literal("8W"), v.literal("12W"), v.literal("All")),
    athleteName: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const userId = await getUserId(ctx);
    const programs = args.athleteName
      ? isAdminUser(userId)
        ? await ctx.db
            .query("programs")
            .withIndex("by_athlete", (q) => q.eq("athleteName", args.athleteName!))
            .collect()
        : await ctx.db
            .query("programs")
            .withIndex("by_user_athlete", (q) =>
              q.eq("userId", userId).eq("athleteName", args.athleteName!)
            )
            .collect()
      : await ctx.db
          .query("programs")
          .withIndex("by_user", (q) => q.eq("userId", userId))
          .collect();

    const daysBackMap: Record<"4W" | "8W" | "12W" | "All", number> = {
      "4W": 28,
      "8W": 56,
      "12W": 84,
      All: Number.POSITIVE_INFINITY,
    };
    const dayLimit = daysBackMap[args.range];
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const cutoff = new Date(now);
    if (Number.isFinite(dayLimit)) {
      cutoff.setDate(cutoff.getDate() - dayLimit);
      cutoff.setHours(0, 0, 0, 0);
    }

    const prs =
      isAdminUser(userId) && args.athleteName
        ? (await ctx.db.query("athletePRs").collect()).filter(
            (pr) => pr.athleteName === args.athleteName
          )
        : await ctx.db
            .query("athletePRs")
            .withIndex("by_user", (q) => q.eq("userId", userId))
            .collect();
    const prLookup: Record<string, number> = {};
    for (const pr of prs) {
      const key = normalizeExerciseName(pr.exerciseName);
      const existing = prLookup[key];
      if (existing === undefined || pr.weight > existing) {
        prLookup[key] = pr.weight;
      }
    }

    const buckets = new Map<
      string,
      {
        volume: number;
        completed: number;
        total: number;
        intensitySum: number;
        intensityCount: number;
        dayRatingSum: number;
        dayRatingCount: number;
      }
    >();

    for (const program of programs) {
      for (const week of program.weeks) {
        for (const day of week.days) {
          const effectiveDate = resolveEffectiveDayDate(day, week.weekNumber, program.startDate);
          const parsed = parseDateOnly(effectiveDate);
          if (!parsed) continue;
          if (parsed > today) continue;
          if (Number.isFinite(dayLimit) && parsed < cutoff) continue;

          const bucket = getWeekBucketStart(effectiveDate);
          if (!bucket) continue;
          const existing =
            buckets.get(bucket) ??
            {
              volume: 0,
              completed: 0,
              total: 0,
              intensitySum: 0,
              intensityCount: 0,
              dayRatingSum: 0,
              dayRatingCount: 0,
            };

          existing.total += 1;
          if (day.completed) {
            existing.completed += 1;
            for (const exercise of day.exercises) {
              existing.volume += resolveExerciseVolume(
                { ...exercise, exerciseName: exercise.exerciseName },
                prLookup
              );
            }
            if (typeof day.sessionIntensity === "number" && day.sessionIntensity > 0) {
              existing.intensitySum += day.sessionIntensity;
              existing.intensityCount += 1;
            }
            if (day.rating) {
              const ratingScore = DAY_RATING_TO_SCORE[day.rating];
              existing.dayRatingSum += ratingScore;
              existing.dayRatingCount += 1;
            }
          }
          buckets.set(bucket, existing);
        }
      }
    }

    const points = Array.from(buckets.entries())
      .sort(([a], [b]) => (a > b ? 1 : -1))
      .map(([weekStart, value]) => ({
        weekStart,
        volume: Math.round(value.volume * 10) / 10,
        completionRate:
          value.total > 0 ? Math.round((value.completed / value.total) * 1000) / 10 : 0,
        sessionIntensity:
          value.intensityCount > 0
            ? Math.round((value.intensitySum / value.intensityCount) * 10) / 10
            : null,
        dayRating:
          value.dayRatingCount > 0
            ? Math.round((value.dayRatingSum / value.dayRatingCount) * 10) / 10
            : null,
        completedSessions: value.completed,
        totalSessions: value.total,
      }));

    return points;
  },
});

// Check if a program exists
export const checkProgramExists = query({
  args: {
    athleteName: v.string(),
    programName: v.string(),
    startDate: v.string(),
  },
  handler: async (ctx, args) => {
    const userId = await getUserId(ctx);
    const program = await ctx.db
      .query("programs")
      .withIndex("by_user_athlete_program", (q) =>
        q
          .eq("userId", userId)
          .eq("athleteName", args.athleteName)
          .eq("programName", args.programName)
          .eq("startDate", args.startDate)
      )
      .first();

    return program !== null;
  },
});

// Insert a new program
export const insertProgram = mutation({
  args: {
    athleteName: v.string(),
    programName: v.string(),
    startDate: v.string(),
    weekCount: v.number(),
    repTargets: v.object({
      snatch: v.string(),
      clean: v.string(),
      jerk: v.string(),
      squat: v.string(),
      pull: v.string(),
    }),
    weekTotals: v.array(
      v.object({
        weekNumber: v.number(),
        total: v.string(),
      })
    ),
    weeks: v.array(
      v.object({
        weekNumber: v.number(),
        days: v.array(
          v.object({
            dayNumber: v.number(),
            dayOfWeek: v.optional(v.string()),
            dayLabel: v.optional(v.string()),
            scheduledDate: v.optional(v.string()),
            completed: v.boolean(),
            rating: v.optional(
              v.union(
                v.literal("Trash"),
                v.literal("Below Average"),
                v.literal("Average"),
                v.literal("Above Average"),
                v.literal("Crushing It")
              )
            ),
            sessionIntensity: v.optional(v.number()),
            sessionComments: v.optional(v.string()),
            completedAt: v.optional(v.number()),
            exercises: v.array(
              v.object({
                exerciseNumber: v.number(),
                exerciseName: v.string(),
                exerciseCategory: v.optional(v.string()),
                exerciseNotes: v.optional(v.string()),
                supersetGroup: v.optional(v.string()),
                supersetOrder: v.optional(v.number()),
                sets: v.optional(v.number()),
                reps: v.union(v.string(), v.array(v.string())),
                weights: v.optional(v.number()),
                setWeights: v.optional(v.array(v.number())),
                percent: v.optional(v.union(v.number(), v.array(v.number()))),
                setStatuses: v.optional(
                  v.array(
                    v.union(
                      v.literal("pending"),
                      v.literal("complete"),
                      v.literal("miss")
                    )
                  )
                ),
                completed: v.boolean(),
                athleteComments: v.optional(v.string()),
              })
            ),
          })
        ),
      })
    ),
  },
  handler: async (ctx, args) => {
    const userId = await getUserId(ctx);
    const weeksWithScheduledDates = args.weeks.map((week) => ({
      ...week,
      days: week.days.map((day) => ({
        ...day,
        scheduledDate:
          day.scheduledDate ??
          computeInitialScheduledDate(day, week.weekNumber, args.startDate),
      })),
    }));

    const programId = await ctx.db.insert("programs", {
      userId,
      athleteName: args.athleteName,
      programName: args.programName,
      startDate: args.startDate,
      weekCount: args.weekCount,
      repTargets: args.repTargets,
      weekTotals: args.weekTotals,
      weeks: weeksWithScheduledDates,
    });

    return programId;
  },
});

// Update an existing program
export const updateProgram = mutation({
  args: {
    programId: v.id("programs"),
    athleteName: v.string(),
    programName: v.string(),
    startDate: v.string(),
    weekCount: v.number(),
    repTargets: v.object({
      snatch: v.string(),
      clean: v.string(),
      jerk: v.string(),
      squat: v.string(),
      pull: v.string(),
    }),
    weekTotals: v.array(
      v.object({
        weekNumber: v.number(),
        total: v.string(),
      })
    ),
    weeks: v.array(
      v.object({
        weekNumber: v.number(),
        days: v.array(
          v.object({
            dayNumber: v.number(),
            dayOfWeek: v.optional(v.string()),
            dayLabel: v.optional(v.string()),
            scheduledDate: v.optional(v.string()),
            completed: v.boolean(),
            rating: v.optional(
              v.union(
                v.literal("Trash"),
                v.literal("Below Average"),
                v.literal("Average"),
                v.literal("Above Average"),
                v.literal("Crushing It")
              )
            ),
            sessionIntensity: v.optional(v.number()),
            sessionComments: v.optional(v.string()),
            completedAt: v.optional(v.number()),
            exercises: v.array(
              v.object({
                exerciseNumber: v.number(),
                exerciseName: v.string(),
                exerciseCategory: v.optional(v.string()),
                exerciseNotes: v.optional(v.string()),
                supersetGroup: v.optional(v.string()),
                supersetOrder: v.optional(v.number()),
                sets: v.optional(v.number()),
                reps: v.union(v.string(), v.array(v.string())),
                weights: v.optional(v.number()),
                setWeights: v.optional(v.array(v.number())),
                percent: v.optional(v.union(v.number(), v.array(v.number()))),
                setStatuses: v.optional(
                  v.array(
                    v.union(
                      v.literal("pending"),
                      v.literal("complete"),
                      v.literal("miss")
                    )
                  )
                ),
                completed: v.boolean(),
                athleteComments: v.optional(v.string()),
              })
            ),
          })
        ),
      })
    ),
  },
  handler: async (ctx, args) => {
    await ensureProgramOwnership(ctx, args.programId);

    await ctx.db.patch(args.programId, {
      athleteName: args.athleteName,
      programName: args.programName,
      startDate: args.startDate,
      weekCount: args.weekCount,
      repTargets: args.repTargets,
      weekTotals: args.weekTotals,
      weeks: args.weeks,
    });

    return args.programId;
  },
});

// Delete a program for current user
export const deleteProgram = mutation({
  args: {
    athleteName: v.string(),
    programName: v.string(),
    startDate: v.string(),
  },
  handler: async (ctx, args) => {
    const userId = await getUserId(ctx);
    const program = await ctx.db
      .query("programs")
      .withIndex("by_user_athlete_program", (q) =>
        q
          .eq("userId", userId)
          .eq("athleteName", args.athleteName)
          .eq("programName", args.programName)
          .eq("startDate", args.startDate)
      )
      .first();

    if (program) {
      await ctx.db.delete(program._id);
      return true;
    }

    return false;
  },
});

// Delete all data for an athlete for current user
export const deleteAthleteData = mutation({
  args: {
    athleteName: v.string(),
  },
  handler: async (ctx, args) => {
    const userId = await getUserId(ctx);
    const programs = await ctx.db
      .query("programs")
      .withIndex("by_user_athlete", (q) =>
        q.eq("userId", userId).eq("athleteName", args.athleteName)
      )
      .collect();

    for (const program of programs) {
      await ctx.db.delete(program._id);
    }

    return programs.length;
  },
});

export const moveWorkoutDay = mutation({
  args: {
    programId: v.id("programs"),
    sourceWeekNumber: v.number(),
    sourceDayNumber: v.number(),
    targetDate: v.string(),
  },
  handler: async (ctx, args) => {
    const program = await ensureProgramOwnership(ctx, args.programId);

    let sourceDate = "";
    let targetWeekNumber: number | null = null;
    let targetDayNumber: number | null = null;

    const sourceDay = program.weeks
      .flatMap((week) => week.days.map((day) => ({ weekNumber: week.weekNumber, day })))
      .find(
        (entry) =>
          entry.weekNumber === args.sourceWeekNumber &&
          entry.day.dayNumber === args.sourceDayNumber
      );

    if (!sourceDay) throw new Error("Workout day not found");
    if (sourceDay.day.completed) throw new Error("Completed workouts cannot be moved");

    sourceDate = resolveEffectiveDayDate(
      sourceDay.day,
      sourceDay.weekNumber,
      program.startDate
    );

    for (const week of program.weeks) {
      for (const day of week.days) {
        const effectiveDate = resolveEffectiveDayDate(
          day,
          week.weekNumber,
          program.startDate
        );
        if (
          effectiveDate === args.targetDate &&
          !(
            week.weekNumber === args.sourceWeekNumber &&
            day.dayNumber === args.sourceDayNumber
          )
        ) {
          targetWeekNumber = week.weekNumber;
          targetDayNumber = day.dayNumber;
        }
      }
    }

    const updatedWeeks = program.weeks.map((week) => ({
      ...week,
      days: week.days.map((day) => {
        if (
          week.weekNumber === args.sourceWeekNumber &&
          day.dayNumber === args.sourceDayNumber
        ) {
          return {
            ...day,
            scheduledDate: args.targetDate,
          };
        }
        if (
          targetWeekNumber !== null &&
          targetDayNumber !== null &&
          week.weekNumber === targetWeekNumber &&
          day.dayNumber === targetDayNumber
        ) {
          return {
            ...day,
            scheduledDate: sourceDate,
          };
        }
        return day;
      }),
    }));

    await ctx.db.patch(args.programId, { weeks: updatedWeeks });
  },
});

// Mark a day as complete (REAL-TIME CRITICAL)
export const markDayComplete = mutation({
  args: {
    programId: v.id("programs"),
    weekNumber: v.number(),
    dayNumber: v.number(),
    completed: v.boolean(),
    rating: v.optional(
      v.union(
        v.literal("Trash"),
        v.literal("Below Average"),
        v.literal("Average"),
        v.literal("Above Average"),
        v.literal("Crushing It")
      )
    ),
  },
  handler: async (ctx, args) => {
    const program = await ensureProgramOwnership(ctx, args.programId);

    const updatedWeeks = program.weeks.map((week) => {
      if (week.weekNumber !== args.weekNumber) return week;

      return {
        ...week,
        days: week.days.map((day) => {
          if (day.dayNumber !== args.dayNumber) return day;

          return {
            ...day,
            completed: args.completed,
            rating: args.rating,
            completedAt: args.completed ? Date.now() : undefined,
          };
        }),
      };
    });

    await ctx.db.patch(args.programId, { weeks: updatedWeeks });
  },
});

// Mark an exercise as complete
export const markExerciseComplete = mutation({
  args: {
    programId: v.id("programs"),
    weekNumber: v.number(),
    dayNumber: v.number(),
    exerciseNumber: v.number(),
    completed: v.boolean(),
    weight: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const program = await ensureProgramOwnership(ctx, args.programId);

    const updatedWeeks = program.weeks.map((week) => {
      if (week.weekNumber !== args.weekNumber) return week;

      return {
        ...week,
        days: week.days.map((day) => {
          if (day.dayNumber !== args.dayNumber) return day;

          return {
            ...day,
            exercises: day.exercises.map((ex) => {
              if (ex.exerciseNumber !== args.exerciseNumber) return ex;

              let nextWeight = ex.weights;
              if (args.completed) {
                const setWeights = ex.setWeights ?? [];
                const setStatuses = ex.setStatuses ?? [];
                if (setWeights.length > 0) {
                  const filtered = setWeights.filter(
                    (value, index) => setStatuses[index] !== "miss" && value > 0
                  );
                  const max = filtered.length > 0 ? Math.max(...filtered) : undefined;
                  if (typeof max === "number") {
                    nextWeight = max;
                  }
                } else if (typeof args.weight === "number") {
                  nextWeight = args.weight;
                }
              }

              return {
                ...ex,
                completed: args.completed,
                weights: nextWeight,
              };
            }),
          };
        }),
      };
    });

    await ctx.db.patch(args.programId, { weeks: updatedWeeks });
  },
});

// Update per-set data for an exercise
export const updateExerciseSets = mutation({
  args: {
    programId: v.id("programs"),
    weekNumber: v.number(),
    dayNumber: v.number(),
    exerciseNumber: v.number(),
    reps: v.array(v.string()),
    percent: v.optional(v.array(v.number())),
    setWeights: v.optional(v.array(v.number())),
    setStatuses: v.optional(
      v.array(
        v.union(
          v.literal("pending"),
          v.literal("complete"),
          v.literal("miss")
        )
      )
    ),
    sets: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const program = await ensureProgramOwnership(ctx, args.programId);

    const updatedWeeks = program.weeks.map((week) => {
      if (week.weekNumber !== args.weekNumber) return week;

      return {
        ...week,
        days: week.days.map((day) => {
          if (day.dayNumber !== args.dayNumber) return day;

          return {
            ...day,
            exercises: day.exercises.map((ex) => {
              if (ex.exerciseNumber !== args.exerciseNumber) return ex;

              return {
                ...ex,
                reps: args.reps,
                percent: args.percent ?? ex.percent,
                setWeights: args.setWeights ?? ex.setWeights,
                setStatuses: args.setStatuses ?? ex.setStatuses,
                sets: args.sets ?? args.reps.length,
              };
            }),
          };
        }),
      };
    });

    await ctx.db.patch(args.programId, { weeks: updatedWeeks });
  },
});

// Update coach notes on an exercise
export const updateExerciseNotes = mutation({
  args: {
    programId: v.id("programs"),
    weekNumber: v.number(),
    dayNumber: v.number(),
    exerciseNumber: v.number(),
    notes: v.string(),
  },
  handler: async (ctx, args) => {
    const program = await ensureProgramOwnership(ctx, args.programId);

    const updatedWeeks = program.weeks.map((week) => {
      if (week.weekNumber !== args.weekNumber) return week;

      return {
        ...week,
        days: week.days.map((day) => {
          if (day.dayNumber !== args.dayNumber) return day;

          return {
            ...day,
            exercises: day.exercises.map((ex) => {
              if (ex.exerciseNumber !== args.exerciseNumber) return ex;

              return {
                ...ex,
                exerciseNotes: args.notes,
              };
            }),
          };
        }),
      };
    });

    await ctx.db.patch(args.programId, { weeks: updatedWeeks });
  },
});

// Update athlete comments on an exercise
export const updateAthleteComments = mutation({
  args: {
    programId: v.id("programs"),
    weekNumber: v.number(),
    dayNumber: v.number(),
    exerciseNumber: v.number(),
    comments: v.string(),
  },
  handler: async (ctx, args) => {
    const program = await ensureProgramOwnership(ctx, args.programId);

    const updatedWeeks = program.weeks.map((week) => {
      if (week.weekNumber !== args.weekNumber) return week;

      return {
        ...week,
        days: week.days.map((day) => {
          if (day.dayNumber !== args.dayNumber) return day;

          return {
            ...day,
            exercises: day.exercises.map((ex) => {
              if (ex.exerciseNumber !== args.exerciseNumber) return ex;

              return {
                ...ex,
                athleteComments: args.comments,
              };
            }),
          };
        }),
      };
    });

    await ctx.db.patch(args.programId, { weeks: updatedWeeks });
  },
});

// Update day rating
export const updateDayRating = mutation({
  args: {
    programId: v.id("programs"),
    weekNumber: v.number(),
    dayNumber: v.number(),
    rating: v.union(
      v.literal("Trash"),
      v.literal("Below Average"),
      v.literal("Average"),
      v.literal("Above Average"),
      v.literal("Crushing It")
    ),
  },
  handler: async (ctx, args) => {
    const program = await ensureProgramOwnership(ctx, args.programId);

    const updatedWeeks = program.weeks.map((week) => {
      if (week.weekNumber !== args.weekNumber) return week;

      return {
        ...week,
        days: week.days.map((day) => {
          if (day.dayNumber !== args.dayNumber) return day;

          return {
            ...day,
            rating: args.rating,
          };
        }),
      };
    });

    await ctx.db.patch(args.programId, { weeks: updatedWeeks });
  },
});

// Update day session intensity
export const updateDaySessionIntensity = mutation({
  args: {
    programId: v.id("programs"),
    weekNumber: v.number(),
    dayNumber: v.number(),
    sessionIntensity: v.number(),
  },
  handler: async (ctx, args) => {
    const program = await ensureProgramOwnership(ctx, args.programId);

    const updatedWeeks = program.weeks.map((week) => {
      if (week.weekNumber !== args.weekNumber) return week;

      return {
        ...week,
        days: week.days.map((day) => {
          if (day.dayNumber !== args.dayNumber) return day;

          return {
            ...day,
            sessionIntensity: args.sessionIntensity,
          };
        }),
      };
    });

    await ctx.db.patch(args.programId, { weeks: updatedWeeks });
  },
});

export const updateDaySessionComments = mutation({
  args: {
    programId: v.id("programs"),
    weekNumber: v.number(),
    dayNumber: v.number(),
    sessionComments: v.string(),
  },
  handler: async (ctx, args) => {
    const program = await ensureProgramOwnership(ctx, args.programId);

    const updatedWeeks = program.weeks.map((week) => {
      if (week.weekNumber !== args.weekNumber) return week;
      return {
        ...week,
        days: week.days.map((day) => {
          if (day.dayNumber !== args.dayNumber) return day;
          return {
            ...day,
            sessionComments: args.sessionComments.trim(),
          };
        }),
      };
    });

    await ctx.db.patch(args.programId, { weeks: updatedWeeks });
  },
});

// Get completed days for current user
export const getCompletedDays = query({
  args: {
    athleteName: v.optional(v.string()),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const userId = await getUserId(ctx);
    const programs = args.athleteName
      ? await ctx.db
          .query("programs")
          .withIndex("by_user_athlete", (q) =>
            q.eq("userId", userId).eq("athleteName", args.athleteName!)
          )
          .collect()
      : await ctx.db
          .query("programs")
          .withIndex("by_user", (q) => q.eq("userId", userId))
          .collect();

    // Flatten and filter completed days
    const completedDays = programs.flatMap((program) =>
      program.weeks.flatMap((week) =>
        week.days
          .filter((day) => day.completed)
          .map((day) => ({
            programName: program.programName,
            startDate: program.startDate,
            weekNumber: week.weekNumber,
            dayNumber: day.dayNumber,
            dayOfWeek: day.dayOfWeek,
            dayLabel: day.dayLabel,
            rating: day.rating,
            completedAt: day.completedAt,
            exercises: day.exercises,
          }))
      )
    );

    // Sort by completion time (most recent first)
    completedDays.sort((a, b) => (b.completedAt ?? 0) - (a.completedAt ?? 0));

    return args.limit ? completedDays.slice(0, args.limit) : completedDays;
  },
});
