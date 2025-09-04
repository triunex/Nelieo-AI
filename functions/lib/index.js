import * as admin from "firebase-admin";
import * as functions from "firebase-functions";
import { computeNextReset } from "./time.js";
import { PLANS, DEFAULT_TIMEZONE } from "./config.js";
export { checkAndConsume } from "./usage.js";
admin.initializeApp();
const db = admin.firestore();
export const onAuthCreate = functions.auth.user().onCreate(async (user) => {
    const plan = PLANS.free;
    const nextResetAt = computeNextReset(DEFAULT_TIMEZONE).toDate();
    await db.doc(`users/${user.uid}`).set({
        planId: plan.id,
        searchesRemaining: plan.searchesPerDay,
        creditsRemaining: plan.creditsPerDay,
        lastResetAt: admin.firestore.FieldValue.serverTimestamp(),
        nextResetAt,
        timezone: DEFAULT_TIMEZONE,
        status: "active",
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    }, { merge: true });
});
