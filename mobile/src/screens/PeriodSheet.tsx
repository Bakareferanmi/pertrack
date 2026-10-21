import { useState } from 'react';
import { KeyboardAvoidingView, Modal, Platform, Pressable, ScrollView, TextInput, View } from 'react-native';
import { AmPm, DAYS, LEVELS, Period, daysFor, divisionsFor, from12, startDay, to12, toMin, uid } from '../core';
import { useStore } from '../store';
import { useTheme } from '../theme';
import { Btn, Chip, Label, Row, T, Toggle } from '../ui';

// Types as digits and shows h:mm  ("830" -> "8:30", "1005" -> "10:05"); AM/PM is picked separately.
const maskTime = (v: string) => {
  const d = v.replace(/\D/g, '').slice(0, 4);
  return d.length > 2 ? `${d.slice(0, d.length - 2)}:${d.slice(-2)}` : d;
};

export function PeriodSheet({ period, defaultDay, onClose }: { period?: Period; defaultDay: number; onClose: () => void }) {
  const { c } = useTheme();
  const { state, update } = useStore();
  const [subject, setSubject] = useState(period?.subject ?? state.subjects[0] ?? '');
  const [level, setLevel] = useState(period?.level ?? 'JSS 1');
  const [division, setDivision] = useState(period?.division ?? 'Ruby');
  const [days, setDays] = useState<number[]>(period?.days ?? [startDay(defaultDay, state.settings.saturday)]);
  const [start, setStart] = useState(period ? to12(period.start).text : '');
  const [startAp, setStartAp] = useState<AmPm>(period ? to12(period.start).ap : 'AM');
  const [end, setEnd] = useState(period ? to12(period.end).text : '');
  const [endAp, setEndAp] = useState<AmPm>(period ? to12(period.end).ap : 'AM');
  const [room, setRoom] = useState(period?.room ?? '');
  const [num, setNum] = useState(period?.period ?? '');
  const [pre, setPre] = useState(period?.pre ?? true);
  const [at, setAt] = useState(period?.at ?? true);
  const [err, setErr] = useState('');

  const pickLevel = (l: string) => {
    setLevel(l);
    if (!divisionsFor(l).includes(division)) setDivision(divisionsFor(l)[0]);
  };
  const toggleDay = (n: number) => setDays(days.includes(n) ? days.filter((d) => d !== n) : [...days, n].sort());

  const save = () => {
    if (!subject.trim()) return setErr('Choose or type a subject.');
    if (!days.length) return setErr('Pick at least one day.');
    if (!num.trim()) return setErr('Enter the period number (e.g. 3).');
    const start24 = from12(start, startAp), end24 = from12(end, endAp);
    if (!start24 || !end24) return setErr('Enter times like 8:30 and choose AM or PM.');
    if (toMin(end24) <= toMin(start24)) return setErr('End time must be after start time.');
    const next: Period = { id: period?.id ?? uid(), subject: subject.trim(), level, division, days, start: start24, end: end24, room: room.trim(), period: num.trim(), pre, at };
    update((s) => {
      const subjects = s.subjects.some((x) => x.toLowerCase() === next.subject.toLowerCase()) ? s.subjects : [...s.subjects, next.subject];
      const periods = period ? s.periods.map((p) => (p.id === period.id ? next : p)) : [...s.periods, next];
      return { ...s, subjects, periods };
    });
    onClose();
  };
  const del = () => { update((s) => ({ ...s, periods: s.periods.filter((p) => p.id !== period?.id) })); onClose(); };

  const input = { backgroundColor: c.bg, borderColor: c.border, borderWidth: 1, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 11, fontSize: 16, color: c.text } as const;

  return (
    <Modal transparent animationType="slide" onRequestClose={onClose}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.45)' }}>
        <Pressable style={{ flex: 1 }} onPress={onClose} testID="sheet-backdrop" />
        <View style={{ backgroundColor: c.surface, borderTopLeftRadius: 24, borderTopRightRadius: 24, maxHeight: '88%', width: '100%', maxWidth: 640, alignSelf: 'center' }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 18, paddingBottom: 4 }}>
            <T size={20} weight="800">{period ? 'Edit period' : 'Add period'}</T>
            <Pressable onPress={onClose} testID="sheet-close"><T size={18} muted>✕</T></Pressable>
          </View>
          <ScrollView contentContainerStyle={{ padding: 18, paddingTop: 0 }} keyboardShouldPersistTaps="handled">
            <Label>Subject</Label>
            <Row>{state.subjects.map((s) => <Chip key={s} label={s} on={subject === s} onPress={() => setSubject(s)} />)}</Row>
            <TextInput testID="f-subject" value={subject} onChangeText={setSubject} placeholder="Or type another subject" placeholderTextColor={c.muted} style={[input, { marginTop: 10 }]} />

            <Label>Class</Label>
            <Row>{LEVELS.map((l) => <Chip key={l} label={l} on={level === l} onPress={() => pickLevel(l)} />)}</Row>
            <Row style={{ marginTop: 10 }}>{divisionsFor(level).map((d) => <Chip key={d} label={d} on={division === d} onPress={() => setDivision(d)} />)}</Row>

            <Label>Days</Label>
            <Row>{DAYS.filter((d) => daysFor(state.settings.saturday).includes(d) || days.includes(d.n)).map((d) => <Chip key={d.n} label={d.short} on={days.includes(d.n)} onPress={() => toggleDay(d.n)} />)}</Row>

            <View style={{ flexDirection: 'row', gap: 12 }}>
              <View style={{ flex: 1 }}>
                <Label>Starts</Label>
                <TextInput testID="f-start" value={start} onChangeText={(v) => setStart(maskTime(v))} placeholder="8:30" placeholderTextColor={c.muted} keyboardType="number-pad" maxLength={5} style={input} />
                <Row style={{ marginTop: 8 }}>{(['AM', 'PM'] as const).map((a) => <Chip key={a} label={a} on={startAp === a} onPress={() => setStartAp(a)} />)}</Row>
              </View>
              <View style={{ flex: 1 }}>
                <Label>Ends</Label>
                <TextInput testID="f-end" value={end} onChangeText={(v) => setEnd(maskTime(v))} placeholder="9:10" placeholderTextColor={c.muted} keyboardType="number-pad" maxLength={5} style={input} />
                <Row style={{ marginTop: 8 }}>{(['AM', 'PM'] as const).map((a) => <Chip key={a} label={a} on={endAp === a} onPress={() => setEndAp(a)} />)}</Row>
              </View>
            </View>

            <Label>Period</Label>
            <TextInput testID="f-period" value={num} onChangeText={(v) => setNum(v.replace(/[^0-9]/g, '').slice(0, 2))} placeholder="e.g. 3 for 3rd period" placeholderTextColor={c.muted} keyboardType="number-pad" maxLength={2} style={input} />

            <Label>Room (optional)</Label>
            <TextInput testID="f-room" value={room} onChangeText={setRoom} placeholder="e.g. Room 4" placeholderTextColor={c.muted} style={input} />

            <Label>Remind me</Label>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 6 }}>
              <T>5 minutes before</T><Toggle on={pre} onChange={setPre} testID="f-pre" />
            </View>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 6 }}>
              <T>At start time</T><Toggle on={at} onChange={setAt} testID="f-at" />
            </View>

            {err ? <T color={c.danger} weight="600" style={{ marginTop: 10 }} testID="f-err">{err}</T> : null}
            <View style={{ marginTop: 18, gap: 10 }}>
              <Btn testID="f-save" label={period ? 'Save changes' : 'Add period'} onPress={save} />
              {period ? <Btn testID="f-del" kind="danger" label="Delete period" onPress={del} /> : null}
            </View>
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}
