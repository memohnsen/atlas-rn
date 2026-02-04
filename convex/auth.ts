import { MutationCtx, QueryCtx } from "./_generated/server";

type Ctx = MutationCtx | QueryCtx;

export async function getUserId(ctx: Ctx) {
  const identity = await ctx.auth.getUserIdentity();
  if (!identity) {
    throw new Error("Unauthenticated");
  }
  const adminUserId =
    process.env.ADMIN_CLERK_USER_ID ??
    "user_2vH3UoiRGEC3ux7UPTAetUE2wAQ";
  if (identity.subject !== adminUserId) {
    throw new Error("Unauthorized");
  }
  return identity.subject;
}
