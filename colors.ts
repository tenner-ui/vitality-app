/**
 * Paleta oficial VITALITY — Azul & Dourado (Manual da marca).
 * TEMA CLARO: fundo off-white, texto azul-marinho, dourado + navy como acentos.
 * As marcas (navy, gold, blueAccent) permanecem; as superfícies são claras.
 */
export const colors = {
  // Marca (valores fixos)
  black: '#080B12', // Preto Base (uso pontual em contraste)
  navy: '#0D1F3F', // Azul-Marinho — cor primária
  blueAccent: '#2B5AA0', // Azul Realce — realce/ação
  gold: '#C8A24A', // Dourado — acento
  goldLight: '#E6CD8C', // Dourado Claro
  offWhite: '#F4F2EA', // Off-white — fundo

  // Superfícies (TEMA CLARO)
  surface: '#FFFFFF', // cartões brancos
  surfaceElevated: '#FFFFFF',
  surfaceMuted: '#F1EFE7', // cinza-quente claro (inputs/chips)
  border: '#E6E2D6', // linha clara quente
  hairline: 'rgba(200,162,74,0.5)', // linha fina dourada

  // Texto (escuro sobre claro)
  textPrimary: '#0D1F3F', // azul-marinho
  textSecondary: '#5A6980', // ardósia média
  textMuted: '#8A97AD',
  textOnGold: '#0D1F3F',

  // Estados funcionais (sóbrios)
  success: '#3E8E6E',
  warning: '#B8862F',
  danger: '#B4586A',
  info: '#2B5AA0',

  // Anéis de meta (mantidos na paleta)
  ringWater: '#2B5AA0',
  ringCalories: '#C8A24A',
  ringSteps: '#3E8E6E',
  ringWorkout: '#B8862F',

  transparent: 'transparent',
} as const;

export const gradients = {
  header: ['#0D1F3F', '#0A1A34'] as const, // faixa de cabeçalho navy (contraste)
  card: ['#FFFFFF', '#FBFAF6'] as const,
  gold: ['#E6CD8C', '#C8A24A'] as const,
  hero: ['#FBFAF6', '#F4F2EA', '#EFEDE3'] as const, // fundo claro do app
};

export type ColorName = keyof typeof colors;
