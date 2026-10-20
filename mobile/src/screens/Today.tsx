import { Pressable, ScrollView, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { DAYS, Period, classLabel, countdown, fmt, greetingName, periodLabel, periodsOn, statuses, toMin } from '../core';
import { useStore } from '../store';
import { useTheme } from '../theme';
import { Btn, Card, T } from '../ui';

export function PeriodRow({ p, tag, onEdit, onBell }: { p: Period; tag?: 'live' | 'next' | 'done' | 'later'; onEdit: () => void; onBell: () => void }) {
  const { c } = useTheme();
  const bellOn = p.pre || p.at;
  return (
    <Pressable onPress={onEdit} testID="period-row">
      <Card style={{ marginBottom: 10, flexDirection: 'row', alignItems: 'center', gap: 12, opacity: tag === 'done' ? 0.55 : 1, borderColor: tag === 'next' ? c.next : c.border }}>
        <View style={{ width: 82 }}>
          <T weight="700">{fmt(p.start).replace(' ', ' ')}</T>
          <T size={12} muted>{fmt(p.end)}</T>
        </View>
        <View style={{ flex: 1 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
            <T weight="700" size={16}>{p.subject}</T>
            {tag === 'live' ? <T size={11} weight="800" color={c.onAmber} style={{ backgroundColor: c.amber, paddingHorizontal: 8, paddingVertical: 2, borderRadius: 8, overflow: 'hidden' }}>NOW</T> : null}
            {tag === 'next' ? <T size={11} weight="800" color={c.selText} style={{ backgroundColor: c.selBg, paddingHorizontal: 8, paddingVertical: 2, borderRadius: 8, overflow: 'hidden' }}>NEXT</T> : null}
          </View>
          <T size={13} muted>{[periodLabel(p), classLabel(p), p.room].filter(Boolean).join(' · ')}</T>
        </View>
        <Pressable testID="bell" hitSlop={10} onPress={onBell}
          style={{ width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center', backgroundColor: bellOn ? c.selBg : c.off }}>
          <T size={18}>{bellOn ? '🔔' : '🔕'}</T>
        </Pressable>
      </Card>
    </Pressable>
  );
}

export function Today({ now, onAdd, onEdit }: { now: Date; onAdd: () => void; onEdit: (p: Period) => void }) {
  const { c } = useTheme();
  const { state, update } = useStore();
  const day = now.getDay();
  const nowMin = now.getHours() * 60 + now.getMinutes();
  const nowSec = nowMin * 60 + now.getSeconds();
  const list = day === 6 && !state.settings.saturday ? [] : periodsOn(state.periods, day);
  const st = statuses(list, nowMin);
  const idx = st.findIndex((x) => x === 'live' || x === 'next');
  const hero = idx >= 0 ? list[idx] : null;
  const heroLive = idx >= 0 && st[idx] === 'live';

  const bell = (p: Period) => update((s) => ({
    ...s, periods: s.periods.map((x) => {
      if (x.id !== p.id) return x;
      const on = !(x.pre || x.at);
      return { ...x, pre: on, at: on };
    }),
  }));

  const dayName = DAYS.find((d) => d.n === day)?.long ?? (day === 0 ? 'Sunday' : 'Saturday');
  const dateStr = now.toLocaleDateString(undefined, { day: 'numeric', month: 'long' });

  return (
    <SafeAreaView edges={['top']} style={{ flex: 1, backgroundColor: c.bg }}>
      <ScrollView contentContainerStyle={{ padding: 18, paddingBottom: 30 }} testID="today">
        <T size={13} muted weight="600">{dayName}, {dateStr}</T>
        <T size={26} weight="800" testID="greeting">Hello, {greetingName(state.profile)}</T>

        <View testID="hero" style={{ backgroundColor: c.hero, borderRadius: 20, padding: 18, marginTop: 16, marginBottom: 18 }}>
          {hero ? (
            <>
              <T size={12} weight="800" color={heroLive ? c.amber : '#8FE3D3'} testID="hero-badge" style={{ letterSpacing: 1 }}>
                {heroLive ? 'IN SESSION' : `STARTS IN ${countdown(toMin(hero.start) * 60 - nowSec).toUpperCase()}`}
              </T>
              <T size={26} weight="800" color={c.onHero} style={{ marginTop: 6 }}>{hero.subject}</T>
              <T color="#CFE9E4" style={{ marginTop: 2 }}>{[periodLabel(hero), classLabel(hero), hero.room].filter(Boolean).join(' · ')}</T>
              <T color="#CFE9E4" style={{ marginTop: 10 }}>{fmt(hero.start)} – {fmt(hero.end)}</T>
              <View style={{ flexDirection: 'row', gap: 8, marginTop: 12, flexWrap: 'wrap' }}>
                {hero.pre ? <T size={12} color="#CFE9E4" style={{ backgroundColor: 'rgba(255,255,255,0.12)', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 999, overflow: 'hidden' }}>⏰ 5 min before · {fmt(minusFive(hero.start))}</T> : null}
                {hero.at ? <T size={12} color="#CFE9E4" style={{ backgroundColor: 'rgba(255,255,255,0.12)', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 999, overflow: 'hidden' }}>🔔 At start · {fmt(hero.start)}</T> : null}
              </View>
            </>
          ) : list.length ? (
            <>
              <T size={22} weight="800" color={c.onHero}>All done for today 🎉</T>
              <T color="#CFE9E4" style={{ marginTop: 4 }}>You've finished all {list.length} period{list.length > 1 ? 's' : ''}.</T>
            </>
          ) : (
            <>
              <T size={22} weight="800" color={c.onHero}>{state.periods.length ? 'No classes today' : 'No periods yet'}</T>
              <T color="#CFE9E4" style={{ marginTop: 4, marginBottom: 12 }}>{state.periods.length ? 'Enjoy the free day.' : 'Add your first period to start getting reminders.'}</T>
              {!state.periods.length ? <Btn testID="hero-add" label="Add a period" onPress={onAdd} /> : null}
            </>
          )}
        </View>

        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
          <T size={18} weight="800">Today's periods</T>
          <Pressable onPress={onAdd} testID="add"><T weight="700" color={c.primary}>+ Add</T></Pressable>
        </View>
        {list.length === 0 ? <T muted>Nothing scheduled.</T> : null}
        {list.map((p, i) => <PeriodRow key={p.id} p={p} tag={st[i]} onEdit={() => onEdit(p)} onBell={() => bell(p)} />)}
      </ScrollView>
    </SafeAreaView>
  );
}

const minusFive = (t: string) => {
  const m = toMin(t) - 5;
  const mm = (m + 1440) % 1440;
  return `${String(Math.floor(mm / 60)).padStart(2, '0')}:${String(mm % 60).padStart(2, '0')}`;
};
