import React from 'react';
import { TouchableOpacity, StyleSheet, ViewStyle } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/context/ThemeProvider';
import { ThumbZone } from './BottomFirstLayout';

interface FloatingActionButtonProps {
  onPress: () => void;
  icon?: keyof typeof Ionicons.glyphMap;
  size?: number;
  position?: 'bottom-right' | 'bottom-left' | 'bottom-center';
  variant?: 'primary' | 'gradient' | 'secondary';
  style?: ViewStyle;
  disabled?: boolean;
}

export function FloatingActionButton({
  onPress,
  icon = 'add',
  size = 56,
  position = 'bottom-right',
  variant = 'gradient',
  style,
  disabled = false,
}: FloatingActionButtonProps) {
  const { colors, gradients, shadows } = useTheme();

  const buttonStyle: ViewStyle = {
    width: size,
    height: size,
    borderRadius: size / 2,
    alignItems: 'center',
    justifyContent: 'center',
    ...shadows.large,
    opacity: disabled ? 0.6 : 1,
  };

  const getThumbZonePosition = () => {
    switch (position) {
      case 'bottom-left':
        return 'bottom-left' as const;
      case 'bottom-center':
        return 'bottom' as const;
      case 'bottom-right':
      default:
        return 'bottom-right' as const;
    }
  };

  const renderButton = () => {
    if (variant === 'gradient') {
      return (
        <TouchableOpacity
          onPress={onPress}
          disabled={disabled}
          activeOpacity={0.8}
          style={style}
        >
          <LinearGradient
            colors={gradients.primary}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={buttonStyle}
          >
            <Ionicons
              name={icon}
              size={size * 0.4}
              color={colors.textWhite}
            />
          </LinearGradient>
        </TouchableOpacity>
      );
    }

    const backgroundColor = variant === 'primary' ? colors.buttonPrimary : colors.primaryAccent;

    return (
      <TouchableOpacity
        onPress={onPress}
        disabled={disabled}
        activeOpacity={0.8}
        style={[buttonStyle, { backgroundColor }, style]}
      >
        <Ionicons
          name={icon}
          size={size * 0.4}
          color={colors.textWhite}
        />
      </TouchableOpacity>
    );
  };

  return (
    <ThumbZone position={getThumbZonePosition()}>
      {renderButton()}
    </ThumbZone>
  );
}

interface SpeedDialProps {
  mainIcon?: keyof typeof Ionicons.glyphMap;
  actions: Array<{
    icon: keyof typeof Ionicons.glyphMap;
    label?: string;
    onPress: () => void;
  }>;
  isOpen: boolean;
  onToggle: () => void;
  position?: 'bottom-right' | 'bottom-left';
}

export function SpeedDial({
  mainIcon = 'add',
  actions,
  isOpen,
  onToggle,
  position = 'bottom-right',
}: SpeedDialProps) {
  const { colors, spacing, shadows } = useTheme();

  return (
    <ThumbZone position={position}>
      {isOpen && (
        <React.Fragment>
          {actions.map((action, index) => (
            <TouchableOpacity
              key={index}
              onPress={action.onPress}
              style={[
                styles.speedDialAction,
                {
                  backgroundColor: colors.cardBackground,
                  marginBottom: spacing.sm,
                  ...shadows.medium,
                },
              ]}
              activeOpacity={0.8}
            >
              <Ionicons
                name={action.icon}
                size={20}
                color={colors.primaryAccent}
              />
            </TouchableOpacity>
          ))}
        </React.Fragment>
      )}
      
      <FloatingActionButton
        onPress={onToggle}
        icon={isOpen ? 'close' : mainIcon}
        position={position}
      />
    </ThumbZone>
  );
}

const styles = StyleSheet.create({
  speedDialAction: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'flex-end',
  },
});