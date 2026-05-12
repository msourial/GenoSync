import React from 'react';
import {
  View,
  StyleSheet,
  ViewStyle,
  TouchableOpacity,
  TouchableOpacityProps,
} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import { Colors } from '../theme/colors';
import { borderRadius } from '../theme/tokens';

interface SolCardProps extends TouchableOpacityProps {
  children: React.ReactNode;
  variant?: 'default' | 'gradient' | 'bordered' | 'elevated';
  style?: ViewStyle;
  onPress?: () => void;
}

export const SolCard: React.FC<SolCardProps> = ({
  children,
  variant = 'default',
  style,
  onPress,
  ...props
}) => {
  const isTouchable = !!onPress;

  const cardContent = (
    <View
      style={[
        styles.base,
        variant === 'gradient' && styles.gradientWrapper,
        variant === 'bordered' && styles.bordered,
        variant === 'elevated' && styles.elevated,
        style,
      ]}
    >
      {variant === 'gradient' ? (
        <LinearGradient
          colors={[...Colors.gradients.card]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.gradient}
        >
          {children}
        </LinearGradient>
      ) : (
        children
      )}
    </View>
  );

  if (isTouchable) {
    return (
      <TouchableOpacity activeOpacity={0.85} onPress={onPress} {...props}>
        {cardContent}
      </TouchableOpacity>
    );
  }

  return cardContent;
};

const styles = StyleSheet.create({
  base: {
    borderRadius: borderRadius.lg,
    overflow: 'hidden',
    backgroundColor: Colors.surface,
  },
  gradientWrapper: {
    backgroundColor: 'transparent',
  },
  gradient: {
    padding: 20,
  },
  bordered: {
    borderWidth: 1,
    borderColor: `${Colors.solana.purple}30`,
    backgroundColor: Colors.surface,
    padding: 20,
  },
  elevated: {
    backgroundColor: Colors.surface,
    shadowColor: Colors.solana.purple,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 4,
    padding: 20,
  },
});
