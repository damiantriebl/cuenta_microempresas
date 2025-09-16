export const GradientColors = {
  primary: ['#20B2AA', '#2E8B57'], 
  secondary: ['#20B2AA', '#228B22'], 
  card: ['rgba(255,255,255,0.9)', 'rgba(255,255,255,0.7)'], 
  overlay: ['rgba(0,0,0,0.1)', 'rgba(0,0,0,0.05)'], 
};


export const AppColors = {
  
  primaryAccent: '#20B2AA', 
  primaryGreen: '#2E8B57', 
  gradientStart: '#20B2AA',
  gradientEnd: '#2E8B57',
  buttonPrimary: '#3c3c3b',
  backgroundLight: '#ebebeb', 
  successGreen: '#2E8B57', 
  textPrimary: '#333333',
  textSecondary: '#666666',
  textLight: '#999999',
  textWhite: '#ffffff',
  success: '#2E8B57', 
  warning: '#f39c12',
  error: '#e74c3c', 
  info: '#20B2AA', 
  cardBackground: '#ffffff',
  cardShadow: 'rgba(0,0,0,0.1)',
  surfaceLight: '#f8f9fa',
  surfaceDark: '#e9ecef',
  borderLight: '#e0e0e0',
  borderMedium: '#cccccc',
  borderDark: '#999999',
  overlay: 'rgba(0,0,0,0.5)',
  overlayLight: 'rgba(0,0,0,0.2)',
};


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


export const Spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
};


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
