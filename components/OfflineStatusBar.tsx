// @ts-ignore
import React, { useEffect, useState } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    Animated,
    ActivityIndicator,
    Modal,
    ScrollView,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useConnectionStatus } from '@/context/RealtimeDataProvider';
import OfflineDataManager from '@/services/OfflineDataManager';
import { useAuth } from '@/context/AuthProvider';

interface OfflineStatusBarProps {
    visible?: boolean;
}

interface OfflineStats {
    cacheSize: number;
    queueLength: number;
    failedItemsCount: number;
    lastSync: Record<string, number>;
    isOnline: boolean;
    syncInProgress: boolean;
    syncStats: {
        totalProcessed: number;
        totalFailed: number;
        lastSyncAttempt: number;
        lastSuccessfulSync: number;
        averageProcessingTime: number;
    };
    pendingByType: Record<string, number>;
}

export default function OfflineStatusBar({ visible = true }: OfflineStatusBarProps) {
    const { isConnected, lastSyncTime } = useConnectionStatus();
    const { empresaId } = useAuth();
    const insets = useSafeAreaInsets();
    const [syncQueueLength, setSyncQueueLength] = useState(0);
    const [isSyncing, setIsSyncing] = useState(false);
    const [slideAnim] = useState(new Animated.Value(-100));
    const [showDetails, setShowDetails] = useState(false);
    const [offlineStats, setOfflineStats] = useState<OfflineStats | null>(null);
    const [failedItemsCount, setFailedItemsCount] = useState(0);
    const [autoHideTimeout, setAutoHideTimeout] = useState<ReturnType<typeof setTimeout> | null>(null);

    const offlineManager = OfflineDataManager.getInstance();

    useEffect(() => {
        const updateSyncInfo = async () => {
            setSyncQueueLength(offlineManager.getSyncQueueLength());
            setIsSyncing(offlineManager.isSyncInProgress());

            if (empresaId) {
                try {
                    const stats = await offlineManager.getOfflineStats(empresaId);
                    setOfflineStats(stats);
                    setFailedItemsCount(stats.failedItemsCount);
                } catch (error) {
                    console.error('Error getting offline stats:', error);
                }
            }
        };

        updateSyncInfo();
        const interval = setInterval(updateSyncInfo, 2000);

        return () => clearInterval(interval);
    }, [empresaId]);

    useEffect(() => {
        return () => {
            if (autoHideTimeout) {
                clearTimeout(autoHideTimeout);
            }
        };
    }, [autoHideTimeout]);

    useEffect(() => {
        if (autoHideTimeout) {
            clearTimeout(autoHideTimeout);
        }

        const hasIssues = syncQueueLength > 0 || isSyncing || failedItemsCount > 0 || !isConnected;
        const shouldShow = visible && (hasIssues || isConnected);

        if (shouldShow) {
            Animated.timing(slideAnim, {
                toValue: 0,
                duration: 300,
                useNativeDriver: true,
            }).start();

            if (isConnected && !hasIssues) {
                const timeout = setTimeout(() => {
                    Animated.timing(slideAnim, {
                        toValue: -100,
                        duration: 300,
                        useNativeDriver: true,
                    }).start();
                }, 3000);
                setAutoHideTimeout(timeout);
            }
        } else {
            Animated.timing(slideAnim, {
                toValue: -100,
                duration: 300,
                useNativeDriver: true,
            }).start();
        }
    }, [isConnected, syncQueueLength, isSyncing, visible, slideAnim, failedItemsCount]);

    const handleRetrySync = async () => {
        if (isConnected) {
            try {
                const result = await offlineManager.processSyncQueue();
                console.log('Manual sync completed:', result);
            } catch (error) {
                console.error('Manual sync failed:', error);
            }
        }
    };

    const handleRetryFailedItems = async () => {
        if (!offlineStats) return;

        try {
            const failedItems = await offlineManager.getFailedItems();
            for (const item of failedItems) {
                await offlineManager.retryFailedItem(item.id);
            }
        } catch (error) {
            console.error('Error retrying failed items:', error);
        }
    };

    const getStatusText = () => {
        if (!isConnected) {
            return 'Sin conexión - Trabajando offline';
        }

        if (isSyncing) {
            return 'Sincronizando datos...';
        }

        if (failedItemsCount > 0) {
            return `${failedItemsCount} elemento${failedItemsCount > 1 ? 's' : ''} fallido${failedItemsCount > 1 ? 's' : ''}`;
        }

        if (syncQueueLength > 0) {
            return `${syncQueueLength} cambio${syncQueueLength > 1 ? 's' : ''} pendiente${syncQueueLength > 1 ? 's' : ''}`;
        }

        return 'Datos sincronizados';
    };

    const getStatusColor = () => {
        if (!isConnected) return '#dc3545';
        if (failedItemsCount > 0) return '#dc3545';
        if (isSyncing) return '#ffc107';
        if (syncQueueLength > 0) return '#fd7e14';
        return '#28a745';
    };

    const getStatusIcon = () => {
        if (!isConnected) return 'cloud-offline-outline';
        if (failedItemsCount > 0) return 'warning-outline';
        if (isSyncing) return 'sync-outline';
        if (syncQueueLength > 0) return 'cloud-upload-outline';
        return 'cloud-done-outline';
    };

    const formatLastSync = () => {
        if (!lastSyncTime) return 'Nunca';

        const now = new Date();
        const diff = now.getTime() - lastSyncTime.getTime();
        const minutes = Math.floor(diff / 60000);

        if (minutes < 1) return 'Hace un momento';
        if (minutes < 60) return `Hace ${minutes} min`;

        const hours = Math.floor(minutes / 60);
        if (hours < 24) return `Hace ${hours}h`;

        return lastSyncTime.toLocaleDateString();
    };

    const renderStatusBar = () => (
        <Animated.View
            style={[
                styles.container,
                {
                    backgroundColor: getStatusColor(),
                    paddingTop: insets.top + 4,
                    transform: [{ translateY: slideAnim }]
                }
            ]}
        >
            <TouchableOpacity
                style={styles.content}
                onPress={() => {
                    if (autoHideTimeout) {
                        clearTimeout(autoHideTimeout);
                        setAutoHideTimeout(null);
                    }
                    setShowDetails(true);
                }}
                activeOpacity={0.8}
            >
                <View style={styles.leftSection}>
                    {isSyncing ? (
                        <ActivityIndicator size="small" color="#fff" />
                    ) : (
                        <Ionicons name={getStatusIcon()} size={16} color="#fff" />
                    )}
                    <Text style={styles.statusText}>{getStatusText()}</Text>
                </View>

                <View style={styles.rightSection}>
                    {lastSyncTime && (
                        <Text style={styles.lastSyncText}>
                            Última sync: {formatLastSync()}
                        </Text>
                    )}

                    {(syncQueueLength > 0 || failedItemsCount > 0) && (
                        <TouchableOpacity
                            style={styles.retryButton}
                            onPress={handleRetrySync}
                            disabled={!isConnected || isSyncing}
                        >
                            <Ionicons name="refresh" size={14} color="#fff" />
                        </TouchableOpacity>
                    )}

                    <Ionicons name="chevron-forward" size={14} color="#fff" style={{ opacity: 0.7 }} />
                </View>
            </TouchableOpacity>
        </Animated.View>
    );

    const renderModal = () => (
        <Modal
            visible={showDetails}
            animationType="slide"
            presentationStyle="pageSheet"
            onRequestClose={() => setShowDetails(false)}
        >
            <View style={styles.modalContainer}>
                <View style={styles.modalHeader}>
                    <Text style={styles.modalTitle}>Estado de Sincronización</Text>
                    <TouchableOpacity
                        onPress={() => setShowDetails(false)}
                        style={styles.closeButton}
                    >
                        <Ionicons name="close" size={24} color="#333" />
                    </TouchableOpacity>
                </View>

                <ScrollView style={styles.modalContent}>
                    {offlineStats && (
                        <>
                            {/* Connection Status */}
                            <View style={styles.section}>
                                <Text style={styles.sectionTitle}>Estado de Conexión</Text>
                                <View style={styles.statusRow}>
                                    <Ionicons
                                        name={isConnected ? "cloud-done-outline" : "cloud-offline-outline"}
                                        size={20}
                                        color={isConnected ? "#28a745" : "#dc3545"}
                                    />
                                    <Text style={styles.statusLabel}>
                                        {isConnected ? "Conectado" : "Sin conexión"}
                                    </Text>
                                </View>
                            </View>

                            {/* Sync Queue Status */}
                            <View style={styles.section}>
                                <Text style={styles.sectionTitle}>Cola de Sincronización</Text>
                                <View style={styles.statsGrid}>
                                    <View style={styles.statItem}>
                                        <Text style={styles.statValue}>{syncQueueLength}</Text>
                                        <Text style={styles.statLabel}>Pendientes</Text>
                                    </View>
                                    <View style={styles.statItem}>
                                        <Text style={[styles.statValue, { color: '#dc3545' }]}>{failedItemsCount}</Text>
                                        <Text style={styles.statLabel}>Fallidos</Text>
                                    </View>
                                    <View style={styles.statItem}>
                                        <Text style={[styles.statValue, { color: '#28a745' }]}>{offlineStats.syncStats.totalProcessed}</Text>
                                        <Text style={styles.statLabel}>Procesados</Text>
                                    </View>
                                </View>
                            </View>

                            {/* Pending Items by Type */}
                            {Object.keys(offlineStats.pendingByType).length > 0 && (
                                <View style={styles.section}>
                                    <Text style={styles.sectionTitle}>Elementos Pendientes por Tipo</Text>
                                    {Object.keys(offlineStats.pendingByType).map((type, index) =>
                                        React.createElement(View, {
                                            key: `${type}-${index}`,
                                            style: styles.typeRow
                                        }, [
                                            React.createElement(Text, {
                                                key: 'label',
                                                style: styles.typeLabel
                                            }, type.replace('_', ' ')),
                                            React.createElement(Text, {
                                                key: 'count',
                                                style: styles.typeCount
                                            }, offlineStats.pendingByType[type])
                                        ])
                                    )}
                                </View>
                            )}

                            {/* Cache Information */}
                            <View style={styles.section}>
                                <Text style={styles.sectionTitle}>Información de Caché</Text>
                                <View style={styles.infoRow}>
                                    <Text style={styles.infoLabel}>Tamaño del caché:</Text>
                                    <Text style={styles.infoValue}>
                                        {(offlineStats.cacheSize / 1024).toFixed(1)} KB
                                    </Text>
                                </View>
                            </View>

                            {/* Action Buttons */}
                            <View style={styles.actionSection}>
                                {syncQueueLength > 0 && (
                                    <TouchableOpacity
                                        style={[styles.actionButton, { backgroundColor: '#007bff' }]}
                                        onPress={handleRetrySync}
                                        disabled={!isConnected || isSyncing}
                                    >
                                        <Ionicons name="refresh" size={20} color="#fff" />
                                        <Text style={styles.actionButtonText}>
                                            {isSyncing ? 'Sincronizando...' : 'Sincronizar Ahora'}
                                        </Text>
                                    </TouchableOpacity>
                                )}

                                {failedItemsCount > 0 && (
                                    <TouchableOpacity
                                        style={[styles.actionButton, { backgroundColor: '#dc3545' }]}
                                        onPress={handleRetryFailedItems}
                                        disabled={!isConnected}
                                    >
                                        <Ionicons name="warning" size={20} color="#fff" />
                                        <Text style={styles.actionButtonText}>Reintentar Fallidos</Text>
                                    </TouchableOpacity>
                                )}
                            </View>
                        </>
                    )}
                </ScrollView>
            </View>
        </Modal>
    );

    return (
        <>
            {renderStatusBar()}
            {renderModal()}
        </>
    );
}

