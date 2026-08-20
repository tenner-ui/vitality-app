import React from 'react';
import { View, Text, StyleSheet, Pressable, Linking } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Screen, Card, SectionLabel } from './ui';
import { Header } from './Header';
import { colors } from './colors';
import { fonts, type } from './typography';
import { SOCIALS, BRAND } from './config';

export function RedesScreen() {
  function open(url: string) {
    Linking.openURL(url).catch(() => {});
  }
  return (
    <Screen>
      <Header title="Redes" subtitle="Acompanhe o Dr. Tenner" rightIcon="share-social-outline" />
      <Text style={styles.intro}>
        Siga o {BRAND.doctor} e o {BRAND.institute} para conteúdos de saúde metabólica, dicas e novidades do programa.
      </Text>

      <SectionLabel>Canais oficiais</SectionLabel>
      {SOCIALS.map((s) => (
        <Pressable key={s.url} onPress={() => open(s.url)}>
          <Card style={{ marginBottom: 10 }}>
            <View style={styles.row}>
              <View style={[styles.icon, { backgroundColor: s.color + '22', borderColor: s.color }]}>
                <Ionicons name={s.icon as any} size={22} color={s.color} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.label}>{s.label}</Text>
                <Text style={styles.handle}>{s.handle}</Text>
              </View>
              <Ionicons name="open-outline" size={20} color={colors.gold} />
            </View>
          </Card>
        </Pressable>
      ))}

      <Text style={styles.note}>Ao tocar, o link abre no aplicativo correspondente ou no navegador.</Text>
    </Screen>
  );
}

const styles = StyleSheet.create({
  intro: { ...type.body, color: colors.textSecondary, marginBottom: 6, lineHeight: 22 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  icon: { width: 46, height: 46, borderRadius: 14, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  label: { ...type.cardTitle, color: colors.textPrimary },
  handle: { ...type.small, color: colors.textSecondary, marginTop: 2 },
  note: { ...type.small, color: colors.textMuted, marginTop: 12, textAlign: 'center' },
});
