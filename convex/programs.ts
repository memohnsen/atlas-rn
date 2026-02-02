import { v } from "convex/values";
import { query, mutation } from "./_generated/server";

// Get all unique athletes for a user
export const getAthletes = query({
  args: {
    userId: v.string(),
  },
  handler: async (ctx, args) => {
    const programs = await ctx.db
      .query("programs")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .collect();

    // Get unique athlete names
    const athleteNames = [...new Set(programs.map((p) => p.athleteName))];
    return athleteNames.sort();
  },
});

// Get all programs for a specific athlete
export const getProgramsForAthlete = query({
  args: {
    userId: v.string(),
    athleteName: v.string(),
  },
  handler: async (ctx, args) => {
    const programs = await ctx.db
      .query("programs")
      .withIndex("by_user_athlete", (q) =>
        q.eq("userId", args.userId).eq("athleteName", args.athleteName)
      )
      .collect();

    return programs;
  },
});

// Get a specific program for the training calendar
export const getAthleteProgram = query({
  args: {
    athleteName: v.string(),
    programName: v.string(),
    startDate: v.string(),
  },
  handler: async (ctx, args) => {
    const program = await ctx.db
      .query("programs")
      .withIndex("by_athlete_program", (q) =>
        q
          .eq("athleteName", args.athleteName)
          .eq("programName", args.programName)
          .eq("startDate", args.startDate)
      )
      .first();

    return program;
  },
});

// Get flattened workouts for analytics
export const getWorkoutsForAnalytics = query({
  args: {
    userId: v.string(),
    athleteName: v.string(),
    programName: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    let query = ctx.db
      .query("programs")
      .withIndex("by_user_athlete", (q) =>
        q.eq("userId", args.userId).eq("athleteName", args.athleteName)
      );

    const programs = await query.collect();

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

// Get athlete schedule summaries (last session + days remaining)
export const getAthleteScheduleSummaries = query({
  args: {
    userId: v.string(),
  },
  handler: async (ctx, args) => {
    const programs = await ctx.db
      .query("programs")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
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
      const startDate = new Date(program.startDate);
      const totalDays = program.weeks.reduce(
        (sum, week) => sum + week.days.length,
        0
      );
      const lastDate = new Date(startDate);
      lastDate.setDate(lastDate.getDate() + totalDays - 1);

      const existing = athleteMap.get(program.athleteName);
      const lastScheduledDate = lastDate.toISOString().split("T")[0];

      if (!existing || lastScheduledDate > existing.lastScheduledDate!) {
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

// Check if a program exists
export const checkProgramExists = query({
  args: {
    userId: v.string(),
    athleteName: v.string(),
    programName: v.string(),
    startDate: v.string(),
  },
  handler: async (ctx, args) => {
    const program = await ctx.db
      .query("programs")
      .withIndex("by_athlete_program", (q) =>
        q
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
    userId: v.string(),
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
                percent: v.optional(v.union(v.number(), v.array(v.number()))),
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
    const programId = await ctx.db.insert("programs", {
      userId: args.userId,
      athleteName: args.athleteName,
      programName: args.programName,
      startDate: args.startDate,
      weekCount: args.weekCount,
      repTargets: args.repTargets,
      weekTotals: args.weekTotals,
      weeks: args.weeks,
    });

    return programId;
  },
});

// Update an existing program
export const updateProgram = mutation({
  args: {
    programId: v.id("programs"),
    userId: v.string(),
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
                percent: v.optional(v.union(v.number(), v.array(v.number()))),
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
    const program = await ctx.db.get(args.programId);
    if (!program) throw new Error("Program not found");
    if (program.userId !== args.userId) throw new Error("Unauthorized");

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

// Delete a program
export const deleteProgram = mutation({
  args: {
    userId: v.string(),
    athleteName: v.string(),
    programName: v.string(),
    startDate: v.string(),
  },
  handler: async (ctx, args) => {
    const program = await ctx.db
      .query("programs")
      .withIndex("by_athlete_program", (q) =>
        q
          .eq("athleteName", args.athleteName)
          .eq("programName", args.programName)
          .eq("startDate", args.startDate)
      )
      .first();

    if (program && program.userId === args.userId) {
      await ctx.db.delete(program._id);
      return true;
    }

    return false;
  },
});

// Delete all data for an athlete
export const deleteAthleteData = mutation({
  args: {
    userId: v.string(),
    athleteName: v.string(),
  },
  handler: async (ctx, args) => {
    const programs = await ctx.db
      .query("programs")
      .withIndex("by_user_athlete", (q) =>
        q.eq("userId", args.userId).eq("athleteName", args.athleteName)
      )
      .collect();

    for (const program of programs) {
      await ctx.db.delete(program._id);
    }

    return programs.length;
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
    const program = await ctx.db.get(args.programId);
    if (!program) throw new Error("Program not found");

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
  },
  handler: async (ctx, args) => {
    const program = await ctx.db.get(args.programId);
    if (!program) throw new Error("Program not found");

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
                completed: args.completed,
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
    const program = await ctx.db.get(args.programId);
    if (!program) throw new Error("Program not found");

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
    const program = await ctx.db.get(args.programId);
    if (!program) throw new Error("Program not found");

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

// Get completed days for history (read-only for mobile)
export const getCompletedDays = query({
  args: {
    athleteName: v.string(),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const programs = await ctx.db
      .query("programs")
      .withIndex("by_athlete", (q) => q.eq("athleteName", args.athleteName))
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