const styles = StyleSheet.create({
    container: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        zIndex: 1000,
        paddingBottom: 4,
        paddingHorizontal: 12,
    },
    content: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
    },
    leftSection: {
        flexDirection: 'row',
        alignItems: 'center',
        flex: 1,
    },
    rightSection: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    statusText: {
        color: '#fff',
        fontSize: 12,
        fontWeight: '600',
        marginLeft: 6,
    },
    lastSyncText: {
        color: '#fff',
        fontSize: 12,
        opacity: 0.9,
    },
    retryButton: {
        backgroundColor: 'rgba(255, 255, 255, 0.2)',
        borderRadius: 12,
        padding: 4,
    },
    modalContainer: {
        flex: 1,
        backgroundColor: '#f8f9fa',
    },
    modalHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: 16,
        backgroundColor: '#fff',
        borderBottomWidth: 1,
        borderBottomColor: '#e9ecef',
    },
    modalTitle: {
        fontSize: 18,
        fontWeight: '600',
        color: '#333',
    },
    closeButton: {
        padding: 4,
    },
    modalContent: {
        flex: 1,
        padding: 16,
    },
    section: {
        backgroundColor: '#fff',
        borderRadius: 8,
        padding: 16,
        marginBottom: 16,
    },
    sectionTitle: {
        fontSize: 16,
        fontWeight: '600',
        color: '#333',
        marginBottom: 12,
    },
    statusRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    statusLabel: {
        fontSize: 14,
        color: '#666',
    },
    statsGrid: {
        flexDirection: 'row',
        justifyContent: 'space-around',
    },
    statItem: {
        alignItems: 'center',
    },
    statValue: {
        fontSize: 24,
        fontWeight: 'bold',
        color: '#007bff',
    },
    statLabel: {
        fontSize: 12,
        color: '#666',
        marginTop: 4,
    },
    typeRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingVertical: 8,
        borderBottomWidth: 1,
        borderBottomColor: '#f1f3f4',
    },
    typeLabel: {
        fontSize: 14,
        color: '#333',
        textTransform: 'capitalize',
    },
    typeCount: {
        fontSize: 14,
        fontWeight: '600',
        color: '#007bff',
    },
    infoRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingVertical: 4,
    },
    infoLabel: {
        fontSize: 14,
        color: '#666',
    },
    infoValue: {
        fontSize: 14,
        fontWeight: '500',
        color: '#333',
    },
    actionSection: {
        gap: 12,
        marginTop: 8,
    },
    actionButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 12,
        borderRadius: 8,
        gap: 8,
    },
    actionButtonText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: '600',
    },
});
