import React from 'react';
import {
  TouchableOpacity,
  Text,
  StyleSheet,
  ActivityIndicator,
  View,
  TouchableOpacityProps,
} from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import { Colors } from '../theme/colors';
import { spacing, typography, borderRadius } from '../theme/tokens';

interface SolButtonProps extends TouchableOpacityProps {
  title: string;
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger';
  size?: 'sm' | 'md' | 'lg';
  icon?: string;
  iconPosition?: 'left' | 'right';
  loading?: boolean;
  fullWidth?: boolean;
}

export const SolButton: React.FC<SolButtonProps> = ({
  title,
  variant = 'primary',
  size = 'md',
  icon,
  iconPosition = 'left',
  loading = false,
  fullWidth = true,
  disabled,
  style,
  ...props
}) => {
  const isDisabled = disabled || loading;

  return (
    <TouchableOpacity
      style={[
        styles.base,
        styles[variant],
        styles[size],
        fullWidth && styles.fullWidth,
        isDisabled && styles.disabled,
        style,
      ]}
      disabled={isDisabled}
      activeOpacity={0.8}
      {...props}
    >
      {loading ? (
        <ActivityIndicator
          color={variant === 'primary' || variant === 'danger' ? '#fff' : Colors.solana.purple}
          size="small"
        />
      ) : (
        <View style={styles.content}>
          {icon && iconPosition === 'left' && (
            <Icon
              name={icon}
              size={size === 'sm' ? 16 : size === 'lg' ? 24 : 20}
              color={getIconColor(variant, isDisabled)}
              style={styles.iconLeft}
            />
          )}
          <Text
            style={[
              styles.text,
              styles[`${size}Text`],
              styles[`${variant}Text`],
              isDisabled && styles.disabledText,
            ]}
          >
            {title}
          </Text>
          {icon && iconPosition === 'right' && (
            <Icon
              name={icon}
              size={size === 'sm' ? 16 : size === 'lg' ? 24 : 20}
              color={getIconColor(variant, isDisabled)}
              style={styles.iconRight}
            />
          )}
        </View>
      )}
    </TouchableOpacity>
  );
};

function getIconColor(variant: string, disabled: boolean): string {
  if (disabled) return Colors.textMuted;
  switch (variant) {
    case 'primary':
    case 'danger':
      return '#fff';
    case 'outline':
      return Colors.solana.purple;
    default:
      return Colors.textPrimary;
  }
}

const styles = StyleSheet.create({
  base: {
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: borderRadius.md,
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  iconLeft: {
    marginRight: 8,
  },
  iconRight: {
    marginLeft: 8,
  },
  // Sizes
  sm: {
    paddingVertical: 8,
    paddingHorizontal: 14,
  },
  md: {
    paddingVertical: 14,
    paddingHorizontal: 24,
  },
  lg: {
    paddingVertical: 18,
    paddingHorizontal: 32,
  },
  fullWidth: {
    width: '100%',
  },
  // Variants
  primary: {
    backgroundColor: Colors.solana.purple,
  },
  secondary: {
    backgroundColor: Colors.solana.green,
  },
  outline: {
    backgroundColor: 'transparent',
    borderWidth: 1.5,
    borderColor: Colors.solana.purple,
  },
  ghost: {
    backgroundColor: 'transparent',
  },
  danger: {
    backgroundColor: Colors.error,
  },
  // Text
  text: {
    fontWeight: '600',
  },
  smText: {
    fontSize: 13,
  },
  mdText: {
    fontSize: 16,
  },
  lgText: {
    fontSize: 18,
  },
  primaryText: {
    color: '#fff',
  },
  secondaryText: {
    color: Colors.textInverse,
  },
  outlineText: {
    color: Colors.solana.purple,
  },
  ghostText: {
    color: Colors.textPrimary,
  },
  dangerText: {
    color: '#fff',
  },
  // States
  disabled: {
    opacity: 0.5,
  },
  disabledText: {
    color: Colors.textMuted,
  },
});
