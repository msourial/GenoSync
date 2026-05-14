import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Animated,
  Easing,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { BrainwaveVisualizer } from './BrainwaveVisualizer';
import * as ColorModule from '../theme/colors';
import * as ThemeTokens from '../theme/tokens';

export interface MeditationModeProps {
  onComplete?: (result: { durationSec: number; focusScore: number }) => void;
  targetSec?: number;
}

type Phase = 'idle' | 'active' | 'complete';

const palette = (((ColorModule as any).Colors ?? (ColorModule as any).default) || {}) as any;
const tokens = ThemeTokens as any;

const colors = {
  background: palette.background ?? '#000000',
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

const formatDuration = (sec: number): string => {
  const m = Math.floor(sec / 60)
    .toString()
    .padStart(2, '0');
  const s = Math.floor(sec % 60)
    .toString()
    .padStart(2, '0');
  return `${m}:${s}`;
};

export const MeditationMode: React.FC<MeditationModeProps> = ({ onComplete, targetSec = 180 }) => {
  const [phase, setPhase] = useState<Phase>('idle');
  const [elapsedSec, setElapsedSec] = useState(0);
  const [focusScore, setFocusScore] = useState(0);

  const startRef = useRef<number | null>(null);
  const phaseAnim = useRef(new Animated.Value(0)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    phaseAnim.setValue(0);
    Animated.timing(phaseAnim, {
      toValue: 1,
      duration: 320,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start();
  }, [phase, phaseAnim]);

  useEffect(() => {
    if (phase !== 'active') {
      pulseAnim.stopAnimation();
      pulseAnim.setValue(1);
      return;
    }

    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.04,
          duration: 900,
          easing: Easing.inOut(Easing.quad),
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 900,
          easing: Easing.inOut(Easing.quad),
          useNativeDriver: true,
        }),
      ])
    );

    loop.start();
    return () => loop.stop();
  }, [phase, pulseAnim]);

  useEffect(() => {
    if (phase !== 'active') {
      return;
    }

    const id = setInterval(() => {
      if (startRef.current == null) {
        return;
      }
      const now = Date.now();
      const sec = Math.max(0, Math.floor((now - startRef.current) / 1000));
      setElapsedSec(sec);
    }, 500);

    return () => clearInterval(id);
  }, [phase]);

  const progress = useMemo(() => {
    return Math.min(1, elapsedSec / Math.max(1, targetSec));
  }, [elapsedSec, targetSec]);

  const completeSession = useCallback(
    (duration: number) => {
      const score = Math.max(0, Math.min(100, Math.round((duration / Math.max(1, targetSec)) * 100)));
      setFocusScore(score);
      setPhase('complete');
      onComplete?.({ durationSec: duration, focusScore: score });
    },
    [onComplete, targetSec]
  );

  useEffect(() => {
    if (phase === 'active' && elapsedSec >= targetSec) {
      completeSession(elapsedSec);
    }
  }, [phase, elapsedSec, targetSec, completeSession]);

  const onBegin = useCallback(() => {
    setElapsedSec(0);
    setFocusScore(0);
    startRef.current = Date.now();
    setPhase('active');
  }, []);

  const onEnd = useCallback(() => {
    completeSession(elapsedSec);
  }, [completeSession, elapsedSec]);

  const onReset = useCallback(() => {
    startRef.current = null;
    setElapsedSec(0);
    setFocusScore(0);
    setPhase('idle');
  }, []);

  const animatedStyle = {
    opacity: phaseAnim,
    transform: [
      {
        translateY: phaseAnim.interpolate({
          inputRange: [0, 1],
          outputRange: [16, 0],
        }),
      },
    ],
  };

  return (
    <View style={styles.container}>
      <Animated.View style={[styles.card, animatedStyle]}>
        {phase === 'idle' && (
          <View style={styles.centered}>
            <Ionicons name="leaf-outline" size={34} color={colors.green} style={styles.headerIcon} />
            <Text style={styles.title}>Meditation Mode</Text>
            <Text style={styles.subtitle}>Center your focus with guided stillness and live brainwave feedback.</Text>
            <TouchableOpacity style={styles.primaryButton} onPress={onBegin} activeOpacity={0.85}>
              <Text style={styles.primaryButtonText}>Begin</Text>
            </TouchableOpacity>
          </View>
        )}

        {phase === 'active' && (
          <Animated.View style={[styles.centered, { transform: [{ scale: pulseAnim }] }]}>
            <Text style={styles.label}>In Session</Text>
            <Text style={styles.timer}>{formatDuration(elapsedSec)}</Text>
            <View style={styles.progressTrack}>
              <View style={[styles.progressFill, { width: `${progress * 100}%` }]} />
            </View>
            <Text style={styles.progressText}>{Math.round(progress * 100)}% of target</Text>
            <View style={styles.visualizerWrap}>
              <BrainwaveVisualizer />
            </View>
            <TouchableOpacity style={styles.secondaryButton} onPress={onEnd} activeOpacity={0.85}>
              <Text style={styles.secondaryButtonText}>End</Text>
            </TouchableOpacity>
          </Animated.View>
        )}

        {phase === 'complete' && (
          <View style={styles.centered}>
            <Ionicons name="checkmark-circle" size={36} color={colors.green} style={styles.headerIcon} />
            <Text style={styles.title}>Session Complete</Text>
            <Text style={styles.metricValue}>{focusScore}</Text>
            <Text style={styles.metricLabel}>Focus Score</Text>
            <Text style={styles.subtitle}>Duration: {formatDuration(elapsedSec)}</Text>

            <View style={styles.rowButtons}>
              <TouchableOpacity style={styles.ghostButton} onPress={onReset} activeOpacity={0.85}>
                <Text style={styles.ghostButtonText}>Close</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.primaryButtonSmall} onPress={onBegin} activeOpacity={0.85}>
                <Text style={styles.primaryButtonText}>Again</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}
      </Animated.View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
    padding: spacing.lg,
  },
  card: {
    flex: 1,
    borderRadius: borderRadius.xl,
    backgroundColor: colors.surface,
    padding: spacing.xl,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerIcon: {
    marginBottom: spacing.md,
  },
  title: {
    color: colors.textPrimary,
    fontSize: 24,
    fontWeight: '700',
    marginBottom: spacing.sm,
    textAlign: 'center',
  },
  subtitle: {
    color: colors.textSecondary,
    fontSize: 14,
    lineHeight: 20,
    textAlign: 'center',
    marginBottom: spacing.xl,
  },
  label: {
    color: colors.textSecondary,
    fontSize: 13,
    marginBottom: spacing.xs,
  },
  timer: {
    color: colors.textPrimary,
    fontSize: 42,
    fontWeight: '800',
    letterSpacing: 1,
    marginBottom: spacing.md,
  },
  progressTrack: {
    width: '92%',
    height: 8,
    borderRadius: 999,
    backgroundColor: 'rgba(255,255,255,0.1)',
    overflow: 'hidden',
    marginBottom: spacing.sm,
  },
  progressFill: {
    height: '100%',
    backgroundColor: colors.purple,
  },
  progressText: {
    color: colors.textSecondary,
    fontSize: 12,
    marginBottom: spacing.lg,
  },
  visualizerWrap: {
    width: '100%',
    minHeight: 160,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.xl,
  },
  primaryButton: {
    backgroundColor: colors.purple,
    borderRadius: borderRadius.lg,
    paddingHorizontal: spacing.xxxl,
    paddingVertical: spacing.md,
    minWidth: 160,
    alignItems: 'center',
  },
  primaryButtonSmall: {
    backgroundColor: colors.purple,
    borderRadius: borderRadius.lg,
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.md,
    minWidth: 120,
    alignItems: 'center',
  },
  primaryButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
  secondaryButton: {
    borderWidth: 1,
    borderColor: colors.green,
    borderRadius: borderRadius.lg,
    paddingHorizontal: spacing.xxxl,
    paddingVertical: spacing.md,
  },
  secondaryButtonText: {
    color: colors.green,
    fontSize: 16,
    fontWeight: '700',
  },
  metricValue: {
    color: colors.green,
    fontSize: 56,
    fontWeight: '800',
    marginTop: spacing.xs,
  },
  metricLabel: {
    color: colors.textPrimary,
    fontSize: 16,
    marginBottom: spacing.lg,
  },
  rowButtons: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  ghostButton: {
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
    borderRadius: borderRadius.lg,
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.md,
    minWidth: 100,
    alignItems: 'center',
  },
  ghostButtonText: {
    color: colors.textSecondary,
    fontSize: 15,
    fontWeight: '600',
  },
});

export default MeditationMode;
