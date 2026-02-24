import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  // Programs table - consolidates program_workouts + program_days + program_metadata
  programs: defineTable({
    // Core identifiers
    userId: v.string(),
    athleteName: v.string(),
    programName: v.string(),
    startDate: v.string(), // ISO date (YYYY-MM-DD)

    // Program metadata
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

    // Nested weeks structure
    weeks: v.array(
      v.object({
        weekNumber: v.number(),
        days: v.array(
          v.object({
            dayNumber: v.number(),
            dayOfWeek: v.optional(v.string()),
            dayLabel: v.optional(v.string()),
            scheduledDate: v.optional(v.string()),

            // Day-level completion tracking (REAL-TIME CRITICAL)
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
            completedAt: v.optional(v.number()), // timestamp

            // Exercises for this day
            exercises: v.array(
              v.object({
                exerciseNumber: v.number(),
                exerciseName: v.string(),
                exerciseCategory: v.optional(v.string()),
                exerciseNotes: v.optional(v.string()),
                supersetGroup: v.optional(v.string()),
                supersetOrder: v.optional(v.number()),
                sets: v.optional(v.number()),
                reps: v.union(v.string(), v.array(v.string())), // Can be "10-15" range or ["3", "3", "3"] for multiple sets
                weights: v.optional(v.number()),
                setWeights: v.optional(v.array(v.number())),
                percent: v.optional(v.union(v.number(), v.array(v.number()))), // Single number or [60, 65, 70] for multiple sets
                setStatuses: v.optional(
                  v.array(
                    v.union(
                      v.literal("pending"),
                      v.literal("complete"),
                      v.literal("miss")
                    )
                  )
                ),

                // Exercise-level tracking
                completed: v.boolean(),
                athleteComments: v.optional(v.string()),
              })
            ),
          })
        ),
      })
    ),
  })
    .index("by_user", ["userId"])
    .index("by_athlete", ["athleteName"])
    .index("by_user_athlete", ["userId", "athleteName"])
    .index("by_athlete_program", ["athleteName", "programName", "startDate"])
    .index("by_user_athlete_program", [
      "userId",
      "athleteName",
      "programName",
      "startDate",
    ]),

  // Program Templates table - consolidates program_library_workouts + program_library_templates
  programTemplates: defineTable({
    userId: v.string(),
    programName: v.string(),

    // Template metadata
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

    // Template structure (same as programs but without completion tracking)
    weeks: v.array(
      v.object({
        weekNumber: v.number(),
        days: v.array(
          v.object({
            dayNumber: v.number(),
            dayOfWeek: v.optional(v.string()),
            dayLabel: v.optional(v.string()),
            scheduledDate: v.optional(v.string()),
            exercises: v.array(
              v.object({
                exerciseNumber: v.number(),
                exerciseName: v.string(),
                exerciseCategory: v.optional(v.string()),
                exerciseNotes: v.optional(v.string()),
                supersetGroup: v.optional(v.string()),
                supersetOrder: v.optional(v.number()),
                sets: v.optional(v.number()),
                reps: v.union(v.string(), v.array(v.string())), // Can be "10-15" range or ["3", "3", "3"] for multiple sets
                weights: v.optional(v.number()),
                percent: v.optional(v.union(v.number(), v.array(v.number()))), // Single number or [60, 65, 70] for multiple sets
              })
            ),
          })
        ),
      })
    ),
  })
    .index("by_user", ["userId"])
    .index("by_user_program", ["userId", "programName"]),

  // Athlete PRs table - normalized structure (replaces 34-column denormalized table)
  athletePRs: defineTable({
    userId: v.string(),
    athleteName: v.string(), // Globally unique athlete names
    exerciseName: v.string(), // "snatch", "clean", "back_squat", etc.
    repMax: v.number(), // 1, 2, 3, 5, 10
    weight: v.number(), // The PR weight
    recordedAt: v.optional(v.number()), // When this PR was set
  })
    .index("by_user", ["userId"])
    .index("by_user_athlete", ["userId", "athleteName"])
    .index("by_user_athlete_exercise", ["userId", "athleteName", "exerciseName"])
    .index("by_user_athlete_exercise_rep", [
      "userId",
      "athleteName",
      "exerciseName",
      "repMax",
    ]),

  // Athlete Meets table - upcoming competition info
  athleteMeets: defineTable({
    userId: v.string(),
    athleteName: v.string(),
    meetName: v.string(),
    meetDate: v.string(), // ISO date (YYYY-MM-DD)
  })
    .index("by_user", ["userId"])
    .index("by_user_athlete", ["userId", "athleteName"]),

  // Exercise Library table
  exerciseLibrary: defineTable({
    name: v.string(),
    primary: v.optional(v.string()), // Primary muscle group
    secondary: v.optional(v.string()), // Secondary muscle group
    link: v.optional(v.string()), // Video/reference link
  }).index("by_name", ["name"]),
});
