import { MutationCtx, QueryCtx } from "./_generated/server";

type Ctx = MutationCtx | QueryCtx;

export async function getUserId(ctx: Ctx) {
  const identity = await ctx.auth.getUserIdentity();
  if (!identity) {
    throw new Error("Unauthenticated");
  }
  return identity.subject;
}
