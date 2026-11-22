# Firebase setup for cloud backup and sync

This guide connects Red Pen to your own Firebase project, so your phone, laptop and PC share one set of progress.
It takes about 15 minutes. Everything here is on the free **Spark** plan. You never need to add a credit card.

Steps 1–5 happen in the Firebase console. Step 6 puts the config in the app, and step 7 tests it.

1. Create a Firebase project
2. Register a web app (this gives you the config)
3. Turn on Google sign-in and allow your domains
4. Create the Firestore database
5. Publish the security rules
6. Put the config in the app
7. Test it on the laptop, then on the phone

> **Is the config secret?** No. The Firebase web config (apiKey, projectId, …) only identifies your project. It is meant to be in the page.
> Your data is protected by the **security rules** in step 5: only you, signed in with your Google account, can read or write your progress.
> Never put anything else (passwords, service-account files) in the repository.

---

## 1. Create a Firebase project

1. Open https://console.firebase.google.com and sign in with your Google account.
2. Click **Create a project** (or **Add project**).
3. Name: `red-pen` (any name works). Firebase adds a suffix to make the **project ID** unique, for example `red-pen-4a1b2`. Write the project ID down.
4. **Google Analytics:** turn it **off**. The app doesn't need it.
5. Click **Create project** and wait until it says it's ready. Click **Continue**.

The new project is on the **Spark (no-cost)** plan. Don't upgrade. If you ever go over the free limits, Firebase pauses that product until the next month; it does not charge you.

## 2. Register a web app

1. On the project overview page, click the **Web** icon (`</>`), or **Add app → Web**.
2. App nickname: `Red Pen web`.
3. Leave **"Also set up Firebase Hosting"** unticked. The app stays on GitHub Pages.
4. Click **Register app**.
5. Firebase shows a code block with `const firebaseConfig = { ... }`. **Copy only the object**, from `{` to `}`. It looks like this:

   ```js
   {
     apiKey: "AIza...",
     authDomain: "red-pen-4a1b2.firebaseapp.com",
     projectId: "red-pen-4a1b2",
     storageBucket: "red-pen-4a1b2.firebasestorage.app",
     messagingSenderId: "1234567890",
     appId: "1:1234567890:web:abc123"
   }
   ```

6. Click **Continue to console**. You don't need the npm instructions.

Lost it? **Project settings** (gear icon) → **General** → scroll to **Your apps** → **SDK setup and configuration** → **Config**.

## 3. Turn on Google sign-in

1. Left menu: **Build → Authentication** → **Get started**.
2. Tab **Sign-in method** → click **Google** in the list of providers.
3. Switch **Enable** on.
4. **Project support email:** choose your email. (Google shows it on the sign-in screen.)
5. Click **Save**. Google now shows as *Enabled*.

### Allow your domains

Sign-in only works on websites you list here.

1. Still in **Authentication**, open the **Settings** tab → **Authorized domains**.
2. `localhost` is usually already there. If not, click **Add domain** and add `localhost`.
3. Click **Add domain** and add: `arkiven4.github.io`

   Type only the domain: no `https://`, no `/english-red-ped`.

## 4. Create the Firestore database

1. Left menu: **Build → Firestore Database** → **Create database**.
2. If it asks for an **edition**, choose **Standard**.
3. **Database ID:** keep `(default)`.
4. **Location:** choose **`asia-southeast2` (Jakarta)**. It is closest to Indonesia, so syncing is faster.
   **You can't change the location later.**
5. **Security rules:** choose **Start in production mode** (everything locked). You replace the rules in the next step.
6. Click **Create**.

## 5. Publish the security rules

The rules are in this repository: [`firebase/firestore.rules`](../firebase/firestore.rules). They say:

- each user can read and write only their own document, `users/{their uid}`;
- the document can only have the fields the app writes, and the progress must be smaller than 800 KB;
- everything else is closed.

### Option A: in the browser (easiest)

1. **Firestore Database** → tab **Rules**.
2. Delete everything in the editor.
3. Open `firebase/firestore.rules`, copy all of it, and paste it into the editor.
4. Click **Publish**.

