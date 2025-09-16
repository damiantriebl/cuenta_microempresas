import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Modal } from 'react-native';
import DatePicker from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';
export default function DatePickerModule({
    value,
    onChange,
}: {
    value: Date;
    onChange: (date: Date) => void;
}) {
    const [date, setDate] = useState<Date | null>(value ?? new Date());
    const [showPicker, setShowPicker] = useState(false);
    const handleDateChange = (selectedDate: Date | null) => {
        if (selectedDate) {
            setDate(selectedDate);
            onChange(selectedDate);
        }
        setShowPicker(false);
    };
    return (
        <View style={styles.container}>
            <Text style={styles.label}>Fecha seleccionada:</Text>
            <TouchableOpacity style={styles.datePickerButton} onPress={() => setShowPicker(true)}>
                <Text style={styles.datePickerText}>{date?.toLocaleString()}</Text>
            </TouchableOpacity>
            {showPicker && (
                <Modal visible transparent animationType="slide" onRequestClose={() => setShowPicker(false)}>
                    <View style={styles.webModalOverlay}>
                        <View style={styles.webPickerContainer}>
                            <Text style={styles.modalTitle}>Seleccionar Fecha y Hora</Text>
                            <DatePicker
                                selected={date}
                                onChange={(d: Date | null) => handleDateChange(d)}
                                showTimeSelect
                                dateFormat="Pp"
                                inline
                            />
                            <TouchableOpacity style={styles.closeButton} onPress={() => setShowPicker(false)}>
                                <Text style={styles.closeButtonText}>Cerrar</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </Modal>
            )}
        </View>
    );
}
const styles = StyleSheet.create({
    container: { padding: 10 },
    label: { fontSize: 16, fontWeight: 'bold', marginBottom: 10 },
    datePickerButton: {
        borderWidth: 1,
        borderColor: '#ddd',
        borderRadius: 8,
        padding: 10,
        marginBottom: 10,
        backgroundColor: '#f0f0f0',
    },
    datePickerText: { fontSize: 16, color: '#333' },
    webModalOverlay: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
    },
    webPickerContainer: {
        backgroundColor: '#fff',
        padding: 20,
        borderRadius: 10,
        alignItems: 'center',
    },
    modalTitle: { fontSize: 18, fontWeight: 'bold', marginBottom: 10 },
    closeButton: {
        marginTop: 20,
        backgroundColor: '#007BFF',
        paddingVertical: 10,
        paddingHorizontal: 20,
        borderRadius: 5,
    },
    closeButtonText: { color: '#fff', fontWeight: 'bold', fontSize: 16 },
});
