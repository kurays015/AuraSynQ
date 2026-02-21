const ROOT_URL =
  process.env.NODE_ENV === "production"
    ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`
    : "http://localhost:3000";

/**
 * MiniApp configuration object. Must follow the Farcaster MiniApp specification.
 *
 * @see {@link https://miniapps.farcaster.xyz/docs/guides/publishing}
 */
export const miniappConfig = {
  accountAssociation: {
    header:
      "eyJmaWQiOjI2OTk4ODcsInR5cGUiOiJhdXRoIiwia2V5IjoiMHg5MEY0MkQ3OTRGNzI2MjFlMTRiRkUxN0VBMGE0RDVGQzNCNTI3NDFEIn0",
    payload: "eyJkb21haW4iOiJhdXJhc3lucS52ZXJjZWwuYXBwIn0",
    signature:
      "AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAACAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAABAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAEHsZmazSxtdHYHMF_FT7jHSSL9VWTAZScFH-rB4RApH4UwOINOwI8mPC4-71n40VvZ7sQoPeAYW1AALJjWUCBG7GwAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA",
  },
  miniapp: {
    version: "1",
    name: "AuraSynQ",
    subtitle: "A minimalist digital painting mini-app on Base App",
    description: "A minimalist digital painting mini-app on Base App",
    screenshotUrls: [`${ROOT_URL}/icon.png`],
    iconUrl: `${ROOT_URL}/icon.png`,
    splashImageUrl: `${ROOT_URL}/icon.png`,
    splashBackgroundColor: "#000000",
    homeUrl: ROOT_URL,
    webhookUrl: `${ROOT_URL}/api/webhook`,
    primaryCategory: "social",
    tags: ["art", "drawing", "painting", "canvas"],
    heroImageUrl: `${ROOT_URL}/icon.png`,
    tagline: "Create and share art on Base",
    ogTitle: "AuraSynQ",
    ogDescription: "A minimalist digital painting mini-app on Base App",
    ogImageUrl: `${ROOT_URL}/icon.png`,
  },
} as const;
