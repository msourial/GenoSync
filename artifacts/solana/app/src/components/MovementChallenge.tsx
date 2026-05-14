import React, { useMemo, useRef, useState } from 'react';
import { Animated, Easing, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import * as ColorModule from '../theme/colors';
import * as ThemeTokens from '../theme/tokens';

export interface Movement {
  id: string;
  prompt: string;
  icon: string;
}

const MOVEMENTS: Movement[] = [
  { id: 'stand-stretch', prompt: 'Stand up and stretch your arms overhead', icon: 'body-outline' },
  { id: 'desk-walk', prompt: 'Take a 1-minute desk walk', icon: 'walk-outline' },
  { id: 'ankle-rolls', prompt: 'Do 10 ankle rolls per side', icon: 'refresh-outline' },
  { id: 'spine-twist', prompt: 'Try a seated spine twist for 30 seconds', icon: 'sync-outline' },
  { id: 'squat-pulse', prompt: 'Complete 10 gentle squats', icon: 'fitness-outline' },
  { id: 'chest-open', prompt: 'Open your chest and hold for 20 seconds', icon: 'heart-outline' },
];

export const getRandomMovement = (): Movement => {
  const idx = Math.floor(Math.random() * MOVEMENTS.length);
  return MOVEMENTS[idx];
};

export interface MovementChallengeProps {
  onCompleted?: () => void;
}

const palette = (((ColorModule as any).Colors ?? (ColorModule as any).default) || {}) as any;
const tokens = ThemeTokens as any;

const colors = {
  surface: palette.surface ?? '#0B0F19',
  textPrimary: palette.textPrimary ?? '#FFFFFF',
  textSecondary: palette.textSecondary ?? '#94A3B8',
  purple: palette.solana?.purple ?? '#9945FF',
  green: palette.solana?.green ?? '#14F195',
};

const spacing = tokens.spacing ?? {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
  xxxl: 32,
};

const borderRadius = tokens.borderRadius ?? {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
};

export const MovementChallenge: React.FC<MovementChallengeProps> = ({ onCompleted }) => {
  const [movement, setMovement] = useState<Movement>(() => getRandomMovement());
  const celebrate = useRef(new Animated.Value(0)).current;

  const sparkleStyle = useMemo(
    () => ({
      opacity: celebrate,
      transform: [
        {
          scale: celebrate.interpolate({
            inputRange: [0, 1],
            outputRange: [0.6, 1.2],
          }),
        },
      ],
    }),
    [celebrate]
  );

  const onDone = () => {
    celebrate.setValue(0);
    Animated.sequence([
      Animated.timing(celebrate, {
        toValue: 1,
        duration: 380,
        easing: Easing.out(Easing.quad),
        useNativeDriver: true,
      }),
      Animated.timing(celebrate, {
        toValue: 0,
        duration: 300,
        easing: Easing.in(Easing.quad),
        useNativeDriver: true,
      }),
    ]).start(() => {
      onCompleted?.();
      setMovement(getRandomMovement());
    });
  };

  return (
    <View style={styles.card}>
      <View style={styles.headerRow}>
        <View style={styles.badge}>
          <Ionicons name="flash-outline" size={14} color={colors.green} />
          <Text style={styles.badgeText}>Movement Challenge</Text>
        </View>
      </View>

      <View style={styles.promptWrap}>
        <Ionicons name={movement.icon as any} size={30} color={colors.purple} style={styles.mainIcon} />
        <Text style={styles.prompt}>{movement.prompt}</Text>
      </View>

      <View style={styles.actionsRow}>
        <TouchableOpacity style={styles.secondaryBtn} onPress={() => setMovement(getRandomMovement())}>
          <Text style={styles.secondaryBtnText}>Shuffle</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.primaryBtn} onPress={onDone}>
          <Text style={styles.primaryBtnText}>Done</Text>
        </TouchableOpacity>
      </View>

      <Animated.View style={[styles.sparkle, styles.sparkleA, sparkleStyle]}>
        <Ionicons name="sparkles" size={18} color={colors.green} />
      </Animated.View>
      <Animated.View style={[styles.sparkle, styles.sparkleB, sparkleStyle]}>
        <Ionicons name="sparkles" size={14} color={colors.purple} />
      </Animated.View>
      <Animated.View style={[styles.sparkle, styles.sparkleC, sparkleStyle]}>
        <Ionicons name="sparkles" size={16} color={colors.green} />
      </Animated.View>
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.xl,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    padding: spacing.lg,
    overflow: 'hidden',
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: spacing.lg,
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    backgroundColor: 'rgba(20,241,149,0.12)',
    borderRadius: 999,
    paddingHorizontal: spacing.sm,
    paddingVertical: 6,
  },
  badgeText: {
    color: colors.green,
    fontSize: 12,
    fontWeight: '700',
  },
  promptWrap: {
    alignItems: 'center',
    marginBottom: spacing.xl,
  },
  mainIcon: {
    marginBottom: spacing.sm,
  },
  prompt: {
    color: colors.textPrimary,
    textAlign: 'center',
    fontSize: 18,
    lineHeight: 25,
    fontWeight: '600',
    paddingHorizontal: spacing.sm,
  },
  actionsRow: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  secondaryBtn: {
    flex: 1,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
    paddingVertical: spacing.md,
    alignItems: 'center',
  },
  secondaryBtnText: {
    color: colors.textSecondary,
    fontWeight: '600',
    fontSize: 14,
  },
  primaryBtn: {
    flex: 1,
    borderRadius: borderRadius.lg,
    backgroundColor: colors.purple,
    paddingVertical: spacing.md,
    alignItems: 'center',
  },
  primaryBtnText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 14,
  },
  sparkle: {
    position: 'absolute',
  },
  sparkleA: {
    right: 22,
    top: 18,
  },
  sparkleB: {
    left: 18,
    bottom: 20,
  },
  sparkleC: {
    right: 32,
    bottom: 18,
  },
});

export default MovementChallenge;
