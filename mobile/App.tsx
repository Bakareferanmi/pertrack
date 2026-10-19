import { StatusBar } from 'expo-status-bar';
import { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, View, useColorScheme } from 'react-native';
import { SafeAreaProvider, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Period } from './src/core';
import { Onboarding } from './src/screens/Onboarding';
import { PeriodSheet } from './src/screens/PeriodSheet';
import { Settings } from './src/screens/Settings';
import { Timetable } from './src/screens/Timetable';
import { Today } from './src/screens/Today';
import { StoreProvider, useStore } from './src/store';
import { ThemeContext, dark, light } from './src/theme';
import { T } from './src/ui';

type Tab = 'today' | 'timetable' | 'settings';
type Sheet = { period?: Period; day: number } | null;

function Shell() {
  const { state, ready } = useStore();
  const sys = useColorScheme();
  const isDark = state.settings.theme === 'auto' ? sys === 'dark' : state.settings.theme === 'dark';
  const theme = useMemo(() => ({ c: isDark ? dark : light, isDark }), [isDark]);
  const [tab, setTab] = useState<Tab>('today');
  const [sheet, setSheet] = useState<Sheet>(null);
  const [now, setNow] = useState(new Date());
  const insets = useSafeAreaInsets();

  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(id);
  }, []);

  const c = theme.c;
  const tabs: { k: Tab; label: string; icon: string }[] = [
    { k: 'today', label: 'Today', icon: '●' }, { k: 'timetable', label: 'Timetable', icon: '▦' }, { k: 'settings', label: 'Settings', icon: '⚙' },
  ];

  return (
    <ThemeContext.Provider value={theme}>
      <StatusBar style={isDark ? 'light' : 'dark'} />
      {!ready ? (
        <View style={{ flex: 1, backgroundColor: c.bg, justifyContent: 'center' }}><ActivityIndicator color={c.primary} /></View>
      ) : !state.profile ? (
        <Onboarding />
      ) : (
        <View style={{ flex: 1, backgroundColor: c.bg }}>
          <View style={{ flex: 1 }}>
            {tab === 'today' && <Today now={now} onAdd={() => setSheet({ day: now.getDay() })} onEdit={(p) => setSheet({ period: p, day: now.getDay() })} />}
            {tab === 'timetable' && <Timetable today={now.getDay()} onAdd={(d) => setSheet({ day: d })} onEdit={(p) => setSheet({ period: p, day: now.getDay() })} />}
            {tab === 'settings' && <Settings />}
          </View>
          <View style={{ flexDirection: 'row', backgroundColor: c.nav, borderTopWidth: 1, borderTopColor: c.border, paddingBottom: insets.bottom }}>
            {tabs.map((t) => (
              <Pressable key={t.k} testID={`tab-${t.k}`} accessibilityRole="tab" onPress={() => setTab(t.k)} style={{ flex: 1, alignItems: 'center', paddingVertical: 10 }}>
                <T size={18} color={tab === t.k ? c.primary : c.muted}>{t.icon}</T>
                <T size={12} weight={tab === t.k ? '700' : '500'} color={tab === t.k ? c.primary : c.muted}>{t.label}</T>
              </Pressable>
            ))}
          </View>
          {sheet && <PeriodSheet period={sheet.period} defaultDay={sheet.day} onClose={() => setSheet(null)} />}
        </View>
      )}
    </ThemeContext.Provider>
  );
}

export default function App() {
  return (
    <SafeAreaProvider>
      <StoreProvider>
        <Shell />
      </StoreProvider>
    </SafeAreaProvider>
  );
}
