import React, { useEffect, useRef } from 'react';
import {
  Animated,
  Easing,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { Colors } from '../theme/colors';
import { borderRadius, shadows, spacing, typography } from '../theme/tokens';

export interface MetricTileProps {
  icon: string;
  label: string;
  value: string;
  unit?: string;
  color?: string;
  onPress?: () => void;
  pulse?: boolean;
}

export const MetricTile: React.FC<MetricTileProps> = ({
  icon,
  label,
  value,
  unit,
  color = Colors.solana.green,
  onPress,
  pulse = false,
}) => {
  const anim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!pulse) {
      anim.setValue(0);
      return;
    }

    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(anim, {
          toValue: 1,
          duration: 900,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
        Animated.timing(anim, {
          toValue: 0,
          duration: 900,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
      ]),
    );

    loop.start();
    return () => loop.stop();
  }, [anim, pulse]);

  const scale = anim.interpolate({
    inputRange: [0, 1],
    outputRange: [1, 1.03],
  });

  const opacity = anim.interpolate({
    inputRange: [0, 1],
    outputRange: [1, 0.92],
  });

  return (
    <Animated.View style={[{ transform: [{ scale }], opacity }]}> 
      <TouchableOpacity
        activeOpacity={0.85}
        onPress={onPress}
        disabled={!onPress}
        style={styles.touch}
      >
        <View style={[styles.iconWrap, { backgroundColor: `${color}22` }]}>
          <Ionicons name={icon} size={18} color={color} />
        </View>

        <Text style={styles.label}>{label}</Text>

        <View style={styles.valueRow}>
          <Text style={styles.value}>{value}</Text>
          {unit ? <Text style={styles.unit}>{unit}</Text> : null}
        </View>
      </TouchableOpacity>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  touch: {
    minWidth: 120,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: '#25344F',
    backgroundColor: Colors.surface,
    padding: spacing.md,
    ...(shadows.sm as object),
  },
  iconWrap: {
    width: 32,
    height: 32,
    borderRadius: borderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  label: {
    marginTop: spacing.sm,
    color: Colors.textSecondary,
    ...(typography.caption as object),
  },
  valueRow: {
    marginTop: spacing.xs,
    flexDirection: 'row',
    alignItems: 'flex-end',
  },
  value: {
    color: Colors.textPrimary,
    ...(typography.h3 as object),
  },
  unit: {
    marginLeft: spacing.xs,
    marginBottom: 2,
    color: Colors.textSecondary,
    ...(typography.caption as object),
  },
});
