import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Animated, Easing, StyleSheet, Text, View } from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import { Colors } from '../theme/colors';
import { borderRadius, shadows, spacing, typography } from '../theme/tokens';

export interface BreathingExerciseProps {
  durationSec?: number;
  onComplete?: () => void;
}

type BreathPhase = 'Inhale' | 'Hold' | 'Exhale';

const INHALE_MS = 4000;
const HOLD_MS = 7000;
const EXHALE_MS = 8000;

export const BreathingExercise: React.FC<BreathingExerciseProps> = ({
  durationSec = 60,
  onComplete,
}) => {
  const scale = useRef(new Animated.Value(1)).current;
  const [phase, setPhase] = useState<BreathPhase>('Inhale');
  const [timeLeft, setTimeLeft] = useState(durationSec);
  const isStoppedRef = useRef(false);
  const completedRef = useRef(false);

  const complete = () => {
    if (completedRef.current) {
      return;
    }
    completedRef.current = true;
    isStoppedRef.current = true;
    scale.stopAnimation();
    onComplete?.();
  };

  useEffect(() => {
    isStoppedRef.current = false;
    completedRef.current = false;
    setTimeLeft(durationSec);
    setPhase('Inhale');

    const startTs = Date.now();
    const tick = setInterval(() => {
      const elapsedSec = Math.floor((Date.now() - startTs) / 1000);
      const remaining = Math.max(0, durationSec - elapsedSec);
      setTimeLeft(remaining);
      if (remaining <= 0) {
        complete();
      }
    }, 250);

    const runCycle = () => {
      if (isStoppedRef.current) {
        return;
      }
      setPhase('Inhale');
      Animated.timing(scale, {
        toValue: 1.5,
        duration: INHALE_MS,
        easing: Easing.inOut(Easing.sin),
        useNativeDriver: true,
      }).start(({ finished }) => {
        if (!finished || isStoppedRef.current) {
          return;
        }
        setPhase('Hold');
        Animated.timing(scale, {
          toValue: 1.5,
          duration: HOLD_MS,
          easing: Easing.linear,
          useNativeDriver: true,
        }).start(({ finished: holdFinished }) => {
          if (!holdFinished || isStoppedRef.current) {
            return;
          }
          setPhase('Exhale');
          Animated.timing(scale, {
            toValue: 1,
            duration: EXHALE_MS,
            easing: Easing.inOut(Easing.sin),
            useNativeDriver: true,
          }).start(({ finished: exhaleFinished }) => {
            if (!exhaleFinished || isStoppedRef.current) {
              return;
            }
            runCycle();
          });
        });
      });
    };

    runCycle();

    return () => {
      isStoppedRef.current = true;
      clearInterval(tick);
      scale.stopAnimation();
    };
  }, [durationSec, onComplete, scale]);

  const timerLabel = useMemo(() => {
    const min = Math.floor(timeLeft / 60)
      .toString()
      .padStart(2, '0');
    const sec = (timeLeft % 60).toString().padStart(2, '0');
    return `${min}:${sec}`;
  }, [timeLeft]);

  return (
    <View style={styles.container}>
      <Animated.View style={[styles.animatedWrap, { transform: [{ scale }] }]}>
        <LinearGradient
          colors={[Colors.solana.green, Colors.solana.purple]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.circle}
        >
          <Text style={styles.phase}>{phase}</Text>
        </LinearGradient>
      </Animated.View>

      <View style={styles.metaCard}>
        <Text style={styles.timer}>{timerLabel}</Text>
        <Text style={styles.caption}>4s inhale · 7s hold · 8s exhale</Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.xl,
  },
  animatedWrap: {
    ...(shadows.glow as object),
  },
  circle: {
    width: 220,
    height: 220,
    borderRadius: 110,
    alignItems: 'center',
    justifyContent: 'center',
  },
  phase: {
    color: Colors.textPrimary,
    ...(typography.h2 as object),
  },
  metaCard: {
    marginTop: spacing.lg,
    backgroundColor: Colors.surface,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: '#203049',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    alignItems: 'center',
  },
  timer: {
    color: Colors.textPrimary,
    ...(typography.h3 as object),
  },
  caption: {
    marginTop: spacing.xs,
    color: Colors.textSecondary,
    ...(typography.caption as object),
  },
});
