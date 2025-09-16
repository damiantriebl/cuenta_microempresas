import React from 'react';
import { StyleSheet, ViewStyle } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { GradientColors } from '@/constants/Colors';

interface GradientBackgroundProps {
  children?: React.ReactNode;
  colors?: string[];
  style?: ViewStyle;
  start?: { x: number; y: number };
  end?: { x: number; y: number };
}

export function GradientBackground({
  children,
  colors = GradientColors.primary,
  style,
  start = { x: 0, y: 0 },
  end = { x: 1, y: 1 },
}: GradientBackgroundProps) {
  return (
    <LinearGradient
      colors={colors}
      start={start}
      end={end}
      style={[styles.gradient, style]}
    >
      {children}
    </LinearGradient>
  );
}

export function PrimaryGradient({ children, style }: { children?: React.ReactNode; style?: ViewStyle }) {
  return (
    <GradientBackground
      colors={GradientColors.primary}
      style={style}
    >
      {children}
    </GradientBackground>
  );
}

export function SecondaryGradient({ children, style }: { children?: React.ReactNode; style?: ViewStyle }) {
  return (
    <GradientBackground
      colors={GradientColors.secondary}
      style={style}
    >
      {children}
    </GradientBackground>
  );
}

export function CardGradient({ children, style }: { children?: React.ReactNode; style?: ViewStyle }) {
  return (
    <GradientBackground
      colors={GradientColors.card}
      style={style}
    >
      {children}
    </GradientBackground>
  );
}

const styles = StyleSheet.create({
  gradient: {
    flex: 1,
  },
});