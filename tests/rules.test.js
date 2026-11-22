// Firestore security rules, run against the emulator (see package.json "e2e").
const assert = require("node:assert/strict");
const { initializeApp } = require("firebase/app");
const F = require("firebase/firestore/lite");

const host = (process.env.FIRESTORE_EMULATOR_HOST || "127.0.0.1:8080").split(":");
function as(uid) {
  const app = initializeApp({ projectId: "demo-redpen", apiKey: "demo-key" }, "app-" + (uid || "anon") + Math.random());
  const db = F.getFirestore(app);
  F.connectFirestoreEmulator(db, host[0], +host[1], uid ? { mockUserToken: { user_id: uid, sub: uid } } : undefined);
  return db;
}
const ok = (p, msg) => p.then(() => {}, e => assert.fail(`${msg}: ${e.code} ${e.message}`));
const denied = (p, msg) => p.then(() => assert.fail(`${msg}: was allowed`), e => assert.equal(e.code, "permission-denied", msg));
const good = (extra = {}) => ({ state: JSON.stringify({ v: 2, xp: 1 }), schema: 2, updatedAt: F.serverTimestamp(), ...extra });

(async () => {
  const alice = as("alice"), bob = as("bob"), anon = as(null);
  const ref = db => F.doc(db, "users", "alice");

  await ok(F.setDoc(ref(alice), good()), "owner can create");
  await ok(F.getDoc(ref(alice)), "owner can read");
  await ok(F.setDoc(ref(alice), good({ state: "{}" })), "owner can update");
  await denied(F.getDoc(ref(bob)), "another user cannot read");
  await denied(F.setDoc(ref(bob), good()), "another user cannot write");
  await denied(F.getDoc(ref(anon)), "signed-out cannot read");
  await denied(F.setDoc(ref(anon), good()), "signed-out cannot write");
  await denied(F.setDoc(ref(alice), good({ state: "x".repeat(800001) })), "oversized state refused");
  await denied(F.setDoc(ref(alice), good({ extra: 1 })), "unknown fields refused");
  await denied(F.setDoc(ref(alice), good({ state: { v: 2 } })), "state must be a string");
  await denied(F.setDoc(ref(alice), good({ updatedAt: new Date(0) })), "updatedAt must be server time");
  await denied(F.setDoc(F.doc(alice, "other", "x"), { a: 1 }), "other collections closed");
  await denied(F.getDocs(F.collection(alice, "users")), "cannot list all users");
  await ok(F.deleteDoc(ref(alice)), "owner can delete");
  console.log("ok firestore rules (13 checks)");
  process.exit(0);
})().catch(e => { console.error(e); process.exit(1); });
