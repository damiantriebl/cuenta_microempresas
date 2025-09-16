import React from 'react';
import { View, StyleSheet, ViewStyle, Dimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '@/context/ThemeProvider';

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');

interface BottomFirstLayoutProps {
  children: React.ReactNode;
  style?: ViewStyle;
  showHeader?: boolean;
  headerContent?: React.ReactNode;
  bottomContent?: React.ReactNode;
  backgroundColor?: string;
}

export function BottomFirstLayout({
  children,
  style,
  showHeader = false,
  headerContent,
  bottomContent,
  backgroundColor,
}: BottomFirstLayoutProps) {
  const insets = useSafeAreaInsets();
  const { colors, spacing } = useTheme();

  return (
    <View style={[
      styles.container,
      {
        paddingTop: insets.top,
        paddingBottom: insets.bottom,
        backgroundColor: backgroundColor || colors.backgroundLight,
      },
      style
    ]}>
      {showHeader && headerContent && (
        <View style={[styles.header, { paddingHorizontal: spacing.md }]}>
          {headerContent}
        </View>
      )}
      
      <View style={styles.content}>
        {children}
      </View>
      
      {bottomContent && (
        <View style={[
          styles.bottomSection,
          {
            paddingHorizontal: spacing.md,
            paddingBottom: spacing.md,
          }
        ]}>
          {bottomContent}
        </View>
      )}
    </View>
  );
}

interface ThumbZoneProps {
  children: React.ReactNode;
  style?: ViewStyle;
  position?: 'bottom' | 'bottom-right' | 'bottom-left';
}

export function ThumbZone({ children, style, position = 'bottom' }: ThumbZoneProps) {
  const insets = useSafeAreaInsets();
  const { spacing } = useTheme();

  const getPositionStyle = (): ViewStyle => {
    const baseStyle: ViewStyle = {
      position: 'absolute',
      bottom: insets.bottom + spacing.md,
    };

    switch (position) {
      case 'bottom':
        return {
          ...baseStyle,
          left: spacing.md,
          right: spacing.md,
        };
      case 'bottom-right':
        return {
          ...baseStyle,
          right: spacing.md,
        };
      case 'bottom-left':
        return {
          ...baseStyle,
          left: spacing.md,
        };
      default:
        return baseStyle;
    }
  };

  return (
    <View style={[getPositionStyle(), style]}>
      {children}
    </View>
  );
}

interface ResponsiveContainerProps {
  children: React.ReactNode;
  style?: ViewStyle;
  maxWidth?: number;
  centerContent?: boolean;
}

export function ResponsiveContainer({
  children,
  style,
  maxWidth = 600,
  centerContent = true,
}: ResponsiveContainerProps) {
  const { spacing } = useTheme();

  const containerStyle: ViewStyle = {
    width: '100%',
    maxWidth: Math.min(screenWidth, maxWidth),
    paddingHorizontal: spacing.md,
  };

  if (centerContent && screenWidth > maxWidth) {
    containerStyle.alignSelf = 'center';
  }

  return (
    <View style={[containerStyle, style]}>
      {children}
    </View>
  );
}

interface TouchTargetProps {
  children: React.ReactNode;
  onPress?: () => void;
  style?: ViewStyle;
  minSize?: number;
}

export function TouchTarget({
  children,
  onPress,
  style,
  minSize = 44, // iOS HIG minimum touch target
}: TouchTargetProps) {
  const touchStyle: ViewStyle = {
    minWidth: minSize,
    minHeight: minSize,
    alignItems: 'center',
    justifyContent: 'center',
  };

  if (onPress) {
    const { TouchableOpacity } = require('react-native');
    return (
      <TouchableOpacity style={[touchStyle, style]} onPress={onPress}>
        {children}
      </TouchableOpacity>
    );
  }

  return (
    <View style={[touchStyle, style]}>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    paddingVertical: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#e0e0e0',
  },
  content: {
    flex: 1,
  },
  bottomSection: {
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: '#e0e0e0',
    paddingTop: 16,
  },
});