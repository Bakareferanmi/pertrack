export const TITLES = ['Mr.', 'Mrs.', 'Miss', 'Ms.', 'Dr.', 'Prof.'] as const;
export type Title = (typeof TITLES)[number];

export type Period = {
  id: string;
  subject: string;
  level: string;      // JSS 1..3 | SS 1..3
  division: string;   // Ruby/Scarlet/Emerald | Science/Art/Commercial
  days: number[];     // 1=Mon .. 5=Fri (JS getDay)
  start: string;      // "HH:MM" 24h
  end: string;
  room: string;
  pre: boolean;       // 5 minutes before
  at: boolean;        // at start time
};

export type State = {
  v: 1;
  profile: { name: string; title: Title } | null;
  subjects: string[];
  periods: Period[];
  settings: { theme: 'auto' | 'light' | 'dark'; sound: boolean };
};

export const EMPTY: State = {
  v: 1, profile: null, subjects: [], periods: [],
  settings: { theme: 'auto', sound: true },
};

export const LEVELS = ['JSS 1', 'JSS 2', 'JSS 3', 'SS 1', 'SS 2', 'SS 3'];
export const DAYS = [
  { n: 1, short: 'Mon', long: 'Monday' }, { n: 2, short: 'Tue', long: 'Tuesday' },
  { n: 3, short: 'Wed', long: 'Wednesday' }, { n: 4, short: 'Thu', long: 'Thursday' },
  { n: 5, short: 'Fri', long: 'Friday' },
];

export const divisionsFor = (level: string) =>
  level.startsWith('JSS') ? ['Ruby', 'Scarlet', 'Emerald'] : ['Science', 'Art/Commercial'];

export const uid = () => Math.random().toString(36).slice(2, 10) + Date.now().toString(36).slice(-4);

export const toMin = (t: string) => {
  const [h, m] = t.split(':').map(Number);
  return h * 60 + m;
};

export const fmt = (t: string) => {
  const [h, m] = t.split(':').map(Number);
  const hh = h % 12 === 0 ? 12 : h % 12;
  return `${hh}:${String(m).padStart(2, '0')} ${h < 12 ? 'AM' : 'PM'}`;
};

export const validTime = (t: string) => /^([01]\d|2[0-3]):[0-5]\d$/.test(t);

export const greetingName = (p: State['profile']) => {
  if (!p) return '';
  const last = p.name.trim().split(/\s+/).pop() ?? '';
  return `${p.title} ${last}`;
};

export const classLabel = (p: Period) => `${p.level} ${p.division}`;

export const byStart = (a: Period, b: Period) => toMin(a.start) - toMin(b.start);

export const periodsOn = (periods: Period[], day: number) =>
  periods.filter((p) => p.days.includes(day)).sort(byStart);

export type Status = 'done' | 'live' | 'next' | 'later';

/** Status of each of today's periods given the current minute-of-day. */
export const statuses = (list: Period[], nowMin: number): Status[] => {
  let nextTaken = false;
  return list.map((p) => {
    if (nowMin >= toMin(p.end)) return 'done';
    if (nowMin >= toMin(p.start)) return 'live';
    if (!nextTaken) { nextTaken = true; return 'next'; }
    return 'later';
  });
};

export const countdown = (secs: number) => {
  if (secs < 60) return `${Math.max(secs, 0)}s`;
  const m = Math.floor(secs / 60);
  if (m < 60) return `${m} min`;
  return `${Math.floor(m / 60)}h ${m % 60}m`;
};
