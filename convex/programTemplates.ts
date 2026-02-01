import { v } from "convex/values";
import { query, mutation } from "./_generated/server";

// Get all templates for a user
export const getTemplates = query({
  args: {
    userId: v.string(),
  },
  handler: async (ctx, args) => {
    const templates = await ctx.db
      .query("programTemplates")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .collect();

    return templates;
  },
});

// Get a specific template
export const getTemplate = query({
  args: {
    userId: v.string(),
    programName: v.string(),
  },
  handler: async (ctx, args) => {
    const template = await ctx.db
      .query("programTemplates")
      .withIndex("by_user_program", (q) =>
        q.eq("userId", args.userId).eq("programName", args.programName)
      )
      .first();

    return template;
  },
});

// Check if a template exists
export const checkTemplateExists = query({
  args: {
    userId: v.string(),
    programName: v.string(),
  },
  handler: async (ctx, args) => {
    const template = await ctx.db
      .query("programTemplates")
      .withIndex("by_user_program", (q) =>
        q.eq("userId", args.userId).eq("programName", args.programName)
      )
      .first();

    return template !== null;
  },
});

// Save a template (create or update)
export const saveTemplate = mutation({
  args: {
    userId: v.string(),
    programName: v.string(),
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
            exercises: v.array(
              v.object({
                exerciseNumber: v.number(),
                exerciseName: v.string(),
                exerciseCategory: v.optional(v.string()),
                exerciseNotes: v.optional(v.string()),
                supersetGroup: v.optional(v.string()),
                supersetOrder: v.optional(v.number()),
                sets: v.optional(v.number()),
                reps: v.string(),
                weights: v.optional(v.number()),
                percent: v.optional(v.number()),
              })
            ),
          })
        ),
      })
    ),
  },
  handler: async (ctx, args) => {
    // Check if template already exists
    const existing = await ctx.db
      .query("programTemplates")
      .withIndex("by_user_program", (q) =>
        q.eq("userId", args.userId).eq("programName", args.programName)
      )
      .first();

    if (existing) {
      // Update existing template
      await ctx.db.patch(existing._id, {
        weekCount: args.weekCount,
        repTargets: args.repTargets,
        weekTotals: args.weekTotals,
        weeks: args.weeks,
      });
      return existing._id;
    } else {
      // Create new template
      const templateId = await ctx.db.insert("programTemplates", {
        userId: args.userId,
        programName: args.programName,
        weekCount: args.weekCount,
        repTargets: args.repTargets,
        weekTotals: args.weekTotals,
        weeks: args.weeks,
      });
      return templateId;
    }
  },
});

// Delete a template
export const deleteTemplate = mutation({
  args: {
    userId: v.string(),
    programName: v.string(),
  },
  handler: async (ctx, args) => {
    const template = await ctx.db
      .query("programTemplates")
      .withIndex("by_user_program", (q) =>
        q.eq("userId", args.userId).eq("programName", args.programName)
      )
      .first();

    if (template && template.userId === args.userId) {
      await ctx.db.delete(template._id);
      return true;
    }

    return false;
  },
});

// Assign template to an athlete (creates a new program from template)
export const assignTemplateToAthlete = mutation({
  args: {
    templateId: v.id("programTemplates"),
    athleteName: v.string(),
    programName: v.optional(v.string()), // Optional custom program name
    startDate: v.string(),
  },
  handler: async (ctx, args) => {
    const template = await ctx.db.get(args.templateId);
    if (!template) throw new Error("Template not found");

    // Create program instance from template with completion tracking
    const programId = await ctx.db.insert("programs", {
      userId: template.userId,
      athleteName: args.athleteName,
      programName: args.programName || template.programName,
      startDate: args.startDate,
      weekCount: template.weekCount,
      repTargets: template.repTargets,
      weekTotals: template.weekTotals,
      weeks: template.weeks.map((week) => ({
        ...week,
        days: week.days.map((day) => ({
          ...day,
          completed: false,
          rating: undefined,
          completedAt: undefined,
          exercises: day.exercises.map((ex) => ({
            ...ex,
            completed: false,
            athleteComments: undefined,
          })),
        })),
      })),
    });

    return programId;
  },
});
