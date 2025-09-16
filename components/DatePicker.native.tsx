import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';

export default function DatePickerModule({
    value,
    onChange,
}: {
    value: Date;
    onChange: (date: Date) => void;
}) {
    const [date, setDate] = useState<Date>(() => {
        // Ensure we always have a valid Date object
        if (value instanceof Date && !isNaN(value.getTime())) {
            return value;
        }
        return new Date();
    });
    const [showPicker, setShowPicker] = useState(false);

    const handleDateChange = (event: any, selectedDate?: Date) => {
        try {
            // Always hide picker first to prevent dismiss errors
            setShowPicker(false);

            // Check if the event is valid and not a dismissal
            if (event && event.type && event.type !== 'dismissed' && selectedDate) {
                setDate(selectedDate);
                onChange(selectedDate);
            } else if (event && !event.type && selectedDate) {
                // Handle case where event.type might be undefined but we have a valid date
                setDate(selectedDate);
                onChange(selectedDate);
            }
        } catch (error) {
            console.warn('DatePicker handleDateChange error:', error);
            // Ensure picker is hidden even if there's an error
            setShowPicker(false);
        }
    };

    return (
        <View style={styles.container}>
            <Text style={styles.label}>Fecha seleccionada:</Text>
            <TouchableOpacity style={styles.datePickerButton} onPress={() => setShowPicker(true)}>
                <Text style={styles.datePickerText}>{date.toLocaleString()}</Text>
            </TouchableOpacity>
            {showPicker && (
                <DateTimePicker
                    value={date}
                    mode="datetime"
                    display="default"
                    onChange={handleDateChange}
                    onTouchCancel={() => setShowPicker(false)}
                />
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
});


