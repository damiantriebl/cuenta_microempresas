import React, { createContext, useContext, ReactNode } from 'react';
import { AppColors, GradientColors, Spacing, Typography, Shadows } from '@/constants/Colors';

interface ThemeContextType {
  colors: typeof AppColors;
  gradients: typeof GradientColors;
  spacing: typeof Spacing;
  typography: typeof Typography;
  shadows: typeof Shadows;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

interface ThemeProviderProps {
  children: ReactNode;
}

export function ThemeProvider({ children }: ThemeProviderProps) {
  const theme: ThemeContextType = {
    colors: AppColors,
    gradients: GradientColors,
    spacing: Spacing,
    typography: Typography,
    shadows: Shadows,
  };

  return (
    <ThemeContext.Provider value={theme}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
}

// Convenience hooks for specific theme parts
export function useColors() {
  return useTheme().colors;
}

export function useGradients() {
  return useTheme().gradients;
}

export function useSpacing() {
  return useTheme().spacing;
}

export function useTypography() {
  return useTheme().typography;
}

export function useShadows() {
  return useTheme().shadows;
}