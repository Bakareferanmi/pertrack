# PERTRACK

Class-period reminders for teachers: a nudge **5 minutes before** and **at the start** of every period.
No account, no database. All data lives on the device (localStorage on web, AsyncStorage on mobile).

```
pertrack/
├─ web/      PWA: index.html, sw.js, manifest.json, icons (no build step)
├─ mobile/   React Native (Expo, TypeScript) app
└─ package.json   shortcuts
```

## Web (PWA)
```
npm run web            # or open web/ with VS Code Live Server
```
Reminders fire while the app is open or in the background. A closed browser cannot wake itself, so use the mobile app for closed-app reminders.

## Mobile
```
npm run install:mobile
npm run mobile         # scan the QR code with Expo Go
```
Reminders are scheduled as weekly repeating local notifications, so they fire even when the app is closed.
Notifications need a development/production build on Android (Expo Go on Android SDK 53+ no longer supports them):
```
cd mobile
npx expo install expo-dev-client
npx eas build --profile development --platform android
```
iOS keeps at most 64 scheduled notifications; the app schedules the soonest 60 and warns in Settings if it has to trim.

## Data model (identical on both platforms, key `pertrack:v1`)
`{ v, profile:{name,title}, subjects:[], periods:[{id,subject,level,division,days:[1-5],start,end,room,pre,at}], settings:{theme,sound} }`
