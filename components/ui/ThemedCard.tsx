import React from 'react';
import { View, StyleSheet, ViewStyle } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from '@/context/ThemeProvider';

interface ThemedCardProps {
  children: React.ReactNode;
  variant?: 'default' | 'gradient' | 'elevated';
  style?: ViewStyle;
  backgroundColor?: string;
  gradientColors?: string[];
}

export function ThemedCard({
  children,
  variant = 'default',
  style,
  backgroundColor,
  gradientColors,
}: ThemedCardProps) {
  const { colors, gradients, spacing, shadows } = useTheme();

  const getCardStyle = (): ViewStyle => {
    const baseStyle: ViewStyle = {
      borderRadius: 12,
      padding: spacing.md,
      marginVertical: spacing.xs,
    };

    const variantStyles = {
      default: {
        backgroundColor: backgroundColor || colors.cardBackground,
        ...shadows.small,
      },
      gradient: {
        // Will be handled by LinearGradient
        ...shadows.medium,
      },
      elevated: {
        backgroundColor: backgroundColor || colors.cardBackground,
        ...shadows.large,
      },
    };

    return {
      ...baseStyle,
      ...variantStyles[variant],
    };
  };

  if (variant === 'gradient') {
    return (
      <LinearGradient
        colors={gradientColors || gradients.card}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={[getCardStyle(), { backgroundColor: 'transparent' }, style]}
      >
        {children}
      </LinearGradient>
    );
  }

  return (
    <View style={[getCardStyle(), style]}>
      {children}
    </View>
  );
}