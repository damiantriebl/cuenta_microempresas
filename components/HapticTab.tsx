import { BottomTabBarButtonProps } from '@react-navigation/bottom-tabs';
import { Platform, Pressable, GestureResponderEvent } from 'react-native';
let Haptics: any = null;
if (Platform.OS !== 'web') {
  try {
    Haptics = require('expo-haptics');
  } catch (error) {
  }
}
export function HapticTab(props: BottomTabBarButtonProps) {
  const { onPress, onPressIn, style, children, ...restProps } = props;

  return (
    <Pressable
      onPress={onPress}
      style={style}
      onPressIn={(ev: GestureResponderEvent) => {
        if (process.env.EXPO_OS === 'ios' && Haptics) {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        }
        onPressIn?.(ev);
      }}
    >
      {children}
    </Pressable>
  );
}
