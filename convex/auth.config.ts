import { AuthConfig } from "convex/server";

export default {
  providers: [
    {
      type: "customJwt",
      issuer: process.env.CLERK_ISSUER!,
      jwks: process.env.CLERK_JWKS_URL!,
      applicationID: process.env.CLERK_AUDIENCE!,
      algorithm: "RS256",
    },
  ],
} satisfies AuthConfig;
