/* Red Pen cloud sync (optional). Loaded with import() only when the user is signed in or taps "Sign in",
   so the offline app never depends on Firebase. The SDK version is pinned; sw.js caches these files.
   One Firestore document per user: users/{uid} = { state: JSON string, schema, updatedAt }.
   A sync reads the document, merges it with local progress (merge.js) and writes the result back,
   all in one transaction, so two devices syncing at the same time can't overwrite each other. */
const V = "13.2.0";
const CDN = `https://www.gstatic.com/firebasejs/${V}/`;
const [{ initializeApp }, A, F] = await Promise.all([
  import(CDN + "firebase-app.js"), import(CDN + "firebase-auth.js"), import(CDN + "firebase-firestore-lite.js")]);

export const SDK_VERSION = V;

/* host = { config, emulator, getState(), applyMerged(merged), status(kind, info), merge(local, remote), forCloud(s), schema } */
export function start(host) {
  const app = initializeApp(host.config);
  const auth = A.getAuth(app);
  const db = F.getFirestore(app);
  if (host.emulator) {
    A.connectAuthEmulator(auth, "http://127.0.0.1:9099", { disableWarnings: true });
    F.connectFirestoreEmulator(db, "127.0.0.1", 8080);
  }
  let running = null, again = false;

  async function syncOnce() {
    const user = auth.currentUser;
    if (!user) return;
    if (!navigator.onLine) return host.status("offline");
    host.status("syncing");
    try {
      const ref = F.doc(db, "users", user.uid);
      const merged = await F.runTransaction(db, async tx => {
        const snap = await tx.get(ref);
        let cloud = null;
        if (snap.exists()) { try { cloud = JSON.parse(snap.data().state); } catch (e) { cloud = null; } }
        const m = host.merge(host.getState(), cloud);
        const out = JSON.stringify(host.forCloud(m));
        if (!snap.exists() || snap.data().state !== out) tx.set(ref, { state: out, schema: host.schema, updatedAt: F.serverTimestamp() });
        return m;
      });
      host.applyMerged(merged);
      host.status("synced", Date.now());
    } catch (e) {
      const offline = !navigator.onLine || e.code === "unavailable" || e.code === "deadline-exceeded" || /network|offline|fetch/i.test(e.message || "");
      if (offline) host.status("offline");
      else if (e.code === "permission-denied" || e.code === "unauthenticated") host.status("error", "The cloud refused the sync. Try signing out and in again.");
      else if (e.code === "invalid-argument" || e.code === "resource-exhausted") host.status("error", "Your progress is too large to back up. Export a backup file instead.");
      else host.status("error", "Sync failed. It will try again later.");
      console.warn("Red Pen sync:", e.code || "", e.message);
    }
  }
  // one sync at a time; a request during a sync runs once more afterwards
  function syncNow() {
    if (running) { again = true; return running; }
    running = syncOnce().finally(() => { running = null; if (again) { again = false; syncNow(); } });
    return running;
  }

  async function signIn() {
    const provider = new A.GoogleAuthProvider();
    provider.setCustomParameters({ prompt: "select_account" });
    await A.signInWithPopup(auth, provider); // popup, not redirect: redirect breaks on github.io (third-party storage partitioning)
  }
  async function signOut() { await A.signOut(auth); }

  A.onAuthStateChanged(auth, user => {
    host.user(user ? { uid: user.uid, email: user.email, name: user.displayName } : null);
    if (user) syncNow();
  });

  return { syncNow, signIn, signOut };
}
