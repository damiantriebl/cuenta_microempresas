import React, { useState } from 'react';
import { StyleSheet, View, TouchableOpacity, Modal } from 'react-native';
import { ThemedText } from '@/components/ThemedText';
import { Ionicons } from '@expo/vector-icons';
import { EventoTy } from '@/schemas/eventoTy';
import { formatDateToSpanish } from '@/hooks/timestampToDate';

type EventModuleProps = EventoTy & {
    acumulado: number;
    handleEditEvento: () => void;
};

const EventModule = ({ handleEditEvento, ...eventos }: EventModuleProps) => {
    const [modalVisible, setModalVisible] = useState(false);

    const handleToggleModal = () => {
        setModalVisible(!modalVisible);
    };

    return (
        <View style={[
            styles.card,
            eventos.tipo === 'bajar'
                ? { ...styles.bajar, backgroundColor: eventos.productoColor || '#899cfc' }
                : styles.cobrar,
        ]}>
            <TouchableOpacity onPress={handleEditEvento} style={styles.editIconContainer}>
                <Ionicons name="create-outline" size={24} color={'black'} />
            </TouchableOpacity>

            <View style={styles.column}>
                {eventos.tipo === 'bajar' ? (
                    <View style={styles.column}>
                        <View style={styles.flex}>
                            <ThemedText type="title">{eventos.producto}</ThemedText>
                            <ThemedText type="title">{eventos.acumulado}</ThemedText>
                        </View>
                        <View style={styles.flex}>
                            <ThemedText type="subtitle">Cantidad: {eventos.cantidad}</ThemedText>
                            <ThemedText type="subtitle">Precio Un.: {eventos.precioUnitario}</ThemedText>
                        </View>
                    </View>
                ) : (
                    <View style={styles.flex}>
                        <ThemedText type="title">Entregado: ${eventos.monto}</ThemedText>
                        <ThemedText type="title">{eventos.acumulado}</ThemedText>
                    </View>
                )}
                {eventos.actualizado && (
                    <ThemedText type="subtitle">{formatDateToSpanish(eventos.actualizado)}</ThemedText>
                )}
            </View>

            <TouchableOpacity onPress={handleToggleModal} style={styles.infoIconContainer}>
                <Ionicons
                    name="information-circle-outline"
                    size={24}
                    color={!!eventos.notas ? 'black' : 'grey'}
                />
            </TouchableOpacity>

            <Modal
                animationType="slide"
                transparent={true}
                visible={modalVisible}
                onRequestClose={handleToggleModal}
            >
                <View style={styles.modalBackground}>
                    <View style={styles.modalContent}>
                        <ThemedText type="subtitle">Notas del evento:</ThemedText>
                        <ThemedText type="default">{eventos.notas}</ThemedText>
                        <TouchableOpacity onPress={handleToggleModal} style={styles.closeButton}>
                            <Ionicons name="close-circle-outline" size={30} color="black" />
                        </TouchableOpacity>
                    </View>
                </View>
            </Modal>
        </View>
    );
};

const styles = StyleSheet.create({
    column: {
        flexDirection: 'column',
        width: '100%',
        gap: 10,
    },
    card: {
        marginTop: 5,
        borderRadius: 5,
        elevation: 4,
        padding: 20,
        width: '100%',
        position: 'relative',
    },
    cobrar: {
        backgroundColor: '#82ffa3',
        height: 100,
    },
    bajar: {
        backgroundColor: '#899cfc',
        height: 150,
    },
    flex: {
        width: '100%',
        flexDirection: 'row',
        justifyContent: 'space-between',
    },
    editIconContainer: {
        position: 'absolute',
        bottom: 10,
        right: 60,
    },
    infoIconContainer: {
        position: 'absolute',
        bottom: 10,
        right: 10,
    },
    modalBackground: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: 'rgba(0,0,0,0.5)',
    },
    modalContent: {
        width: '80%',
        backgroundColor: 'white',
        padding: 20,
        borderRadius: 10,
        alignItems: 'center',
    },
    closeButton: {
        marginTop: 20,
    },
});

export default EventModule;
