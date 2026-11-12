# PERTRACK

Class-period reminders for teachers: a nudge **5 minutes before** and **at the start** of every period.
No account, no database. All data lives on the device (localStorage on web, AsyncStorage on mobile).

```
pertrack/
├─ web/      PWA: index.html, sw.js, manifest.json, icons (no build step)
├─ mobile/   React Native (Expo, TypeScript) app
├─ worker/   Cloudflare Worker that pushes reminders to the PWA when it is closed
└─ package.json   shortcuts
```

## Web (PWA)
```
npm run web            # or open web/ with VS Code Live Server
```
Reminders fire while the app is open or in the background and the page uses one timer that sleeps until the next reminder is due (no constant polling, so little battery). A closed browser cannot wake itself, so for closed-app reminders either use the Android app or set up the push worker below.

## Mobile
```
npm run install:mobile
npm run mobile         # scan the QR code with Expo Go
```
Reminders are scheduled as weekly repeating local notifications, so they fire even when the app is closed.
Notifications need a real build on Android (Expo Go on Android SDK 53+ no longer supports them). Build an installable APK with EAS:
```
cd mobile
npm install
npx eas-cli login
npx eas-cli init
npx eas-cli build --platform android --profile preview
```
Use `--profile production` for a Play Store `.aab`.
iOS keeps at most 64 scheduled notifications; the app schedules the soonest 60 and warns in Settings if it has to trim.

## Data model (identical on both platforms, key `pertrack:v1`)
`{ v, profile:{name,title}, subjects:[], periods:[{id,subject,level,division,days:[1-5],start,end,room,pre,at}], settings:{theme,sound} }`

## Closed-app reminders for the PWA (Web Push)
A browser can't ring at a set time when the app is closed, so a tiny always-on server does it: `worker/` is a Cloudflare Worker with a one-minute cron. When someone turns on **Settings → Closed-app reminders**, the PWA sends the worker its reminder times (class, room, time; never the teacher's name) tied to an anonymous push address. Each minute the worker pushes whatever is due. It costs nothing on Cloudflare's free plan, and uses almost no battery on the phone.

One-time setup (needs a free Cloudflare account):
```
cd worker
npm install
npx wrangler login
npx wrangler d1 create pertrack          # copy the printed database_id into wrangler.toml
npm run db                               # creates the tables
npm run keys                             # prints a VAPID key pair
npx wrangler secret put VAPID_PUBLIC     # paste the public key
npx wrangler secret put VAPID_PRIVATE    # paste the private key
npm run deploy                           # prints https://pertrack-push.<you>.workers.dev
```
Then in `web/index.html` set `PUSH_URL` to that address and `PUSH_KEY` to the public key, redeploy the PWA, and set `ALLOWED_ORIGIN` in `worker/wrangler.toml` to your PWA's address (then `npm run deploy` again). Open the PWA over HTTPS, install it, switch the setting on and tap **Test**.

- Android: Chrome, installed or not. iPhone: iOS 16.4+, and only after **Share → Add to Home Screen**.
- Free-plan limit: about 45 pushes can go out in the same minute (for example many teachers whose school starts at 08:00). The $5/month Workers plan lifts that to about 1,000.
- Leave `PUSH_URL` empty and the app stays fully offline with no server and no extra settings.
