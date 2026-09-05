// HostelHub Design System Tokens

export const colors = {
  // Brand Colors
  primary: '#4F46E5', // Indigo-600
  primaryLight: '#818CF8', // Indigo-400
  primaryDark: '#3730A3', // Indigo-800

  // Secondary / Accents
  accent: '#06B6D4', // Cyan-500
  accentLight: '#67E8F9',

  // Status & Feedback
  success: '#10B981', // Emerald-500
  successLight: '#D1FAE5',
  warning: '#F59E0B', // Amber-500
  warningLight: '#FEF3C7',
  danger: '#EF4444', // Rose-500
  dangerLight: '#FEE2E2',
  info: '#3B82F6', // Blue-500
  infoLight: '#DBEAFE',

  // Neutrals & Surfaces (Dark Slate Theme)
  background: '#0F172A', // Slate-900
  surface: '#1E293B', // Slate-800
  surfaceLight: '#334155', // Slate-700
  border: '#334155',
  borderLight: '#475569',

  // Typography
  text: '#F8FAFC', // Slate-50
  textSecondary: '#94A3B8', // Slate-400
  textMuted: '#64748B', // Slate-500
  textInverse: '#0F172A',

  // Utility
  white: '#FFFFFF',
  black: '#000000',
  transparent: 'transparent',
};

export const typography = {
  h1: { fontSize: 28, fontWeight: '700' as const, lineHeight: 34 },
  h2: { fontSize: 22, fontWeight: '700' as const, lineHeight: 28 },
  h3: { fontSize: 18, fontWeight: '600' as const, lineHeight: 24 },
  bodyLarge: { fontSize: 16, fontWeight: '400' as const, lineHeight: 22 },
  bodyMedium: { fontSize: 14, fontWeight: '400' as const, lineHeight: 20 },
  bodySmall: { fontSize: 12, fontWeight: '400' as const, lineHeight: 16 },
  caption: { fontSize: 11, fontWeight: '500' as const, lineHeight: 14 },
};

export const spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
};

export const borderRadius = {
  sm: 6,
  md: 12,
  lg: 16,
  xl: 24,
  full: 9999,
};

export const shadows = {
  card: {
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  modal: {
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.5,
    shadowRadius: 20,
    elevation: 10,
  },
};
