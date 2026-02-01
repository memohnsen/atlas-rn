import { v } from "convex/values";
import { query, mutation } from "./_generated/server";

// Get all PRs for an athlete (grouped by exercise)
export const getAthletePRs = query({
  args: {
    athleteName: v.string(),
  },
  handler: async (ctx, args) => {
    const prs = await ctx.db
      .query("athletePRs")
      .withIndex("by_athlete", (q) => q.eq("athleteName", args.athleteName))
      .collect();

    // Group by exercise for easy display
    const grouped: Record<string, Record<string, number>> = {};

    prs.forEach((pr) => {
      if (!grouped[pr.exerciseName]) {
        grouped[pr.exerciseName] = {};
      }
      grouped[pr.exerciseName][`${pr.repMax}rm`] = pr.weight;
    });

    return grouped;
  },
});

// Get PRs for a specific exercise
export const getPRsForExercise = query({
  args: {
    athleteName: v.string(),
    exerciseName: v.string(),
  },
  handler: async (ctx, args) => {
    const prs = await ctx.db
      .query("athletePRs")
      .withIndex("by_athlete_exercise", (q) =>
        q.eq("athleteName", args.athleteName).eq("exerciseName", args.exerciseName)
      )
      .collect();

    return prs;
  },
});

// Upsert a PR (create or update)
export const upsertPR = mutation({
  args: {
    athleteName: v.string(),
    exerciseName: v.string(),
    repMax: v.number(),
    weight: v.number(),
  },
  handler: async (ctx, args) => {
    // Check if PR already exists
    const existing = await ctx.db
      .query("athletePRs")
      .withIndex("by_athlete_exercise_rep", (q) =>
        q
          .eq("athleteName", args.athleteName)
          .eq("exerciseName", args.exerciseName)
          .eq("repMax", args.repMax)
      )
      .first();

    if (existing) {
      // Update existing PR
      await ctx.db.patch(existing._id, {
        weight: args.weight,
        recordedAt: Date.now(),
      });
      return existing._id;
    } else {
      // Create new PR
      const prId = await ctx.db.insert("athletePRs", {
        athleteName: args.athleteName,
        exerciseName: args.exerciseName,
        repMax: args.repMax,
        weight: args.weight,
        recordedAt: Date.now(),
      });
      return prId;
    }
  },
});

// Bulk upsert PRs (for saving all PRs at once from the UI)
export const bulkUpsertPRs = mutation({
  args: {
    athleteName: v.string(),
    prs: v.array(
      v.object({
        exerciseName: v.string(),
        repMax: v.number(),
        weight: v.number(),
      })
    ),
  },
  handler: async (ctx, args) => {
    const results = [];

    for (const pr of args.prs) {
      // Check if PR already exists
      const existing = await ctx.db
        .query("athletePRs")
        .withIndex("by_athlete_exercise_rep", (q) =>
          q
            .eq("athleteName", args.athleteName)
            .eq("exerciseName", pr.exerciseName)
            .eq("repMax", pr.repMax)
        )
        .first();

      if (existing) {
        // Update existing PR
        await ctx.db.patch(existing._id, {
          weight: pr.weight,
          recordedAt: Date.now(),
        });
        results.push(existing._id);
      } else {
        // Create new PR
        const prId = await ctx.db.insert("athletePRs", {
          athleteName: args.athleteName,
          exerciseName: pr.exerciseName,
          repMax: pr.repMax,
          weight: pr.weight,
          recordedAt: Date.now(),
        });
        results.push(prId);
      }
    }

    return results;
  },
});

// Delete a specific PR
export const deletePR = mutation({
  args: {
    athleteName: v.string(),
    exerciseName: v.string(),
    repMax: v.number(),
  },
  handler: async (ctx, args) => {
    const pr = await ctx.db
      .query("athletePRs")
      .withIndex("by_athlete_exercise_rep", (q) =>
        q
          .eq("athleteName", args.athleteName)
          .eq("exerciseName", args.exerciseName)
          .eq("repMax", args.repMax)
      )
      .first();

    if (pr) {
      await ctx.db.delete(pr._id);
      return true;
    }

    return false;
  },
});

// Delete all PRs for an athlete
export const deleteAllAthletePRs = mutation({
  args: {
    athleteName: v.string(),
  },
  handler: async (ctx, args) => {
    const prs = await ctx.db
      .query("athletePRs")
      .withIndex("by_athlete", (q) => q.eq("athleteName", args.athleteName))
      .collect();

    for (const pr of prs) {
      await ctx.db.delete(pr._id);
    }

    return prs.length;
  },
});
