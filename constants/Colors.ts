/**
 * Color palette and theme system for the debt management app.
 * Based on the design specifications with gradient backgrounds and consistent color scheme.
 */

// Primary gradient colors - Based on the app logo
export const GradientColors = {
  primary: ['#20B2AA', '#2E8B57'], // Main gradient from turquoise to green (logo colors)
  secondary: ['#20B2AA', '#228B22'], // Accent gradient variation
  card: ['rgba(255,255,255,0.9)', 'rgba(255,255,255,0.7)'], // Subtle card gradients
  overlay: ['rgba(0,0,0,0.1)', 'rgba(0,0,0,0.05)'], // Overlay gradients
};

// Core color palette - Based on the app logo
export const AppColors = {
  // Primary colors from logo
  primaryAccent: '#20B2AA', // Turquoise from logo
  primaryGreen: '#2E8B57', // Green from logo
  gradientStart: '#20B2AA',
  gradientEnd: '#2E8B57',
  
  // UI colors
  buttonPrimary: '#3c3c3b',
  backgroundLight: '#ebebeb', // rgb(235, 235, 235)
  successGreen: '#2E8B57', // Use logo green for success
  
  // Text colors
  textPrimary: '#333333',
  textSecondary: '#666666',
  textLight: '#999999',
  textWhite: '#ffffff',
  
  // Status colors
  success: '#2E8B57', // Logo green for success
  warning: '#f39c12',
  error: '#e74c3c', 
  info: '#20B2AA', // Logo turquoise for info
  
  // Card and surface colors
  cardBackground: '#ffffff',
  cardShadow: 'rgba(0,0,0,0.1)',
  surfaceLight: '#f8f9fa',
  surfaceDark: '#e9ecef',
  
  // Border colors
  borderLight: '#e0e0e0',
  borderMedium: '#cccccc',
  borderDark: '#999999',
  
  // Transparent overlays
  overlay: 'rgba(0,0,0,0.5)',
  overlayLight: 'rgba(0,0,0,0.2)',
};

// Legacy Colors object for compatibility
const tintColorLight = AppColors.primaryAccent;
const tintColorDark = '#fff';

export const Colors = {
  light: {
    text: AppColors.textPrimary,
    background: AppColors.backgroundLight,
    tint: tintColorLight,
    icon: AppColors.textSecondary,
    tabIconDefault: AppColors.textSecondary,
    tabIconSelected: tintColorLight,
  },
  dark: {
    text: '#ECEDEE',
    background: '#151718',
    tint: tintColorDark,
    icon: '#9BA1A6',
    tabIconDefault: '#9BA1A6',
    tabIconSelected: tintColorDark,
  },
};

// Spacing system for consistent layout
export const Spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
};

// Typography scale
export const Typography = {
  fontSize: {
    xs: 12,
    sm: 14,
    md: 16,
    lg: 18,
    xl: 20,
    xxl: 24,
    xxxl: 32,
  },
  fontWeight: {
    light: '300' as const,
    normal: '400' as const,
    medium: '500' as const,
    semibold: '600' as const,
    bold: '700' as const,
  },
  lineHeight: {
    tight: 1.2,
    normal: 1.4,
    relaxed: 1.6,
  },
};

// Shadow presets
export const Shadows = {
  small: {
    shadowColor: AppColors.cardShadow,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
    elevation: 2,
  },
  medium: {
    shadowColor: AppColors.cardShadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 4,
  },
  large: {
    shadowColor: AppColors.cardShadow,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
};
