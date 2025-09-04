export const PLANS = {
    free: {
        id: "free",
        searchesPerDay: 130,
        creditsPerDay: 130,
        unlimitedSearches: false,
    },
    pro: {
        id: "pro",
        searchesPerDay: 999999,
        creditsPerDay: 2000,
        unlimitedSearches: true,
    },
    creator: {
        id: "creator",
        searchesPerDay: 999999,
        creditsPerDay: 6000,
        unlimitedSearches: true,
    },
    infinity: {
        id: "infinity",
        searchesPerDay: 999999,
        creditsPerDay: 999999,
        unlimitedSearches: true,
    },
};
export const DEFAULT_TIMEZONE = "Asia/Kolkata";
