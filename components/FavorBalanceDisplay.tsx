import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { formatCurrency } from '@/schemas/business-logic';
import { FontAwesome } from '@expo/vector-icons';

interface FavorBalanceDisplayProps {
  amount: number;
  message?: string;
}

const FavorBalanceDisplay: React.FC<FavorBalanceDisplayProps> = ({
  amount,
  message = 'saldo a favor'
}) => {
  return (
    <View style={styles.container}>
      <LinearGradient
        colors={['#2E7D32', '#1B5E20']}
        style={styles.favorCard}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      >
        <View style={styles.cardContent}>
          <View style={styles.iconContainer}>
            <FontAwesome name="plus-circle" size={24} color="#FFFFFF" />
          </View>

          <View style={styles.textContainer}>
            <Text style={styles.favorLabel}>{message}</Text>
            <Text style={styles.favorAmount}>{formatCurrency(amount)}</Text>
          </View>

          <View style={styles.decorativeElement}>
            <FontAwesome name="star" size={16} color="rgba(255, 255, 255, 0.3)" />
          </View>
        </View>

        {/* Subtle pattern overlay */}
        <View style={styles.patternOverlay} />
      </LinearGradient>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginVertical: 12,
    paddingHorizontal: 16,
  },
  favorCard: {
    borderRadius: 14,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.2,
    shadowRadius: 6,
    elevation: 5,
    overflow: 'hidden',
    position: 'relative',
  },
  cardContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    position: 'relative',
    zIndex: 1,
  },
  iconContainer: {
    marginRight: 12,
  },
  textContainer: {
    flex: 1,
    alignItems: 'center',
  },
  favorLabel: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 4,
    opacity: 0.95,
  },
  favorAmount: {
    color: '#FFFFFF',
    fontSize: 20,
    fontWeight: 'bold',
  },
  decorativeElement: {
    marginLeft: 12,
  },
  patternOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    opacity: 0.5,
  },
});

export default FavorBalanceDisplay;