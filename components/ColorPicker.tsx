import React, { useState } from 'react';
import { Platform, View, Modal, Button, StyleSheet, Text, TouchableOpacity } from 'react-native';
import { SketchPicker, ColorResult } from 'react-color'; // Para la web
export default function MultiplatformColorPicker({
    onColorChange,
}: {
    onColorChange: (color: string) => void;
}) {
    const [currentColor, setCurrentColor] = useState('#808080');
    const [colorPickerVisible, setColorPickerVisible] = useState(false);
    const handleColorChange = (color: string) => {
        setCurrentColor(color);
        onColorChange(color);
    };
    return (
        <View style={styles.container}>
            <TouchableOpacity
                style={[styles.colorPreview, { backgroundColor: currentColor }]}
                onPress={() => setColorPickerVisible(true)}
            >
                <Text style={styles.colorText}>Seleccionar Color</Text>
            </TouchableOpacity>
            {Platform.OS === 'web' ? (
                colorPickerVisible && (
                    <View style={styles.webPickerContainer}>
                        <SketchPicker
                            color={currentColor}
                            onChangeComplete={(color: ColorResult) => {
                                handleColorChange(color.hex);
                                setColorPickerVisible(false);
                            }}
                        />
                    </View>
                )
            ) : (
                <Modal visible={colorPickerVisible} transparent animationType="slide">
                    <View style={styles.modalContainer}>
                        <View style={styles.nativePicker}>
                            <Text style={styles.pickerTitle}>Seleccionar Color</Text>
                            <View style={styles.colorOptions}>
                                {['#FF5733', '#33FF57', '#3357FF', '#F1C40F', '#E74C3C', '#9B59B6', '#1ABC9C', '#34495E'].map((color) => (
                                    <TouchableOpacity
                                        key={color}
                                        style={[styles.colorOption, { backgroundColor: color }]}
                                        onPress={() => {
                                            handleColorChange(color);
                                            setColorPickerVisible(false);
                                        }}
                                    />
                                ))}
                            </View>
                            <Button title="Cerrar" onPress={() => setColorPickerVisible(false)} />
                        </View>
                    </View>
                </Modal>
            )}
        </View>
    );
}
const styles = StyleSheet.create({
    container: {
        margin: 10,
    },
    colorPreview: {
        padding: 10,
        borderRadius: 5,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 10,
    },
    colorText: {
        color: '#fff',
        fontWeight: 'bold',
    },
    webPickerContainer: {
        marginTop: 10,
    },
    modalContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: 'rgba(0,0,0,0.5)',
    },
    nativePicker: {
        backgroundColor: 'white',
        borderRadius: 10,
        padding: 20,
        margin: 20,
    },
    pickerTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        textAlign: 'center',
        marginBottom: 15,
    },
    colorOptions: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        justifyContent: 'center',
        marginBottom: 15,
    },
    colorOption: {
        width: 40,
        height: 40,
        borderRadius: 20,
        margin: 5,
        borderWidth: 2,
        borderColor: '#ddd',
    },
});
