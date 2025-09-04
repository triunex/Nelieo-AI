import * as admin from "firebase-admin";
import * as functions from "firebase-functions";
import { computeNextReset, isPast } from "./time.js";
import { PLANS } from "./config.js";
const db = admin.firestore();
export const checkAndConsume = functions.https.onCall(async (data, ctx) => {
    const uid = ctx.auth?.uid;
    if (!uid)
        throw new functions.https.HttpsError("unauthenticated", "Sign in required");
    const userRef = db.doc(`users/${uid}`);
    await db.runTransaction(async (tx) => {
        const snap = await tx.get(userRef);
        if (!snap.exists)
            throw new functions.https.HttpsError("not-found", "User not found");
        const user = snap.data();
        const plan = PLANS[user.planId || "free"] ?? PLANS.free;
        // auto reset when past nextResetAt
        const nextResetAtMillis = user?.nextResetAt?.toMillis
            ? user.nextResetAt.toMillis()
            : 0;
        if (nextResetAtMillis && isPast(nextResetAtMillis)) {
            tx.update(userRef, {
                searchesRemaining: plan.searchesPerDay,
                creditsRemaining: plan.creditsPerDay,
                lastResetAt: admin.firestore.FieldValue.serverTimestamp(),
                nextResetAt: computeNextReset(user.timezone || "UTC").toDate(),
                updatedAt: admin.firestore.FieldValue.serverTimestamp(),
            });
            user.searchesRemaining = plan.searchesPerDay;
            user.creditsRemaining = plan.creditsPerDay;
        }
        // Load credit costs from config/creditCosts
        const costsDoc = await tx.get(db.doc("config/creditCosts"));
        const costs = ((costsDoc.exists
            ? costsDoc.data()?.costs
            : null) || {});
        const action = data.action;
        const cost = typeof data.cost === "number" ? data.cost : costs[action];
        if (typeof cost !== "number") {
            throw new functions.https.HttpsError("invalid-argument", "Unknown action or cost");
        }
        if (action === "search" && !plan.unlimitedSearches) {
            if ((user.searchesRemaining ?? 0) < 1) {
                throw new functions.https.HttpsError("resource-exhausted", "Search limit reached");
            }
            tx.update(userRef, {
                searchesRemaining: admin.firestore.FieldValue.increment(-1),
                updatedAt: admin.firestore.FieldValue.serverTimestamp(),
            });
        }
        if ((user.creditsRemaining ?? 0) < cost && plan.id !== "infinity") {
            throw new functions.https.HttpsError("resource-exhausted", "Not enough credits");
        }
        if (plan.id !== "infinity") {
            tx.update(userRef, {
                creditsRemaining: admin.firestore.FieldValue.increment(-cost),
                updatedAt: admin.firestore.FieldValue.serverTimestamp(),
            });
        }
        const logRef = db.collection("usageLogs").doc();
        tx.set(logRef, {
            uid,
            action,
            cost,
            at: admin.firestore.FieldValue.serverTimestamp(),
            planId: plan.id,
        });
    });
    return { ok: true };
});
