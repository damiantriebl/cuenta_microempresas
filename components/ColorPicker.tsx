import React, { useState } from 'react';
import { Platform, View, Modal, Button, StyleSheet, Text, TouchableOpacity } from 'react-native';
import { SketchPicker } from 'react-color'; // Para la web
import { ColorPicker } from 'react-native-color-picker'; // Para móviles

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
            {/* Botón para abrir el selector de color */}
            <TouchableOpacity
                style={[styles.colorPreview, { backgroundColor: currentColor }]}
                onPress={() => setColorPickerVisible(true)}
            >
                <Text style={styles.colorText}>Seleccionar Color</Text>
            </TouchableOpacity>

            {Platform.OS === 'web' ? (
                // Para web, usamos react-color
                colorPickerVisible && (
                    <View style={styles.webPickerContainer}>
                        <SketchPicker
                            color={currentColor}
                            onChangeComplete={(color) => {
                                handleColorChange(color.hex);
                                setColorPickerVisible(false);
                            }}
                        />
                    </View>
                )
            ) : (
                // Para móviles (Android/iOS), usamos react-native-color-picker
                <Modal visible={colorPickerVisible} transparent animationType="slide">
                    <View style={styles.modalContainer}>
                        <ColorPicker
                            onColorSelected={(color) => {
                                handleColorChange(color);
                                setColorPickerVisible(false);
                            }}
                            style={styles.nativePicker}
                        />
                        <Button title="Cerrar" onPress={() => setColorPickerVisible(false)} />
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
        width: 300,
        height: 300,
    },
});
