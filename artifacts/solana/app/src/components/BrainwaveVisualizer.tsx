import React, { useEffect, useMemo, useRef } from 'react';
import { Animated, Easing, StyleSheet, View } from 'react-native';
import { Colors } from '../theme/colors';
import { borderRadius, spacing } from '../theme/tokens';

export interface BrainwaveVisualizerProps {
  intensity?: number;
  colors?: string[];
}

const clamp = (value: number, min: number, max: number): number =>
  Math.min(max, Math.max(min, value));

export const BrainwaveVisualizer: React.FC<BrainwaveVisualizerProps> = ({
  intensity = 0.6,
  colors,
}) => {
  const safeIntensity = clamp(intensity, 0, 1);
  const barCount = useMemo(() => 5 + Math.round(safeIntensity * 4), [safeIntensity]);
  const palette = colors && colors.length > 0 ? colors : [Colors.solana.green, Colors.solana.purple];
  const animsRef = useRef<Animated.Value[]>([]);

  if (animsRef.current.length !== barCount) {
    animsRef.current = Array.from({ length: barCount }, () => new Animated.Value(Math.random()));
  }

  useEffect(() => {
    const loops: Animated.CompositeAnimation[] = [];

    animsRef.current.forEach((value, index) => {
      const riseDuration = 380 + Math.floor(Math.random() * 520) + index * 45;
      const fallDuration = 420 + Math.floor(Math.random() * 680) + (barCount - index) * 40;
      const maxAmp = 0.45 + safeIntensity * 0.55;
      const lowAmp = 0.1 + (1 - safeIntensity) * 0.15;

      const loop = Animated.loop(
        Animated.sequence([
          Animated.delay(index * 70),
          Animated.timing(value, {
            toValue: maxAmp,
            duration: riseDuration,
            easing: Easing.inOut(Easing.sin),
            useNativeDriver: true,
          }),
          Animated.timing(value, {
            toValue: lowAmp,
            duration: fallDuration,
            easing: Easing.inOut(Easing.sin),
            useNativeDriver: true,
          }),
        ]),
      );

      loop.start();
      loops.push(loop);
    });

    return () => {
      loops.forEach((loop) => loop.stop());
    };
  }, [barCount, safeIntensity]);

  const maxHeight = 36 + safeIntensity * 44;

  return (
    <View style={[styles.row, { height: maxHeight }]}> 
      {animsRef.current.map((value, i) => {
        const scaleY = value.interpolate({
          inputRange: [0, 1],
          outputRange: [0.14, 1],
        });

        return (
          <View key={`bar-${i}`} style={[styles.track, { height: maxHeight }]}> 
            <Animated.View
              style={[
                styles.bar,
                {
                  backgroundColor: palette[i % palette.length],
                  transform: [{ scaleY }],
                  opacity: 0.55 + safeIntensity * 0.45,
                },
              ]}
            />
          </View>
        );
      })}
    </View>
  );
};

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'center',
    paddingHorizontal: spacing.sm,
  },
  track: {
    width: 10,
    marginHorizontal: 3,
    justifyContent: 'flex-end',
    overflow: 'hidden',
  },
  bar: {
    width: '100%',
    height: '100%',
    borderRadius: borderRadius.xl,
  },
});
