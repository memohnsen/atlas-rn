import { v } from "convex/values";
import { query, mutation } from "./_generated/server";
import { getUserId } from "./auth";

// Get the next upcoming meet for an athlete
export const getNextMeet = query({
  args: {
    athleteName: v.string(),
  },
  handler: async (ctx, args) => {
    const userId = await getUserId(ctx);
    const meets = await ctx.db
      .query("athleteMeets")
      .withIndex("by_user_athlete", (q) =>
        q.eq("userId", userId).eq("athleteName", args.athleteName)
      )
      .collect();

    if (meets.length === 0) return null;

    // Find the closest future meet
    const today = new Date().toISOString().split("T")[0];
    const futureMeets = meets.filter((m) => m.meetDate >= today);

    if (futureMeets.length === 0) return null;

    // Sort by date ascending and return the closest one
    futureMeets.sort((a, b) => a.meetDate.localeCompare(b.meetDate));
    return futureMeets[0];
  },
});

// Set or update the next meet for an athlete
export const upsertMeet = mutation({
  args: {
    athleteName: v.string(),
    meetName: v.string(),
    meetDate: v.string(),
  },
  handler: async (ctx, args) => {
    const userId = await getUserId(ctx);
    // Remove any existing meets for this athlete
    const existing = await ctx.db
      .query("athleteMeets")
      .withIndex("by_user_athlete", (q) =>
        q.eq("userId", userId).eq("athleteName", args.athleteName)
      )
      .collect();

    for (const meet of existing) {
      await ctx.db.delete(meet._id);
    }

    // Insert the new meet
    return await ctx.db.insert("athleteMeets", {
      userId,
      athleteName: args.athleteName,
      meetName: args.meetName,
      meetDate: args.meetDate,
    });
  },
});

// Delete a meet
export const deleteMeet = mutation({
  args: {
    athleteName: v.string(),
  },
  handler: async (ctx, args) => {
    const userId = await getUserId(ctx);
    const meets = await ctx.db
      .query("athleteMeets")
      .withIndex("by_user_athlete", (q) =>
        q.eq("userId", userId).eq("athleteName", args.athleteName)
      )
      .collect();

    for (const meet of meets) {
      await ctx.db.delete(meet._id);
    }

    return meets.length;
  },
});
