/**
 * GenoSync Solana Theme
 * 
 * Color palette inspired by Solana branding and dark wellness aesthetic.
 * Primary accent: Solana purple (#9945FF)
 * Secondary: Solana green (#14F195)
 * Background: Deep navy slate
 */

export const Colors = {
  // Solana brand colors
  solana: {
    purple: '#9945FF',
    purpleLight: '#B87AFF',
    purpleDark: '#7B38CC',
    green: '#14F195',
    greenLight: '#5CFFB7',
    greenDark: '#0DBF76',
    blue: '#00D4AA',
    gradientStart: '#9945FF',
    gradientEnd: '#14F195',
  },

  // App semantic colors
  primary: '#9945FF',
  primaryLight: '#B87AFF',
  primaryDark: '#7B38CC',
  secondary: '#14F195',
  accent: '#F59E0B', // Gold for rewards
  accentLight: '#FBBF24',
  
  // Backgrounds
  background: '#000000', // OLED True Black
  surface: '#0B0F19',
  surfaceLight: '#141B2D',
  surfaceDark: '#050505',
  card: '#0B0F19',
  cardBorder: '#1E293B',
  
  // Text
  textPrimary: '#FFFFFF',
  textSecondary: '#94A3B8',
  textMuted: '#64748B',
  textInverse: '#000000',
  
  // States
  success: '#14F195',
  successBg: 'rgba(20, 241, 149, 0.1)',
  warning: '#F59E0B',
  warningBg: 'rgba(245, 158, 11, 0.1)',
  error: '#EF4444',
  errorBg: 'rgba(239, 68, 68, 0.1)',
  info: '#3B82F6',
  infoBg: 'rgba(59, 130, 246, 0.1)',
  
  // Gradients
  gradients: {
    primary: ['#9945FF', '#14F195'],
    purple: ['#9945FF', '#B87AFF'],
    green: ['#14F195', '#00D4AA'],
    dark: ['#0B0F19', '#141B2D'],
    card: ['#1A2235', '#141B2D'],
    glow: ['rgba(153, 69, 255, 0.2)', 'rgba(20, 241, 149, 0.1)'],
  },

  // Wellness grades
  grades: {
    S: '#F59E0B',
    A: '#14F195',
    B: '#3B82F6',
    C: '#64748B',
    D: '#EF4444',
  },

  // Tab bar
  tabBar: {
    background: '#000000',
    active: '#9945FF',
    inactive: '#64748B',
  },
} as const;

export type SolanaColors = typeof Colors;
