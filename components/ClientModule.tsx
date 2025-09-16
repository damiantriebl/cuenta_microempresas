import React, { useEffect, useState } from 'react';
import { StyleSheet, View, TouchableOpacity, Text, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { ThemedText } from '@/components/ThemedText';
import { router } from 'expo-router';
import { Timestamp } from 'firebase/firestore';
import { timestampToDate } from '@/hooks/timestampToDate';
import { useClientSelection } from '@/context/ClientSelectionProvider';
import { Client } from '@/schemas/types';
import { useTheme } from '@/context/ThemeProvider';
import { ThemedCard } from '@/components/ui';
import { SimpleDebtService } from '@/services/SimpleDebtService';
import { useAuth } from '@/context/AuthProvider';

interface ClientModuleProps {
    client: Client;
    onToggleVisibility?: (clientId: string) => void;
    onEdit?: (client: Client) => void;
    showActions?: boolean;
}

const ClientModule = ({
    client,
    onToggleVisibility,
    onEdit,
    showActions = false
}: ClientModuleProps) => {
    const { selectClient, selectedClient } = useClientSelection();
    const { colors, spacing, typography, shadows } = useTheme();
    const { empresaId } = useAuth();
    const [simpleDebt, setSimpleDebt] = useState<number>(0);

    const isSelected = selectedClient?.id === client.id;

    // Load simple debt from AsyncStorage
    useEffect(() => {
        const loadSimpleDebt = async () => {
            if (empresaId) {
                const debt = await SimpleDebtService.getInstance().getClientDebt(empresaId, client.id);
                setSimpleDebt(debt);
            }
        };
        loadSimpleDebt();

        // Set up interval to refresh debt periodically (every 2 seconds)
        const interval = setInterval(loadSimpleDebt, 2000);

        return () => clearInterval(interval);
    }, [empresaId, client.id]);

    const handlePress = () => {
        // Select the client in the global context
        selectClient(client);

        // Navigate to the history tab
        router.push('/(tabs)/history');
    };

    const handleToggleVisibility = (e: any) => {
        e.stopPropagation();
        if (onToggleVisibility) {
            const action = client.oculto ? 'mostrar' : 'ocultar';
            Alert.alert(
                `${action.charAt(0).toUpperCase() + action.slice(1)} Cliente`,
                `¿Está seguro que desea ${action} a ${client.nombre}?`,
                [
                    { text: 'Cancelar', style: 'cancel' },
                    {
                        text: action.charAt(0).toUpperCase() + action.slice(1),
                        onPress: () => onToggleVisibility(client.id)
                    }
                ]
            );
        }
    };

    const handleEdit = (e: any) => {
        e.stopPropagation();
        if (onEdit) {
            onEdit(client);
        }
    };

    const formatDebt = (debt: number) => {
        // Handle NaN, undefined, or null values
        if (debt == null || isNaN(debt)) {
            return 'Sin deuda';
        }

        if (debt === 0) return 'Sin deuda';
        if (debt > 0) return `Debe $${debt.toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
        return `A favor $${Math.abs(debt).toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    };

    const getDebtColor = (debt: number) => {
        // Handle NaN, undefined, or null values - treat as no debt
        if (debt == null || isNaN(debt) || debt === 0) {
            return colors.success; // Green for no debt
        }
        if (debt > 0) return colors.error; // Red for debt
        return colors.info; // Blue for credit
    };

    const formatLastTransaction = (timestamp?: Timestamp) => {
        if (!timestamp) return 'Sin transacciones';
        const date = timestampToDate(timestamp);
        const now = new Date();
        const diffTime = Math.abs(now.getTime() - date.getTime());
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

        if (diffDays === 1) return 'Hace 1 día';
        if (diffDays < 7) return `Hace ${diffDays} días`;
        if (diffDays < 30) return `Hace ${Math.ceil(diffDays / 7)} semanas`;
        return date.toLocaleDateString();
    };

    return (
        <TouchableOpacity
            style={[
                styles.card,
                {
                    backgroundColor: client.oculto ? colors.surfaceLight : colors.cardBackground,
                    marginVertical: spacing.xs,
                    marginHorizontal: spacing.xs / 2,
                    borderRadius: 12,
                    padding: spacing.md,
                    borderLeftWidth: isSelected ? 6 : 4,
                    borderLeftColor: client.oculto ? colors.textSecondary : colors.primaryAccent,
                    opacity: client.oculto ? 0.7 : 1,
                    ...shadows.medium,
                },
                isSelected && {
                    backgroundColor: '#f0fcfd',
                    ...shadows.large,
                }
            ]}
            onPress={handlePress}
        >
            <View style={[styles.cardHeader, { marginBottom: spacing.xs }]}>
                <View style={styles.clientInfo}>
                    <ThemedText type="title" style={[
                        styles.clientName,
                        {
                            fontSize: typography.fontSize.lg,
                            fontWeight: typography.fontWeight.bold,
                            color: isSelected ? colors.primaryAccent : colors.textPrimary,
                            marginBottom: spacing.xs,
                        }
                    ]}>
                        {client.nombre}
                        {client.oculto && (
                            <Ionicons name="eye-off" size={16} color={colors.textSecondary} style={{ marginLeft: spacing.xs }} />
                        )}
                        {isSelected && (
                            <Ionicons name="checkmark-circle" size={16} color={colors.primaryAccent} style={{ marginLeft: spacing.xs }} />
                        )}
                    </ThemedText>
                    <Text style={[
                        styles.debtText,
                        {
                            color: getDebtColor(simpleDebt),
                            fontSize: typography.fontSize.md,
                            fontWeight: typography.fontWeight.semibold,
                        }
                    ]}>
                        {formatDebt(simpleDebt)}
                    </Text>
                </View>

                {showActions && (
                    <View style={[styles.actionButtons, { gap: spacing.xs }]}>
                        <TouchableOpacity
                            style={[
                                styles.actionButton,
                                {
                                    padding: spacing.xs,
                                    borderRadius: 6,
                                    backgroundColor: colors.surfaceLight,
                                }
                            ]}
                            onPress={handleEdit}
                        >
                            <Ionicons name="pencil" size={18} color={colors.primaryAccent} />
                        </TouchableOpacity>
                        <TouchableOpacity
                            style={[
                                styles.actionButton,
                                {
                                    padding: spacing.xs,
                                    borderRadius: 6,
                                    backgroundColor: colors.surfaceLight,
                                }
                            ]}
                            onPress={handleToggleVisibility}
                        >
                            <Ionicons
                                name={client.oculto ? "eye" : "eye-off"}
                                size={18}
                                color={client.oculto ? colors.success : colors.textSecondary}
                            />
                        </TouchableOpacity>
                    </View>
                )}
            </View>

            <ThemedText type="subtitle" style={[
                styles.address,
                {
                    fontSize: typography.fontSize.sm,
                    color: colors.textSecondary,
                    marginBottom: spacing.xs,
                    lineHeight: typography.lineHeight.normal * typography.fontSize.sm,
                }
            ]}>
                {client.direccion}
            </ThemedText>

            <View style={styles.cardFooter}>
                <Text style={[
                    styles.lastTransaction,
                    {
                        fontSize: typography.fontSize.xs,
                        color: colors.textLight,
                        fontStyle: 'italic',
                    }
                ]}>
                    {formatLastTransaction(client.ultimaTransaccion)}
                </Text>
                {client.telefono && (
                    <TouchableOpacity
                        style={[styles.whatsappButton, { padding: spacing.xs }]}
                        onPress={(e) => {
                            e.stopPropagation();
                            // TODO: Implement WhatsApp integration
                        }}
                    >
                        <Ionicons name="logo-whatsapp" size={16} color="#25D366" />
                    </TouchableOpacity>
                )}
            </View>
        </TouchableOpacity>
    );
};

const styles = StyleSheet.create({
    card: {
        // All styles applied inline using theme
    },
    cardHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
    },
    clientInfo: {
        flex: 1,
    },
    clientName: {
        // Styles applied inline using theme
    },
    debtText: {
        // Styles applied inline using theme
    },
    actionButtons: {
        flexDirection: 'row',
    },
    actionButton: {
        // Styles applied inline using theme
    },
    address: {
        // Styles applied inline using theme
    },
    cardFooter: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    lastTransaction: {
        // Styles applied inline using theme
    },
    whatsappButton: {
        // Styles applied inline using theme
    },
});

export default ClientModule;
