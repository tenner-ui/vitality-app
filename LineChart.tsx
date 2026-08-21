import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Svg, { Polyline, Circle, Line, Text as SvgText } from 'react-native-svg';
import { colors } from './colors';
import { fonts } from './typography';

export interface ChartPoint {
  label: string; // eixo X (ex.: "S1", "abr")
  value: number;
}

/**
 * Gráfico de linha simples (evolução no tempo).
 * Mostra faixa opcional de referência (band) para correlação de exames.
 */
export function LineChart({
  data,
  unit,
  color = colors.gold,
  height = 160,
  refLow,
  refHigh,
  goal,
  series2,
  color2 = colors.gold,
  label,
  label2,
}: {
  data: ChartPoint[];
  unit?: string;
  color?: string;
  height?: number;
  refLow?: number;
  refHigh?: number;
  goal?: number;
  series2?: ChartPoint[];
  color2?: string;
  label?: string;
  label2?: string;
}) {
  const W = 300;
  const H = height;
  const padL = 34;
  const padR = 12;
  const padT = 14;
  const padB = 24;

  if (!data || data.length === 0) {
    return (
      <View style={{ height, alignItems: 'center', justifyContent: 'center' }}>
        <Text style={styles.empty}>Sem dados ainda.</Text>
      </View>
    );
  }

  const s2 = (series2 || []).filter((p) => typeof p.value === 'number' && !isNaN(p.value));
  const has2 = s2.length > 0;
  const values = data.map((d) => d.value);
  const values2 = s2.map((d) => d.value);
  const extra = [refLow, refHigh, goal].filter((v): v is number => typeof v === 'number');
  const min = Math.min(...values, ...values2, ...extra);
  const max = Math.max(...values, ...values2, ...extra);
  const range = max - min || 1;
  const pad = range * 0.15;
  const yMin = min - pad;
  const yMax = max + pad;
  const yRange = yMax - yMin || 1;

  const x = (i: number) => padL + (i / Math.max(1, data.length - 1)) * (W - padL - padR);
  const y = (v: number) => padT + (1 - (v - yMin) / yRange) * (H - padT - padB);
  // A segunda série é ancorada no mesmo eixo X da primeira (mesmas datas).
  const x2 = (i: number) => padL + (i / Math.max(1, s2.length - 1)) * (W - padL - padR);

  const points = data.map((d, i) => `${x(i)},${y(d.value)}`).join(' ');
  const points2 = s2.map((d, i) => `${x2(i)},${y(d.value)}`).join(' ');

  return (
    <View>
      <Svg width="100%" height={H} viewBox={`0 0 ${W} ${H}`}>
        {/* faixa de referência */}
        {typeof refLow === 'number' && typeof refHigh === 'number' && (
          <>
            <Line x1={padL} x2={W - padR} y1={y(refHigh)} y2={y(refHigh)} stroke={colors.success} strokeDasharray="4 4" strokeWidth={1} opacity={0.6} />
            <Line x1={padL} x2={W - padR} y1={y(refLow)} y2={y(refLow)} stroke={colors.success} strokeDasharray="4 4" strokeWidth={1} opacity={0.6} />
          </>
        )}
        {typeof goal === 'number' && (
          <Line x1={padL} x2={W - padR} y1={y(goal)} y2={y(goal)} stroke={colors.gold} strokeDasharray="2 4" strokeWidth={1} opacity={0.7} />
        )}
        {/* eixo */}
        <Line x1={padL} x2={padL} y1={padT} y2={H - padB} stroke={colors.border} strokeWidth={1} />
        <Line x1={padL} x2={W - padR} y1={H - padB} y2={H - padB} stroke={colors.border} strokeWidth={1} />
        {/* rótulos min/max Y */}
        <SvgText x={padL - 4} y={y(yMax) + 4} fontSize="8" fill={colors.textMuted} textAnchor="end">{Math.round(yMax)}</SvgText>
        <SvgText x={padL - 4} y={y(yMin) + 4} fontSize="8" fill={colors.textMuted} textAnchor="end">{Math.round(yMin)}</SvgText>
        {/* 2ª linha (ex.: gordura) */}
        {has2 && <Polyline points={points2} fill="none" stroke={color2} strokeWidth={2.5} strokeLinejoin="round" strokeLinecap="round" />}
        {has2 && s2.map((d, i) => <Circle key={`s2-${i}`} cx={x2(i)} cy={y(d.value)} r={3} fill={color2} />)}
        {/* linha principal */}
        <Polyline points={points} fill="none" stroke={color} strokeWidth={2.5} strokeLinejoin="round" strokeLinecap="round" />
        {/* pontos + rótulos X */}
        {data.map((d, i) => (
          <React.Fragment key={i}>
            <Circle cx={x(i)} cy={y(d.value)} r={3} fill={color} />
            <SvgText x={x(i)} y={H - padB + 12} fontSize="8" fill={colors.textSecondary} textAnchor="middle">{d.label}</SvgText>
          </React.Fragment>
        ))}
      </Svg>
      {(label || label2) ? (
        <View style={styles.legend}>
          {!!label && (
            <View style={styles.legendItem}>
              <View style={[styles.legendDot, { backgroundColor: color }]} />
              <Text style={styles.legendTxt}>{label}</Text>
            </View>
          )}
          {!!label2 && has2 && (
            <View style={styles.legendItem}>
              <View style={[styles.legendDot, { backgroundColor: color2 }]} />
              <Text style={styles.legendTxt}>{label2}</Text>
            </View>
          )}
          {!!unit && <Text style={styles.unit}>{unit}</Text>}
        </View>
      ) : (
        !!unit && <Text style={styles.unit}>{unit}</Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  empty: { fontFamily: fonts.sans, fontSize: 13, color: colors.textMuted },
  unit: { fontFamily: fonts.sans, fontSize: 10, color: colors.textMuted, textAlign: 'right', marginTop: 2, flex: 1 },
  legend: { flexDirection: 'row', alignItems: 'center', gap: 14, marginTop: 6, paddingHorizontal: 4 },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  legendDot: { width: 10, height: 10, borderRadius: 5 },
  legendTxt: { fontFamily: fonts.sans, fontSize: 11, color: colors.textSecondary },
});
