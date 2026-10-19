import { ReactNode } from 'react';
import { Pressable, StyleProp, Text, TextStyle, View, ViewStyle } from 'react-native';
import Svg, { Circle, G, Path, Rect } from 'react-native-svg';
import { useTheme } from './theme';

export function Logo({ size = 40, bg = '#0B3B36', rounded = true }: { size?: number; bg?: string; rounded?: boolean }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 64 64">
      <Rect width="64" height="64" rx={rounded ? 16 : 0} fill={bg} />
      <G transform="translate(6.1 11.7) scale(0.7)">
        <Rect x="12" y="8" width="11" height="48" rx="5.5" fill="#FFFFFF" />
        <Circle cx="37" cy="26" r="13.5" fill="none" stroke="#FFFFFF" strokeWidth="9" />
        <Path d="M37 26V20.5M37 26l4.5 3" stroke="#FFFFFF" strokeWidth="2.8" strokeLinecap="round" fill="none" />
        <Circle cx="55" cy="9" r="6" fill="#F5A524" stroke={bg} strokeWidth="3" />
      </G>
    </Svg>
  );
}

export function T({ children, style, size = 15, weight = '400', color, muted, numberOfLines, testID }: {
  children: ReactNode; style?: StyleProp<TextStyle>; size?: number;
  weight?: TextStyle['fontWeight']; color?: string; muted?: boolean; numberOfLines?: number; testID?: string;
}) {
  const { c } = useTheme();
  return (
    <Text testID={testID} numberOfLines={numberOfLines} style={[{ fontSize: size, fontWeight: weight, color: color ?? (muted ? c.muted : c.text) }, style]}>
      {children}
    </Text>
  );
}

export function Card({ children, style }: { children: ReactNode; style?: StyleProp<ViewStyle> }) {
  const { c } = useTheme();
  return (
    <View style={[{ backgroundColor: c.surface, borderColor: c.border, borderWidth: 1, borderRadius: 16, padding: 14 }, style]}>
      {children}
    </View>
  );
}

export function Chip({ label, on, onPress, testID }: { label: string; on?: boolean; onPress: () => void; testID?: string }) {
  const { c } = useTheme();
  return (
    <Pressable
      testID={testID} accessibilityRole="button" accessibilityState={{ selected: !!on }} onPress={onPress}
      style={{
        paddingHorizontal: 14, paddingVertical: 9, borderRadius: 999, borderWidth: 1,
        backgroundColor: on ? c.selBg : c.surface, borderColor: on ? c.primary : c.border,
      }}>
      <T size={14} weight={on ? '700' : '500'} color={on ? c.selText : c.text}>{label}</T>
    </Pressable>
  );
}

export function Btn({ label, onPress, kind = 'primary', disabled, testID }: {
  label: string; onPress: () => void; kind?: 'primary' | 'ghost' | 'danger'; disabled?: boolean; testID?: string;
}) {
  const { c } = useTheme();
  const bg = kind === 'primary' ? c.primary : 'transparent';
  const fg = kind === 'primary' ? c.onPrimary : kind === 'danger' ? c.danger : c.text;
  return (
    <Pressable
      testID={testID} accessibilityRole="button" disabled={disabled} onPress={onPress}
      style={{
        backgroundColor: bg, borderRadius: 14, paddingVertical: 14, alignItems: 'center',
        borderWidth: kind === 'primary' ? 0 : 1, borderColor: kind === 'danger' ? c.danger : c.border,
        opacity: disabled ? 0.45 : 1,
      }}>
      <T size={16} weight="700" color={fg}>{label}</T>
    </Pressable>
  );
}

export function Toggle({ on, onChange, testID }: { on: boolean; onChange: (v: boolean) => void; testID?: string }) {
  const { c } = useTheme();
  return (
    <Pressable
      testID={testID} accessibilityRole="switch" accessibilityState={{ checked: on }} onPress={() => onChange(!on)}
      style={{ width: 48, height: 28, borderRadius: 14, backgroundColor: on ? c.primary : c.off, justifyContent: 'center', padding: 3 }}>
      <View style={{ width: 22, height: 22, borderRadius: 11, backgroundColor: '#fff', alignSelf: on ? 'flex-end' : 'flex-start' }} />
    </Pressable>
  );
}

export function Label({ children }: { children: ReactNode }) {
  return <T size={12} weight="700" muted style={{ letterSpacing: 0.8, textTransform: 'uppercase', marginBottom: 8, marginTop: 16 }}>{children}</T>;
}

export const Row = ({ children, style }: { children: ReactNode; style?: StyleProp<ViewStyle> }) => (
  <View style={[{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }, style]}>{children}</View>
);
