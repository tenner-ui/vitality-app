import React from 'react';
import { View, Text, Pressable, ScrollView, StyleSheet, Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { colors } from './colors';
import { fonts } from './typography';
import { initAudio } from './bell';

/**
 * Barra inferior fluida: rola horizontalmente quando há muitas abas
 * (ideal para iPhone). Respeita a safe-area (indicador de gestos).
 */
export function FluidTabBar({ state, descriptors, navigation, iconMap }: BottomTabBarProps & { iconMap: Record<string, keyof typeof Ionicons.glyphMap> }) {
  const insets = useSafeAreaInsets();
  const bottomPad = Math.max(insets.bottom, Platform.OS === 'ios' ? 20 : 8);

  return (
    <View style={[styles.bar, { paddingBottom: bottomPad }]}>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.row}
        keyboardShouldPersistTaps="handled"
      >
        {state.routes.map((route, index) => {
          const { options } = descriptors[route.key];
          const label = (options.tabBarLabel as string) ?? options.title ?? route.name;
          const focused = state.index === index;
          const base = iconMap[route.name] ?? 'ellipse';
          const iconName = (focused ? base : `${base}-outline`) as keyof typeof Ionicons.glyphMap;

          function onPress() {
            initAudio();
            const event = navigation.emit({ type: 'tabPress', target: route.key, canPreventDefault: true });
            if (!focused && !event.defaultPrevented) navigation.navigate(route.name as never);
          }

          return (
            <Pressable key={route.key} onPress={onPress} style={styles.tab} hitSlop={4}>
              <Ionicons name={iconName} size={22} color={focused ? colors.gold : colors.textMuted} />
              <Text style={[styles.label, { color: focused ? colors.gold : colors.textMuted }]} numberOfLines={1}>
                {label}
              </Text>
              {focused && <View style={styles.dot} />}
            </Pressable>
          );
        })}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  bar: { backgroundColor: colors.surface, borderTopColor: colors.border, borderTopWidth: 1, paddingTop: 8, shadowColor: '#0D1F3F', shadowOpacity: 0.06, shadowRadius: 10, shadowOffset: { width: 0, height: -3 }, elevation: 8 },
  row: { paddingHorizontal: 6, alignItems: 'center' },
  tab: { minWidth: 72, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 8, paddingVertical: 2, gap: 3 },
  label: { fontFamily: fonts.sansMedium, fontSize: 10.5 },
  dot: { width: 5, height: 5, borderRadius: 3, backgroundColor: colors.gold, marginTop: 1 },
});
