import { v } from "convex/values";
import { query, mutation } from "./_generated/server";

// Search exercises by name
export const searchExercises = query({
  args: {
    searchTerm: v.string(),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const allExercises = await ctx.db.query("exerciseLibrary").collect();

    // Filter by search term (case-insensitive partial match)
    const searchLower = args.searchTerm.toLowerCase();
    const filtered = allExercises.filter((ex) =>
      ex.name.toLowerCase().includes(searchLower)
    );

    // Sort by name
    filtered.sort((a, b) => a.name.localeCompare(b.name));

    return args.limit ? filtered.slice(0, args.limit) : filtered;
  },
});

// Get all exercises (paginated)
export const getAllExercises = query({
  args: {
    offset: v.optional(v.number()),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const exercises = await ctx.db.query("exerciseLibrary").collect();

    // Sort by name
    exercises.sort((a, b) => a.name.localeCompare(b.name));

    const offset = args.offset ?? 0;
    const limit = args.limit ?? 100;

    return {
      exercises: exercises.slice(offset, offset + limit),
      total: exercises.length,
      hasMore: offset + limit < exercises.length,
    };
  },
});

// Get exercise by name
export const getExerciseByName = query({
  args: {
    name: v.string(),
  },
  handler: async (ctx, args) => {
    const exercise = await ctx.db
      .query("exerciseLibrary")
      .withIndex("by_name", (q) => q.eq("name", args.name))
      .first();

    return exercise;
  },
});

// Add an exercise to the library
export const addExercise = mutation({
  args: {
    name: v.string(),
    primary: v.optional(v.string()),
    secondary: v.optional(v.string()),
    link: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    // Check if exercise already exists
    const existing = await ctx.db
      .query("exerciseLibrary")
      .withIndex("by_name", (q) => q.eq("name", args.name))
      .first();

    if (existing) {
      throw new Error(`Exercise "${args.name}" already exists`);
    }

    const exerciseId = await ctx.db.insert("exerciseLibrary", {
      name: args.name,
      primary: args.primary,
      secondary: args.secondary,
      link: args.link,
    });

    return exerciseId;
  },
});

// Update an exercise
export const updateExercise = mutation({
  args: {
    name: v.string(),
    primary: v.optional(v.string()),
    secondary: v.optional(v.string()),
    link: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const exercise = await ctx.db
      .query("exerciseLibrary")
      .withIndex("by_name", (q) => q.eq("name", args.name))
      .first();

    if (!exercise) {
      throw new Error(`Exercise "${args.name}" not found`);
    }

    await ctx.db.patch(exercise._id, {
      primary: args.primary,
      secondary: args.secondary,
      link: args.link,
    });

    return exercise._id;
  },
});

// Delete an exercise
export const deleteExercise = mutation({
  args: {
    name: v.string(),
  },
  handler: async (ctx, args) => {
    const exercise = await ctx.db
      .query("exerciseLibrary")
      .withIndex("by_name", (q) => q.eq("name", args.name))
      .first();

    if (exercise) {
      await ctx.db.delete(exercise._id);
      return true;
    }

    return false;
  },
});
