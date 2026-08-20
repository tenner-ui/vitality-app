import React from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { BrandLockup } from './Logo';
import { colors } from './colors';
import { fonts } from './typography';

export function Header({
  title,
  subtitle,
  right,
  onRightPress,
  onBack,
  rightIcon = 'notifications-outline',
}: {
  title?: string;
  subtitle?: string;
  right?: React.ReactNode;
  onRightPress?: () => void;
  onBack?: () => void;
  rightIcon?: keyof typeof Ionicons.glyphMap;
}) {
  return (
    <View style={styles.wrap}>
      {onBack && (
        <Pressable onPress={onBack} hitSlop={10} style={styles.backBtn} accessibilityLabel="Voltar">
          <Ionicons name="chevron-back" size={24} color={colors.gold} />
        </Pressable>
      )}
      <View style={{ flex: 1 }}>
        {title ? (
          <>
            <Text style={styles.subtitle}>{subtitle}</Text>
            <Text style={styles.title}>{title}</Text>
          </>
        ) : (
          <BrandLockup compact />
        )}
      </View>
      {right ?? (
        <Pressable style={styles.iconBtn} onPress={onRightPress}>
          <Ionicons name={rightIcon} size={20} color={colors.gold} />
        </Pressable>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { flexDirection: 'row', alignItems: 'center', marginBottom: 20 },
  backBtn: { width: 38, height: 38, borderRadius: 19, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface, alignItems: 'center', justifyContent: 'center', marginRight: 10 },
  title: { fontFamily: fonts.serifBold, fontSize: 24, color: colors.textPrimary },
  subtitle: { fontFamily: fonts.sansMedium, fontSize: 11, color: colors.gold, letterSpacing: 2, textTransform: 'uppercase' },
  iconBtn: {
    width: 42,
    height: 42,
    borderRadius: 21,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surfaceMuted,
  },
});
