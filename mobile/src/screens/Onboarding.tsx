import { useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { TITLES, Title, greetingName } from '../core';
import { useStore } from '../store';
import { useTheme } from '../theme';
import { Btn, Chip, Label, Logo, Row, T } from '../ui';

export function Onboarding() {
  const { c } = useTheme();
  const { update } = useStore();
  const [name, setName] = useState('');
  const [title, setTitle] = useState<Title>('Mrs.');
  const [draft, setDraft] = useState('');
  const [subjects, setSubjects] = useState<string[]>([]);

  const add = () => {
    const s = draft.trim();
    if (!s) return;
    if (!subjects.some((x) => x.toLowerCase() === s.toLowerCase())) setSubjects([...subjects, s]);
    setDraft('');
  };
  const ok = name.trim().length > 0 && subjects.length > 0;
  const input = {
    backgroundColor: c.surface, borderColor: c.border, borderWidth: 1, borderRadius: 14,
    paddingHorizontal: 14, paddingVertical: 12, fontSize: 16, color: c.text,
  } as const;

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: c.bg }}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: 40 }} keyboardShouldPersistTaps="handled">
          <Logo size={56} />
          <T size={28} weight="800" style={{ marginTop: 18 }}>Welcome to PERTRACK</T>
          <T muted style={{ marginTop: 6 }}>Never miss a class. We'll remind you 5 minutes before and right when it starts.</T>

          <Label>Your name</Label>
          <TextInput testID="ob-name" value={name} onChangeText={setName} placeholder="e.g. Ngozi Okafor"
            placeholderTextColor={c.muted} style={input} autoCapitalize="words" />

          <Label>Refer to me as</Label>
          <Row>{TITLES.map((t) => <Chip key={t} label={t} on={title === t} onPress={() => setTitle(t)} />)}</Row>
          {name.trim() ? (
            <T muted style={{ marginTop: 10 }} >Preview: <T weight="700" testID="ob-prev">{greetingName({ name, title })}</T></T>
          ) : null}

          <Label>Subjects you teach</Label>
          <View style={{ flexDirection: 'row', gap: 8 }}>
            <TextInput testID="ob-sub" value={draft} onChangeText={setDraft} onSubmitEditing={add} returnKeyType="done"
              placeholder="Type a subject, e.g. Mathematics" placeholderTextColor={c.muted} style={[input, { flex: 1 }]} />
            <Pressable testID="ob-add" onPress={add} style={{ backgroundColor: c.primary, borderRadius: 14, paddingHorizontal: 18, justifyContent: 'center' }}>
              <T weight="700" color={c.onPrimary}>Add</T>
            </Pressable>
          </View>
          <Row style={{ marginTop: 12 }}>
            {subjects.map((s) => (
              <Pressable key={s} onPress={() => setSubjects(subjects.filter((x) => x !== s))}
                style={{ flexDirection: 'row', gap: 8, backgroundColor: c.selBg, borderRadius: 999, paddingVertical: 8, paddingHorizontal: 14 }}>
                <T weight="600" color={c.selText}>{s}</T><T color={c.selText}>✕</T>
              </Pressable>
            ))}
          </Row>
          <T size={13} muted style={{ marginTop: 10 }}>Add as many as you teach. Tap one to remove it.</T>

          <View style={{ marginTop: 28 }}>
            <Btn testID="ob-go" label="Continue" disabled={!ok}
              onPress={() => update((s) => ({ ...s, profile: { name: name.trim(), title }, subjects }))} />
          </View>
          <T size={12} muted style={{ marginTop: 14, textAlign: 'center' }}>Everything stays on this phone. No account, no cloud.</T>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
