import { useEffect, useState } from 'react';
import { Alert, Platform, ScrollView, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { TITLES, greetingName } from '../core';
import { askPermission, loadError, permissionGranted, remindersSupported, scheduledCount, sendTest } from '../notify';
import { useStore } from '../store';
import { useTheme } from '../theme';
import { Btn, Card, Chip, Label, Row, T, Toggle } from '../ui';

export function Settings() {
  const { c } = useTheme();
  const { state, update, reset, capped } = useStore();
  const [granted, setGranted] = useState(false);
  const [draft, setDraft] = useState('');
  const [count, setCount] = useState<number | null>(null);
  const p = state.profile!;

  useEffect(() => { permissionGranted().then(setGranted).catch(() => {}); }, []);
  // show how many reminders the phone really has scheduled (re-checked after changes)
  useEffect(() => {
    const id = setTimeout(() => { scheduledCount().then(setCount).catch(() => setCount(null)); }, 1500);
    return () => clearTimeout(id);
  }, [state.periods, state.settings, granted]);

  const runTest = async () => {
    try {
      if (!granted) {
        const ok = await askPermission();
        setGranted(ok);
        if (!ok) { Alert.alert('Notifications are blocked', 'Open your phone Settings > Apps > PERTRACK > Notifications and allow them, then try again.'); return; }
      }
      await sendTest(state.settings.sound);
      Alert.alert('Test scheduled', 'Press the Home button now. A PERTRACK notification should appear in about 3 seconds.');
    } catch (e) {
      Alert.alert('Test failed', String((e as Error)?.message ?? e));
    }
  };

  const enable = async () => {
    const ok = await askPermission();
    setGranted(ok);
    // re-run scheduling now that permission exists
    update((s) => ({ ...s }));
    if (!ok) Alert.alert('Notifications are off', 'Turn them on for PERTRACK in your phone settings so reminders can fire.');
  };
  const addSubject = () => {
    const s = draft.trim();
    if (!s) return;
    update((st) => (st.subjects.some((x) => x.toLowerCase() === s.toLowerCase()) ? st : { ...st, subjects: [...st.subjects, s] }));
    setDraft('');
  };
  const confirmReset = () => {
    if (Platform.OS === 'web') { if (window.confirm('Erase everything on this device?')) reset(); return; }
    Alert.alert('Erase all data?', 'This removes your profile, subjects and timetable from this phone.', [
      { text: 'Cancel', style: 'cancel' }, { text: 'Erase', style: 'destructive', onPress: reset },
    ]);
  };
  const input = { backgroundColor: c.bg, borderColor: c.border, borderWidth: 1, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 11, fontSize: 16, color: c.text } as const;
  const rowStyle = { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 6 } as const;

  return (
    <SafeAreaView edges={['top']} style={{ flex: 1, backgroundColor: c.bg }}>
      <ScrollView contentContainerStyle={{ padding: 18, paddingBottom: 40 }} keyboardShouldPersistTaps="handled" testID="settings">
        <T size={26} weight="800">Settings</T>

        <Label>Profile</Label>
        <Card>
          <T size={13} muted>Name</T>
          <TextInput value={p.name} onChangeText={(v) => update((s) => ({ ...s, profile: { ...s.profile!, name: v } }))} style={[input, { marginTop: 6 }]} />
          <Row style={{ marginTop: 12 }}>
            {TITLES.map((t) => <Chip key={t} label={t} on={p.title === t} onPress={() => update((s) => ({ ...s, profile: { ...s.profile!, title: t } }))} />)}
          </Row>
          <T muted size={13} style={{ marginTop: 10 }}>Shown as {greetingName(p)}</T>
        </Card>

        <Label>Subjects</Label>
        <Card>
          <Row>
            {state.subjects.map((s) => (
              <Chip key={s} label={`${s}  ✕`} onPress={() => update((st) => ({ ...st, subjects: st.subjects.filter((x) => x !== s) }))} />
            ))}
          </Row>
          <View style={{ flexDirection: 'row', gap: 8, marginTop: 12 }}>
            <TextInput value={draft} onChangeText={setDraft} onSubmitEditing={addSubject} placeholder="Add a subject" placeholderTextColor={c.muted} style={[input, { flex: 1 }]} />
            <Btn label="Add" onPress={addSubject} />
          </View>
        </Card>

        <Label>Schedule</Label>
        <Card>
          <View style={rowStyle}>
            <View style={{ flex: 1, paddingRight: 12 }}>
              <T weight="600">Include Saturday</T>
              <T size={13} muted>Add Saturday to your timetable and reminders. Off by default.</T>
            </View>
            <Toggle on={state.settings.saturday} onChange={(v) => update((s) => ({ ...s, settings: { ...s.settings, saturday: v } }))} />
          </View>
        </Card>

        <Label>Notifications</Label>
        <Card>
          <View style={rowStyle}>
            <View style={{ flex: 1, paddingRight: 12 }}>
              <T weight="600">Class reminders</T>
              <T size={13} muted>{Platform.OS === 'web' ? 'Phone reminders work in the mobile app.' : !remindersSupported ? `Reminders are unavailable here: ${loadError ?? 'unknown reason'}.` : granted ? 'On — they fire even when the app is closed.' : 'Off — allow notifications to get reminders.'}</T>
            </View>
            {!remindersSupported ? null : granted ? <T color={c.primary} weight="700">Enabled</T> : <Btn testID="enable-notif" label="Enable" onPress={enable} />}
          </View>
          <View style={rowStyle}>
            <T weight="600">Sound & vibration</T>
            <Toggle on={state.settings.sound} onChange={(v) => update((s) => ({ ...s, settings: { ...s.settings, sound: v } }))} />
          </View>
          <View style={{ marginTop: 8 }}>
            <Btn kind="ghost" label="Send a test reminder (3 seconds)" onPress={runTest} />
            {remindersSupported ? <T size={12} muted style={{ marginTop: 8 }}>Permission: {granted ? 'allowed' : 'not allowed'} · Reminders scheduled on this phone: {count ?? '…'}</T> : null}
          </View>
          {capped ? <T size={12} color={c.danger} style={{ marginTop: 10 }}>iPhones allow about 64 scheduled reminders, so only the soonest ones are scheduled. Turn off reminders you don't need.</T> : null}
        </Card>

        <Label>Appearance</Label>
        <Row>
          {(['auto', 'light', 'dark'] as const).map((t) => (
            <Chip key={t} testID={`theme-${t}`} label={t === 'auto' ? 'Match phone' : t[0].toUpperCase() + t.slice(1)} on={state.settings.theme === t}
              onPress={() => update((s) => ({ ...s, settings: { ...s.settings, theme: t } }))} />
          ))}
        </Row>

        <Label>Data</Label>
        <Btn testID="reset" kind="danger" label="Erase all data" onPress={confirmReset} />
        <T size={12} muted style={{ marginTop: 20, textAlign: 'center' }}>PERTRACK · by BeepeeLabs · data stays on this device</T>
      </ScrollView>
    </SafeAreaView>
  );
}
