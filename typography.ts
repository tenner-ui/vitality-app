/**
 * Tipografia VITALITY — no máximo 2 famílias.
 * Títulos: serifada (Playfair Display). Corpo: sans-serif (Montserrat).
 */
import { TextStyle } from 'react-native';

export const fonts = {
  serif: 'PlayfairDisplay_600SemiBold',
  serifBold: 'PlayfairDisplay_700Bold',
  sans: 'Montserrat_400Regular',
  sansMedium: 'Montserrat_500Medium',
  sansSemibold: 'Montserrat_600SemiBold',
  sansBold: 'Montserrat_700Bold',
} as const;

export const type: Record<string, TextStyle> = {
  display: { fontFamily: fonts.serifBold, fontSize: 30, lineHeight: 36 },
  title: { fontFamily: fonts.serif, fontSize: 22, lineHeight: 28 },
  section: { fontFamily: fonts.sansSemibold, fontSize: 13, letterSpacing: 1.5, textTransform: 'uppercase' },
  cardTitle: { fontFamily: fonts.sansSemibold, fontSize: 16 },
  body: { fontFamily: fonts.sans, fontSize: 14, lineHeight: 20 },
  bodyStrong: { fontFamily: fonts.sansSemibold, fontSize: 14, lineHeight: 20 },
  small: { fontFamily: fonts.sans, fontSize: 12, lineHeight: 16 },
  metric: { fontFamily: fonts.serifBold, fontSize: 28 },
  metricBig: { fontFamily: fonts.serifBold, fontSize: 40 },
  caption: { fontFamily: fonts.sansMedium, fontSize: 11, letterSpacing: 0.5 },
};

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  xxl: 32,
} as const;

export const radius = {
  sm: 10,
  md: 16,
  lg: 22,
  pill: 999,
} as const;
