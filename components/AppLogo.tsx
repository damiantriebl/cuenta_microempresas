import React from 'react';
import { View, Image, Text, StyleSheet } from 'react-native';
interface AppLogoProps {
  size?: 'small' | 'medium' | 'large';
  showText?: boolean;
  style?: any;
}
export default function AppLogo({ size = 'medium', showText = true, style }: AppLogoProps) {
  const sizeStyles = {
    small: { width: 32, height: 32 },
    medium: { width: 48, height: 48 },
    large: { width: 80, height: 80 },
  };
  const textSizes = {
    small: 14,
    medium: 18,
    large: 24,
  };
  return (
    <View style={[styles.container, style]}>
      <Image 
        source={require('@/assets/images/logo.png')}
        style={[styles.logo, sizeStyles[size]]}
        resizeMode="contain"
      />
      {showText && (
        <Text style={[styles.appName, { fontSize: textSizes[size] }]}>
          Campo
        </Text>
      )}
    </View>
  );
}
const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  logo: {
    marginBottom: 8,
  },
  appName: {
    fontWeight: '700',
    color: '#2E8B57', // Verde del logo
    letterSpacing: 0.5,
  },
});
