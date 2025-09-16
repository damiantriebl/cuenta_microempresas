import { BottomTabBarButtonProps } from '@react-navigation/bottom-tabs';
import { PlatformPressable } from '@react-navigation/bottom-tabs';
import { Platform } from 'react-native';

// Conditional import for haptics (only on mobile)
let Haptics: any = null;
if (Platform.OS !== 'web') {
  try {
    Haptics = require('expo-haptics');
  } catch (error) {
    // Haptics not available, ignore
  }
}

export function HapticTab(props: BottomTabBarButtonProps) {
  return (
    <PlatformPressable
      {...props}
      onPressIn={(ev) => {
        if (process.env.EXPO_OS === 'ios' && Haptics) {
          // Add a soft haptic feedback when pressing down on the tabs.
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        }
        props.onPressIn?.(ev);
      }}
    />
  );
}
