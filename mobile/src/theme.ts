import { createContext, useContext } from 'react';

export type Palette = {
  bg: string; surface: string; border: string; text: string; muted: string;
  primary: string; onPrimary: string; hero: string; onHero: string;
  selBg: string; selText: string; off: string; nav: string; next: string;
  amber: string; onAmber: string; danger: string;
};

export const light: Palette = {
  bg: '#F4F6F9', surface: '#FFFFFF', border: '#E3E7EE', text: '#101828', muted: '#5B6475',
  primary: '#0B7A6B', onPrimary: '#FFFFFF', hero: '#0B3B36', onHero: '#FFFFFF',
  selBg: '#DDF3EF', selText: '#0A4F46', off: '#E9EDF2', nav: '#FFFFFF', next: '#0B7A6B',
  amber: '#F5A524', onAmber: '#2B1B00', danger: '#C9372C',
};

export const dark: Palette = {
  bg: '#0B1416', surface: '#142226', border: '#25363A', text: '#E8F1EF', muted: '#9FB3AF',
  primary: '#5FD3BF', onPrimary: '#06201C', hero: '#0E4640', onHero: '#FFFFFF',
  selBg: '#123A35', selText: '#8FE3D3', off: '#1B2A2E', nav: '#101C1F', next: '#2FB5A0',
  amber: '#F5A524', onAmber: '#2B1B00', danger: '#FF8A80',
};

export type ThemeCtx = { c: Palette; isDark: boolean };
export const ThemeContext = createContext<ThemeCtx>({ c: light, isDark: false });
export const useTheme = () => useContext(ThemeContext);
