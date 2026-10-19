import { Platform } from 'react-native';
import * as Notifications from 'expo-notifications';
import { Period, State, classLabel, fmt, greetingName, toMin } from './core';

const IOS_LIMIT = 60; // iOS keeps at most 64 pending local notifications

if (Platform.OS !== 'web') {
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowBanner: true, shouldShowList: true, shouldPlaySound: true, shouldSetBadge: false,
    }),
  });
}

async function ensureChannels() {
  if (Platform.OS !== 'android') return;
  await Notifications.setNotificationChannelAsync('classes', {
    name: 'Class reminders', importance: Notifications.AndroidImportance.HIGH,
    vibrationPattern: [0, 250, 150, 250], lightColor: '#0B7A6B', sound: 'default',
  });
  await Notifications.setNotificationChannelAsync('classes-silent', {
    name: 'Class reminders (silent)', importance: Notifications.AndroidImportance.DEFAULT, sound: null,
  });
}

export async function permissionGranted(): Promise<boolean> {
  if (Platform.OS === 'web') return false;
  const p = await Notifications.getPermissionsAsync();
  return p.granted;
}

export async function askPermission(): Promise<boolean> {
  if (Platform.OS === 'web') return false;
  await ensureChannels();
  const cur = await Notifications.getPermissionsAsync();
  if (cur.granted) return true;
  const req = await Notifications.requestPermissionsAsync();
  return req.granted;
}

type Slot = { period: Period; kind: 'pre' | 'at'; weekday: number; hour: number; minute: number; rank: number };

/** Build every weekly reminder slot. expo weekday: 1=Sunday..7=Saturday. */
export function buildSlots(periods: Period[], now = new Date()): Slot[] {
  const slots: Slot[] = [];
  const nowRank = now.getDay() * 1440 + now.getHours() * 60 + now.getMinutes();
  for (const p of periods) {
    for (const d of p.days) {
      for (const kind of ['pre', 'at'] as const) {
        if (!p[kind]) continue;
        let m = toMin(p.start) - (kind === 'pre' ? 5 : 0);
        let day = d;
        if (m < 0) { m += 1440; day = day === 0 ? 6 : day - 1; }
        const abs = day * 1440 + m;
        const rank = (abs - nowRank + 7 * 1440) % (7 * 1440); // minutes until next fire
        slots.push({ period: p, kind, weekday: day + 1, hour: Math.floor(m / 60), minute: m % 60, rank });
      }
    }
  }
  return slots.sort((a, b) => a.rank - b.rank);
}

export async function syncReminders(state: State): Promise<{ scheduled: number; capped: boolean }> {
  if (Platform.OS === 'web') return { scheduled: 0, capped: false };
  await Notifications.cancelAllScheduledNotificationsAsync();
  if (!(await permissionGranted())) return { scheduled: 0, capped: false };
  await ensureChannels();

  let slots = buildSlots(state.periods);
  const capped = Platform.OS === 'ios' && slots.length > IOS_LIMIT;
  if (capped) slots = slots.slice(0, IOS_LIMIT);

  const who = greetingName(state.profile);
  for (const s of slots) {
    const room = s.period.room ? ` · ${s.period.room}` : '';
    await Notifications.scheduleNotificationAsync({
      content: {
        title: s.kind === 'pre'
          ? `${s.period.subject} starts in 5 minutes`
          : `Time for ${s.period.subject}`,
        body: `${classLabel(s.period)} · ${fmt(s.period.start)}${room}${who ? ` — ${who}` : ''}`,
        sound: state.settings.sound,
        data: { periodId: s.period.id, kind: s.kind },
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.WEEKLY,
        weekday: s.weekday, hour: s.hour, minute: s.minute,
        channelId: state.settings.sound ? 'classes' : 'classes-silent',
      },
    });
  }
  return { scheduled: slots.length, capped };
}

export async function sendTest(sound: boolean) {
  if (Platform.OS === 'web') return;
  await ensureChannels();
  await Notifications.scheduleNotificationAsync({
    content: { title: 'PERTRACK test', body: 'Reminders are working on this phone.', sound },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL, seconds: 3,
      channelId: sound ? 'classes' : 'classes-silent',
    },
  });
}
