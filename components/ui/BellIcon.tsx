import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface BellIconProps {
  size?: number;
  color?: string;
  hasNotifications?: boolean;
  notificationCount?: number;
  onPress?: () => void;
}

export function BellIcon({
  size = 24,
  color = '#25B4BD',
  hasNotifications = false,
  notificationCount = 0,
  onPress
}: BellIconProps) {
  const iconName = hasNotifications ? 'notifications' : 'notifications-outline';

  const content = (
    <View style={styles.container}>
      <Ionicons
        name={iconName}
        size={size}
        color={color}
      />
      {notificationCount > 0 && (
        <View style={styles.badge}>
          <Text style={styles.badgeText}>
            {notificationCount > 99 ? '99+' : notificationCount.toString()}
          </Text>
        </View>
      )}
    </View>
  );

  if (onPress) {
    return (
      <TouchableOpacity onPress={onPress} style={styles.touchable}>
        {content}
      </TouchableOpacity>
    );
  }

  return content;
}

const styles = StyleSheet.create({
  container: {
    position: 'relative',
  },
  touchable: {
    padding: 4,
  },
  badge: {
    position: 'absolute',
    top: -6,
    right: -6,
    backgroundColor: '#ff4444',
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#fff',
  },
  badgeText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: 'bold',
  },
});

export default BellIcon;