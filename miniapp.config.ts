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
            "eyJmaWQiOjIzNzk2NzMsInR5cGUiOiJhdXRoIiwia2V5IjoiMHhCM0M5OEU5RWY0M2Y3ODJEZWIwOTVjMGM1NTcyRjZCNjQ4QzZENDExIn0",
        payload: "eyJkb21haW4iOiJiYXNlbWluaWFwcC10ZXN0LnZlcmNlbC5hcHAifQ",
        signature:
            "AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAACAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAABAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAEEvx_2fBRnwV7sO_jYN39zB4E93x4ykU8cFiaAxoWn6zmBxJRhsCM3LF7y4fl5dIx4RfVE2sRwDIBEvUh5e0KYmHAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA",
    },
    miniapp: {
        version: "1",
        name: "AuraSynQ",
        subtitle: "A painting mini-app on base app",
        description: "A minimalist digital painting mini-app on base app",
        screenshotUrls: [`${ROOT_URL}/icon.png`],
        iconUrl: `${ROOT_URL}/icon.png`,
        splashImageUrl: `${ROOT_URL}/icon.png`,
        splashBackgroundColor: "#000000",
        homeUrl: ROOT_URL,
        webhookUrl: `${ROOT_URL}/api/webhook`,
        primaryCategory: "social",
        tags: ["art", "drawing", "painting", "canvas"],
        heroImageUrl: `${ROOT_URL}/icon.png`,
        tagline: "",
        ogTitle: "",
        ogDescription: "",
        ogImageUrl: `${ROOT_URL}/icon.png`,
    },
} as const;
