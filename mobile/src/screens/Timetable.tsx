import { useState } from 'react';
import { Pressable, ScrollView, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { DAYS, Period, periodsOn } from '../core';
import { useStore } from '../store';
import { useTheme } from '../theme';
import { T } from '../ui';
import { PeriodRow } from './Today';

export function Timetable({ today, onAdd, onEdit }: { today: number; onAdd: (day: number) => void; onEdit: (p: Period) => void }) {
  const { c } = useTheme();
  const { state, update } = useStore();
  const [day, setDay] = useState(today >= 1 && today <= 5 ? today : 1);
  const list = periodsOn(state.periods, day);

  const bell = (p: Period) => update((s) => ({
    ...s, periods: s.periods.map((x) => (x.id === p.id ? { ...x, pre: !(x.pre || x.at), at: !(x.pre || x.at) } : x)),
  }));

  return (
    <SafeAreaView edges={['top']} style={{ flex: 1, backgroundColor: c.bg }}>
      <ScrollView contentContainerStyle={{ padding: 18, paddingBottom: 30 }} testID="timetable">
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
          <T size={26} weight="800">Timetable</T>
          <Pressable onPress={() => onAdd(day)} testID="tt-add"><T weight="700" color={c.primary}>+ Add</T></Pressable>
        </View>
        <View style={{ flexDirection: 'row', gap: 8, marginVertical: 16 }}>
          {DAYS.map((d) => {
            const on = d.n === day;
            const n = periodsOn(state.periods, d.n).length;
            return (
              <Pressable key={d.n} testID={`day-${d.n}`} onPress={() => setDay(d.n)}
                style={{ flex: 1, alignItems: 'center', paddingVertical: 10, borderRadius: 14, borderWidth: 1, backgroundColor: on ? c.primary : c.surface, borderColor: on ? c.primary : c.border }}>
                <T size={13} weight="700" color={on ? c.onPrimary : c.text}>{d.short}</T>
                <T size={11} color={on ? c.onPrimary : c.muted}>{n} {n === 1 ? 'class' : 'classes'}</T>
              </Pressable>
            );
          })}
        </View>
        {list.length === 0 ? <T muted testID="tt-empty">No periods on {DAYS.find((d) => d.n === day)?.long}.</T> : null}
        {list.map((p) => <PeriodRow key={p.id} p={p} onEdit={() => onEdit(p)} onBell={() => bell(p)} />)}
      </ScrollView>
    </SafeAreaView>
  );
}
