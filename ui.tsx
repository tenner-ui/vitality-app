import React, { useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ViewStyle,
  TextStyle,
  StyleProp,
  Pressable,
  ScrollView,
  ScrollViewProps,
  Animated,
  TextInput,
  TextInputProps,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { colors, gradients } from './colors';
import { type, spacing, radius } from './typography';
import { useAuth } from './AuthContext';

export function Screen({
  children,
  scroll = true,
  contentStyle,
  ...rest
}: { children: React.ReactNode; scroll?: boolean; contentStyle?: ViewStyle } & ScrollViewProps) {
  const { isTeam } = useAuth();
  const topClear = isTeam ? 46 : 0; // espaço para o seletor Paciente/Profissional flutuante
  // Fade + leve subida no mount → transição mais fluida entre telas.
  const op = useRef(new Animated.Value(0)).current;
  const ty = useRef(new Animated.Value(8)).current;
  useEffect(() => {
    Animated.parallel([
      Animated.timing(op, { toValue: 1, duration: 260, useNativeDriver: true }),
      Animated.timing(ty, { toValue: 0, duration: 260, useNativeDriver: true }),
    ]).start();
  }, []);
  const anim = { opacity: op, transform: [{ translateY: ty }] };
  return (
    <View style={styles.screen}>
      <LinearGradient colors={gradients.hero} style={StyleSheet.absoluteFill} />
      <SafeAreaView style={{ flex: 1 }} edges={['top', 'left', 'right']}>
        {scroll ? (
          <Animated.ScrollView
            contentContainerStyle={[styles.scrollContent, { paddingTop: spacing.lg + topClear }, contentStyle]}
            showsVerticalScrollIndicator={false}
            style={anim}
            {...(rest as any)}
          >
            {children}
          </Animated.ScrollView>
        ) : (
          <Animated.View style={[{ flex: 1, paddingTop: topClear }, anim, contentStyle]}>{children}</Animated.View>
        )}
      </SafeAreaView>
    </View>
  );
}

/** Campo de senha com botão de mostrar/ocultar (olho). */
export function PasswordInput({
  value,
  onChangeText,
  placeholder,
  inputStyle,
  ...rest
}: {
  value: string;
  onChangeText: (t: string) => void;
  placeholder?: string;
  inputStyle?: StyleProp<TextStyle>;
} & Omit<TextInputProps, 'value' | 'onChangeText' | 'placeholder' | 'style' | 'secureTextEntry'>) {
  const [show, setShow] = useState(false);
  return (
    <View style={{ position: 'relative', justifyContent: 'center' }}>
      <TextInput
        style={[inputStyle, { paddingRight: 48 }]}
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={colors.textMuted}
        secureTextEntry={!show}
        autoCapitalize="none"
        autoCorrect={false}
        {...rest}
      />
      <Pressable
        onPress={() => setShow((s) => !s)}
        hitSlop={10}
        style={{ position: 'absolute', right: 12, height: '100%', justifyContent: 'center' }}
        accessibilityLabel={show ? 'Ocultar senha' : 'Mostrar senha'}
      >
        <Ionicons name={show ? 'eye-off-outline' : 'eye-outline'} size={20} color={colors.textSecondary} />
      </Pressable>
    </View>
  );
}

/** Badge de ícone arredondado e colorido (estilo premium). */
export function IconBadge({ icon, color = colors.gold, size = 40 }: { icon: string; color?: string; size?: number }) {
  return (
    <View style={{ width: size, height: size, borderRadius: size * 0.32, backgroundColor: color + '22', borderWidth: 1, borderColor: color + '55', alignItems: 'center', justifyContent: 'center' }}>
      <Ionicons name={icon as any} size={Math.round(size * 0.5)} color={color} />
    </View>
  );
}

export function Card({
  children,
  style,
  onPress,
  glow,
}: {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  onPress?: () => void;
  glow?: boolean;
}) {
  const inner = (
    <View style={[styles.card, glow && styles.cardGlow, style]}>{children}</View>
  );
  if (onPress) {
    return (
      <Pressable onPress={onPress} style={({ pressed }) => [pressed && { opacity: 0.9, transform: [{ scale: 0.985 }] }]}>
        {inner}
      </Pressable>
    );
  }
  return inner;
}

export function SectionLabel({ children, style }: { children: React.ReactNode; style?: StyleProp<TextStyle> }) {
  return (
    <View style={styles.sectionRow}>
      <View style={styles.sectionTick} />
      <Text style={[styles.sectionLabel, style]}>{children}</Text>
    </View>
  );
}

export function Pill({
  label,
  active,
  onPress,
  strike,
}: {
  label: string;
  active?: boolean;
  onPress?: () => void;
  strike?: boolean;
}) {
  return (
    <Pressable
      onPress={onPress}
      disabled={strike}
      style={[styles.pill, active && styles.pillActive, strike && styles.pillStrike]}
    >
      <Text
        style={[
          styles.pillText,
          active && styles.pillTextActive,
          strike && styles.pillTextStrike,
        ]}
      >
        {label}
      </Text>
    </Pressable>
  );
}

export function GoldButton({
  label,
  onPress,
  style,
  outline,
  small,
}: {
  label: string;
  onPress?: () => void;
  style?: StyleProp<ViewStyle>;
  outline?: boolean;
  small?: boolean;
}) {
  if (outline) {
    return (
      <Pressable onPress={onPress} style={[styles.btnOutline, small && styles.btnSmall, style]}>
        <Text style={styles.btnOutlineText}>{label}</Text>
      </Pressable>
    );
  }
  return (
    <Pressable onPress={onPress} style={[style]}>
      <LinearGradient
        colors={gradients.gold}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={[styles.btn, small && styles.btnSmall]}
      >
        <Text style={styles.btnText}>{label}</Text>
      </LinearGradient>
    </Pressable>
  );
}

export function ProgressBar({
  value,
  color = colors.gold,
  height = 8,
}: {
  value: number; // 0..1
  color?: string;
  height?: number;
}) {
  return (
    <View style={[styles.track, { height, borderRadius: height }]}>
      <View
        style={{
          width: `${Math.max(0, Math.min(1, value)) * 100}%`,
          height,
          borderRadius: height,
          backgroundColor: color,
        }}
      />
    </View>
  );
}

export function StatTile({
  label,
  value,
  unit,
  hint,
  style,
  icon,
  accent,
}: {
  label: string;
  value: string;
  unit?: string;
  hint?: string | null;
  style?: StyleProp<ViewStyle>;
  icon?: string;
  accent?: string;
}) {
  return (
    <Card style={[{ flex: 1 }, style]}>
      {!!icon && <IconBadge icon={icon} color={accent || colors.gold} size={34} />}
      <Text style={[styles.statLabel, !!icon && { marginTop: 10 }]}>{label}</Text>
      <View style={{ flexDirection: 'row', alignItems: 'baseline' }}>
        <Text style={styles.statValue}>{value}</Text>
        {!!unit && <Text style={styles.statUnit}> {unit}</Text>}
      </View>
      {!!hint && <Text style={styles.statHint}>{hint}</Text>}
    </Card>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.offWhite },
  scrollContent: { padding: spacing.lg, paddingBottom: spacing.xxl * 2 },
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.border,
  },
  cardGlow: {
    borderColor: colors.hairline,
    shadowColor: colors.gold,
    shadowOpacity: 0.18,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 6 },
    elevation: 4,
  },
  sectionRow: { flexDirection: 'row', alignItems: 'center', marginBottom: spacing.md, marginTop: spacing.sm },
  sectionTick: { width: 14, height: 2, backgroundColor: colors.gold, marginRight: 8 },
  sectionLabel: { ...type.section, color: colors.gold },
  pill: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: radius.pill,
    backgroundColor: colors.surfaceMuted,
    borderWidth: 1,
    borderColor: colors.border,
    marginRight: 8,
    marginBottom: 8,
  },
  pillActive: { backgroundColor: colors.blueAccent, borderColor: colors.blueAccent },
  pillStrike: { opacity: 0.4 },
  pillText: { ...type.small, color: colors.textSecondary },
  pillTextActive: { color: colors.textPrimary, fontFamily: type.bodyStrong.fontFamily },
  pillTextStrike: { textDecorationLine: 'line-through' },
  btn: {
    paddingVertical: 15,
    borderRadius: radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  btnSmall: { paddingVertical: 10, paddingHorizontal: 18 },
  btnText: { fontFamily: type.bodyStrong.fontFamily, color: colors.textOnGold, fontSize: 15, letterSpacing: 0.5 },
  btnOutline: {
    paddingVertical: 15,
    borderRadius: radius.pill,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.gold,
  },
  btnOutlineText: { fontFamily: type.bodyStrong.fontFamily, color: colors.gold, fontSize: 15, letterSpacing: 0.5 },
  track: { backgroundColor: colors.surfaceMuted, overflow: 'hidden', width: '100%' },
  statLabel: { ...type.caption, color: colors.textSecondary, textTransform: 'uppercase', marginBottom: 6 },
  statValue: { ...type.metric, color: colors.textPrimary },
  statUnit: { ...type.small, color: colors.textSecondary },
  statHint: { ...type.small, color: colors.gold, marginTop: 4 },
});
