import React from 'react';
import { View, Text, StyleSheet, ViewStyle, Image } from 'react-native';
import { colors } from './colors';
import { fonts } from './typography';

/** Logotipo oficial do Instituto Vitality — figura dourada (sem fundo). */
const LOGO_INSTITUTO = 'https://candid-profiterole-f01152.netlify.app/privacidade/logo.png';
const LOGO_TENNER = 'https://candid-profiterole-f01152.netlify.app/icon-512.png';

export function Monogram({ size = 40 }: { size?: number }) {
  // A figura tem proporção ~440x592 (retrato). Mantemos a altura = size.
  const w = Math.round(size * (440 / 592));
  return (
    <Image
      source={{ uri: LOGO_INSTITUTO }}
      style={{ width: w, height: size, resizeMode: 'contain' }}
      accessibilityLabel="Instituto Vitality"
    />
  );
}

/** Monograma pessoal Dr. Tenner Nunes (sem fundo) — usado onde a marca pessoal cabe. */
export function TennerMark({ size = 40 }: { size?: number }) {
  const w = Math.round(size * (198 / 236));
  return (
    <Image
      source={{ uri: LOGO_TENNER }}
      style={{ width: w, height: size, resizeMode: 'contain' }}
      accessibilityLabel="Dr. Tenner Nunes"
    />
  );
}

/** Bloco de marca: logo do Instituto + wordmark VITALITY. */
export function BrandLockup({ style, compact }: { style?: ViewStyle; compact?: boolean }) {
  return (
    <View style={[styles.row, style]}>
      <Monogram size={compact ? 34 : 52} />
      <View style={{ marginLeft: 12 }}>
        <Text style={styles.wordmark}>VITALITY</Text>
        {!compact && <Text style={styles.tagline}>INSTITUTO VITALITY</Text>}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center' },
  wordmark: {
    fontFamily: fonts.serifBold,
    fontSize: 22,
    color: colors.textPrimary,
    letterSpacing: 3,
  },
  tagline: {
    fontFamily: fonts.sansMedium,
    fontSize: 9,
    color: colors.gold,
    letterSpacing: 2.5,
    marginTop: 1,
  },
});
