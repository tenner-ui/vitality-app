import React from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useAuth } from './AuthContext';
import { colors, gradients } from './colors';
import { fonts } from './typography';

/**
 * Alterna entre a visão do Paciente e a do Profissional (só para a equipe).
 * Flutua no topo, no estilo do protótipo, nas cores do Instituto.
 */
export function ViewSwitcher() {
  const { isTeam, viewAs, setViewAs } = useAuth();
  const insets = useSafeAreaInsets();
  if (!isTeam) return null;

  const opts: { key: 'patient' | 'team'; label: string; icon: string }[] = [
    { key: 'patient', label: 'Paciente', icon: 'person' },
    { key: 'team', label: 'Profissional', icon: 'medkit' },
  ];

  return (
    <View pointerEvents="box-none" style={[styles.wrap, { top: Math.max(insets.top, 8) + 2 }]}>
      <View style={styles.pill}>
        {opts.map((o) => {
          const on = viewAs === o.key;
          const content = (
            <View style={styles.segInner}>
              <Ionicons name={(on ? o.icon : `${o.icon}-outline`) as any} size={15} color={on ? colors.textOnGold : colors.textSecondary} />
              <Text style={[styles.segText, { color: on ? colors.textOnGold : colors.textSecondary }]}>{o.label}</Text>
            </View>
          );
          return (
            <Pressable key={o.key} onPress={() => setViewAs(o.key)} style={styles.seg}>
              {on ? (
                <LinearGradient colors={gradients.gold} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.segFill}>
                  {content}
                </LinearGradient>
              ) : (
                content
              )}
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { position: 'absolute', left: 0, right: 0, alignItems: 'center', zIndex: 1000 },
  pill: { flexDirection: 'row', backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, borderRadius: 999, padding: 3, shadowColor: '#0D1F3F', shadowOpacity: 0.12, shadowRadius: 10, shadowOffset: { width: 0, height: 4 }, elevation: 6 },
  seg: { borderRadius: 999, overflow: 'hidden' },
  segFill: { borderRadius: 999 },
  segInner: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 16, paddingVertical: 8 },
  segText: { fontFamily: fonts.sansSemibold, fontSize: 13 },
});
