import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { TransactionEventWithRunningTotal } from '@/schemas/business-logic';
import { formatCurrency, formatDate } from '@/schemas/business-logic';
import { FontAwesome } from '@expo/vector-icons';
import { useTheme } from '@/context/ThemeProvider';

interface TransactionCardProps {
  event: TransactionEventWithRunningTotal;
  onEdit?: () => void;
  onDelete?: () => void;
  onViewNotes?: () => void;
  showActions?: boolean;
  splitAmount?: number; // For split payments
}

const TransactionCard: React.FC<TransactionCardProps> = ({
  event,
  onEdit,
  onDelete,
  onViewNotes,
  showActions = true,
  splitAmount,
}) => {
  const { colors, spacing, typography, shadows } = useTheme();
  const isSale = event.tipo === 'venta';
  const isPayment = event.tipo === 'pago';
  const displayAmount = splitAmount || (isSale ? event.totalVenta : event.montoPago) || 0;

  // Utility: compute accessible text color for a given hex background
  const getReadableTextColor = (hex?: string): string => {
    if (!hex || typeof hex !== 'string' || !/^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/.test(hex)) {
      return colors.textPrimary;
    }
    const fullHex = hex.length === 4
      ? `#${hex[1]}${hex[1]}${hex[2]}${hex[2]}${hex[3]}${hex[3]}`
      : hex;
    const r = parseInt(fullHex.slice(1, 3), 16) / 255;
    const g = parseInt(fullHex.slice(3, 5), 16) / 255;
    const b = parseInt(fullHex.slice(5, 7), 16) / 255;
    // Relative luminance (WCAG)
    const toLinear = (c: number) => (c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4));
    const L = 0.2126 * toLinear(r) + 0.7152 * toLinear(g) + 0.0722 * toLinear(b);
    // Threshold tuned so that mid/dark colors use white
    return L < 0.5 ? colors.textWhite : colors.textPrimary;
  };

  // Determine card background color using theme
  const getCardBackgroundColor = () => {
    if (isPayment) {
      return colors.successGreen; // Theme green for payments
    }
    if (isSale && event.productoColor) {
      return event.productoColor; // Product color for sales
    }
    return colors.surfaceLight; // Theme default
  };

  // Determine text color based on background
  const getTextColor = () => {
    if (isPayment) {
      return colors.textWhite; // White text on green background
    }
    // Compute based on product color for sales
    if (isSale && event.productoColor) {
      return getReadableTextColor(event.productoColor);
    }
    return colors.textPrimary;
  };

  // Get gradient overlay colors
  const getGradientColors = () => {
    if (isPayment) {
      return ['rgba(255, 255, 255, 0.10)', 'rgba(0, 0, 0, 0.10)'];
    }
    // Slight dark overlay to increase contrast on vivid product colors
    return ['rgba(0, 0, 0, 0.08)', 'rgba(0, 0, 0, 0.12)'];
  };

  const backgroundColor = getCardBackgroundColor();
  const textColor = getTextColor();
  const gradientColors = getGradientColors();

  return (
    <View style={[
      styles.card,
      {
        backgroundColor,
        marginBottom: spacing.sm,
        ...shadows.medium,
      }
    ]}>
      {/* Subtle gradient overlay for enhanced aesthetics */}
      <LinearGradient
        colors={gradientColors}
        style={styles.gradientOverlay}
      />

      <View style={[styles.cardContent, { padding: spacing.md }]}>
        {/* Left side - Transaction details */}
        <View style={[styles.leftContent, { marginRight: spacing.md }]}>
          {isSale && (
            <>
              <Text style={[
                styles.productName,
                {
                  color: textColor,
                  fontSize: typography.fontSize.lg,
                  fontWeight: typography.fontWeight.bold,
                  marginBottom: spacing.xs,
                }
              ]}>
                {event.producto}
              </Text>
              <Text style={[
                styles.transactionDetails,
                {
                  color: textColor,
                  opacity: 0.8,
                  fontSize: typography.fontSize.sm,
                  marginBottom: spacing.xs,
                }
              ]}>
                {event.cantidad} x {formatCurrency((event.costoUnitario || 0) + (event.gananciaUnitaria || 0))}
              </Text>
              <Text style={[
                styles.totalAmount,
                {
                  color: textColor,
                  fontSize: typography.fontSize.md,
                  fontWeight: typography.fontWeight.semibold,
                  marginBottom: spacing.sm,
                }
              ]}>
                Total: {formatCurrency(displayAmount)}
              </Text>
            </>
          )}

          {isPayment && (
            <>
              <Text style={[
                styles.paymentLabel,
                {
                  color: textColor,
                  fontSize: typography.fontSize.lg,
                  fontWeight: typography.fontWeight.bold,
                  marginBottom: spacing.xs,
                }
              ]}>
                Pago recibido
              </Text>
              <Text style={[
                styles.totalAmount,
                {
                  color: textColor,
                  fontSize: typography.fontSize.md,
                  fontWeight: typography.fontWeight.semibold,
                  marginBottom: spacing.sm,
                }
              ]}>
                deuda total {formatCurrency(displayAmount)}
              </Text>
            </>
          )}

          <Text style={[
            styles.dateText,
            {
              color: textColor,
              opacity: 0.7,
              fontSize: typography.fontSize.xs,
            }
          ]}>
            {formatDate(event.fecha)}
          </Text>
        </View>

        {/* Right side - Running total and notes indicator */}
        <View style={styles.rightContent}>
          <View style={styles.runningTotalContainer}>
            <Text style={[
              styles.runningTotal,
              {
                fontSize: typography.fontSize.lg,
                fontWeight: typography.fontWeight.bold,
                // Ensure contrast on colored backgrounds
                color: isPayment ? colors.textWhite : textColor,
              }
            ]}>
              Deuda  {formatCurrency(Math.abs(event.runningTotal))}
            </Text>
            {event.runningTotal < 0 && (
              <Text style={[
                styles.favorLabel,
                {
                  fontSize: typography.fontSize.xs,
                  color: isPayment ? colors.textWhite : textColor,
                  marginTop: spacing.xs / 2,
                }
              ]}>A favor</Text>
            )}
          </View>

          <View style={styles.rightBottomActions}>
            {event.notas && event.notas.trim().length > 0 && (
              <TouchableOpacity
                style={[
                  styles.actionIconButton,
                  {
                    marginTop: spacing.sm,
                    padding: spacing.sm,
                    backgroundColor: 'rgba(255, 255, 255, 0.2)',
                    borderRadius: 6,
                  }
                ]}
                onPress={onViewNotes}
              >
                <FontAwesome
                  name="sticky-note"
                  size={14}
                  color={isPayment ? colors.textWhite : textColor}
                  style={{ opacity: 0.9 }}
                />
              </TouchableOpacity>
            )}

            {showActions && onEdit && (
              <TouchableOpacity
                style={[
                  styles.actionIconButton,
                  {
                    marginTop: spacing.xs,
                    padding: spacing.sm,
                    backgroundColor: 'rgba(255, 255, 255, 0.2)',
                    borderRadius: 6,
                  }
                ]}
                onPress={onEdit}
              >
                <FontAwesome
                  name="edit"
                  size={14}
                  color={isPayment ? colors.textWhite : textColor}
                  style={{ opacity: 0.9 }}
                />
              </TouchableOpacity>
            )}
          </View>
        </View>
      </View>

    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    borderRadius: 12,
    overflow: 'hidden',
  },
  gradientOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  cardContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    position: 'relative',
    zIndex: 1,
  },
  leftContent: {
    flex: 1,
  },
  rightContent: {
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    minHeight: 60,
  },
  rightBottomActions: {
    alignItems: 'flex-end',
  },
  productName: {
    // Styles will be applied inline using theme
  },
  paymentLabel: {
    // Styles will be applied inline using theme
  },
  transactionDetails: {
    // Styles will be applied inline using theme
  },
  totalAmount: {
    // Styles will be applied inline using theme
  },
  dateText: {
    // Styles will be applied inline using theme
  },
  runningTotalContainer: {
    alignItems: 'flex-end',
  },
  runningTotal: {
    textAlign: 'right',
  },
  favorLabel: {
    fontStyle: 'italic',
  },
  actionIconButton: {
    // Styles will be applied inline using theme - unified button style
  },
  actionButtons: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: 'rgba(255, 255, 255, 0.2)',
    position: 'relative',
    zIndex: 1,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 6,
    marginLeft: 8,
  },
  actionButtonText: {
    // Styles will be applied inline using theme
  },
  editButton: {
    // Additional styling for edit button if needed
  },
  deleteButton: {
    // Additional styling for delete button if needed
  },
});

export default TransactionCard;