### Option B: with the Firebase CLI

From the repository folder:

```bash
npx firebase-tools@15 login
npx firebase-tools@15 deploy --only firestore:rules --config firebase/firebase.json --project YOUR-PROJECT-ID
```

Use Option B again whenever `firestore.rules` changes, or repeat Option A.

## 6. Put the config in the app

Either send me the config object from step 2, or do it yourself:

1. Open `firebase-config.js` and replace `null` with your object:

   ```js
   window.REDPEN_FIREBASE = {
     apiKey: "AIza...",
     authDomain: "red-pen-4a1b2.firebaseapp.com",
     projectId: "red-pen-4a1b2",
     storageBucket: "red-pen-4a1b2.firebasestorage.app",
     messagingSenderId: "1234567890",
     appId: "1:1234567890:web:abc123"
   };
   ```

2. In `sw.js`, change `VERSION` (for example, the last letter `a` → `b`). Otherwise the installed app keeps the old file without the config.
3. Commit and push. GitHub Pages updates in about a minute.

## 7. Test it

**On the laptop first** (easiest to debug):

1. Run `python3 -m http.server 8000` and open http://localhost:8000.
2. **Progress** tab → **Cloud backup** → **Sign in with Google**. A Google window opens. Choose your account.
3. The card should say **Signed in as …** and **Synced just now**.
4. In the Firebase console → **Firestore Database** → **Data**, you should see `users` → one document with `state`, `schema` and `updatedAt`.

**Then on the phone** (the installed app):

1. Open the app. If it doesn't show the Cloud backup card, close it fully and open it again (the new version downloads in the background).
2. **Progress → Sign in with Google.** Check that:
   - the Google window opens, and you can pick your account;
   - after picking it, you come back to Red Pen and the card says **Synced just now**.
3. Do one lesson on the phone. Then open **Progress** on the laptop, tap **Sync now**: the phone's XP should appear.
4. Put the phone in airplane mode, do a lesson, turn airplane mode off and open the app again: the card should go back to **Synced**.

If the Google window opens but you never come back to the app in step 2, tell me. That is the known risk with sign-in inside an installed app, and there are fixes for it.

## Troubleshooting

| What you see | Cause and fix |
|---|---|
| No **Cloud backup** card at all | `firebase-config.js` is still `null`, or the app is an old cached version: bump `VERSION` in `sw.js`, then close and reopen the app. |
| "This site is not authorized for sign-in yet" | Step 3, *Authorized domains*: add the exact domain (`arkiven4.github.io` or `localhost`). |
| "The sign-in window was blocked" | Allow pop-ups for the site in the browser settings, then try again. |
| "The cloud refused the sync" | The rules from step 5 were not published, or they were changed. Publish them again. |
| "Your progress is too large to back up" | Should not happen (the limit is far above normal use). Export a backup file and tell me. |
| Grey dot, "Offline" | Normal. It syncs by itself when you're back online. |

You can see how much of the free quota you use in **Firestore Database → Usage**. Each sync is about one read and one write. The free daily limit is 50,000 reads and 20,000 writes.

## Optional: restrict the API key

This is extra protection against other websites using your key. It is not required.

1. Open https://console.cloud.google.com/apis/credentials and choose your Firebase project at the top.
2. Click the key named **Browser key (auto created by Firebase)**.
3. **Application restrictions → Websites**, and add:
   - `https://arkiven4.github.io/*`
   - `http://localhost:8000/*`
   - `https://YOUR-PROJECT-ID.firebaseapp.com/*` (needed for the sign-in window)
4. **Save.** Changes take up to 5 minutes. If sign-in breaks afterwards, remove the restriction again.

## For developers: tests with the emulators

The tests don't need a real project. They use the Firebase emulators (Java is required):

```bash
cd tests
npm install
npm run unit   # merge rules (Node only)
npm run e2e    # browser tests, three-device sync on the emulators, security rules
```

Add `?emu` to the URL on localhost to make the app use the emulators instead of the real project.
