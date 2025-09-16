import React from 'react';
import { TouchableOpacity, Text, StyleSheet, ViewStyle, TextStyle } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from '@/context/ThemeProvider';

interface ThemedButtonProps {
  title: string;
  onPress: () => void;
  variant?: 'primary' | 'secondary' | 'gradient' | 'outline';
  size?: 'small' | 'medium' | 'large';
  disabled?: boolean;
  style?: ViewStyle;
  textStyle?: TextStyle;
}

export function ThemedButton({
  title,
  onPress,
  variant = 'primary',
  size = 'medium',
  disabled = false,
  style,
  textStyle,
}: ThemedButtonProps) {
  const { colors, gradients, spacing, typography, shadows } = useTheme();

  const getButtonStyle = (): ViewStyle => {
    const baseStyle: ViewStyle = {
      borderRadius: 8,
      alignItems: 'center',
      justifyContent: 'center',
      ...shadows.small,
    };

    const sizeStyles = {
      small: {
        paddingHorizontal: spacing.sm,
        paddingVertical: spacing.xs,
        minHeight: 32,
      },
      medium: {
        paddingHorizontal: spacing.md,
        paddingVertical: spacing.sm,
        minHeight: 44,
      },
      large: {
        paddingHorizontal: spacing.lg,
        paddingVertical: spacing.md,
        minHeight: 52,
      },
    };

    const variantStyles = {
      primary: {
        backgroundColor: colors.buttonPrimary,
      },
      secondary: {
        backgroundColor: colors.primaryAccent,
      },
      gradient: {
        // Will be handled by LinearGradient
      },
      outline: {
        backgroundColor: 'transparent',
        borderWidth: 1,
        borderColor: colors.primaryAccent,
      },
    };

    return {
      ...baseStyle,
      ...sizeStyles[size],
      ...variantStyles[variant],
      opacity: disabled ? 0.6 : 1,
    };
  };

  const getTextStyle = (): TextStyle => {
    const baseTextStyle: TextStyle = {
      fontWeight: typography.fontWeight.medium,
      textAlign: 'center',
    };

    const sizeTextStyles = {
      small: {
        fontSize: typography.fontSize.sm,
      },
      medium: {
        fontSize: typography.fontSize.md,
      },
      large: {
        fontSize: typography.fontSize.lg,
      },
    };

    const variantTextStyles = {
      primary: {
        color: colors.textWhite,
      },
      secondary: {
        color: colors.textWhite,
      },
      gradient: {
        color: colors.textWhite,
      },
      outline: {
        color: colors.primaryAccent,
      },
    };

    return {
      ...baseTextStyle,
      ...sizeTextStyles[size],
      ...variantTextStyles[variant],
    };
  };

  if (variant === 'gradient') {
    return (
      <TouchableOpacity
        onPress={onPress}
        disabled={disabled}
        style={[style]}
        activeOpacity={0.8}
      >
        <LinearGradient
          colors={gradients.primary}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={[getButtonStyle(), { backgroundColor: 'transparent' }]}
        >
          <Text style={[getTextStyle(), textStyle]}>{title}</Text>
        </LinearGradient>
      </TouchableOpacity>
    );
  }

  return (
    <TouchableOpacity
      style={[getButtonStyle(), style]}
      onPress={onPress}
      disabled={disabled}
      activeOpacity={0.8}
    >
      <Text style={[getTextStyle(), textStyle]}>{title}</Text>
    </TouchableOpacity>
  );
}