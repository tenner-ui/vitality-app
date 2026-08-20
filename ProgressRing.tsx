import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Svg, { Circle } from 'react-native-svg';
import { colors } from './colors';
import { fonts } from './typography';

interface Props {
  size?: number;
  stroke?: number;
  progress: number; // 0..1
  color?: string;
  trackColor?: string;
  centerLabel?: string;
  centerSub?: string;
  children?: React.ReactNode;
}

export function ProgressRing({
  size = 120,
  stroke = 10,
  progress,
  color = colors.gold,
  trackColor = colors.surfaceMuted,
  centerLabel,
  centerSub,
  children,
}: Props) {
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const clamped = Math.max(0, Math.min(1, progress));
  const dashOffset = circumference * (1 - clamped);

  return (
    <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
      <Svg width={size} height={size} style={StyleSheet.absoluteFill}>
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={trackColor}
          strokeWidth={stroke}
          fill="none"
        />
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={color}
          strokeWidth={stroke}
          fill="none"
          strokeLinecap="round"
          strokeDasharray={`${circumference} ${circumference}`}
          strokeDashoffset={dashOffset}
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
        />
      </Svg>
      <View style={styles.center}>
        {children ?? (
          <>
            {!!centerLabel && <Text style={styles.label}>{centerLabel}</Text>}
            {!!centerSub && <Text style={styles.sub}>{centerSub}</Text>}
          </>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  center: { position: 'absolute', alignItems: 'center', justifyContent: 'center' },
  label: { fontFamily: fonts.serifBold, fontSize: 22, color: colors.textPrimary },
  sub: { fontFamily: fonts.sans, fontSize: 11, color: colors.textSecondary, marginTop: 2 },
});
