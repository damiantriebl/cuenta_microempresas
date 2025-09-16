import React from 'react';
import { ColorPicker as RNColorPicker } from 'react-native-color-picker';
import { View, StyleSheet } from 'react-native';

export default function ColorPicker({
    color,
    onColorChangeComplete,
}: {
    color: string;
    onColorChangeComplete: (hex: string) => void;
}) {
    return (
        <View style={styles.container}>
            <RNColorPicker
                onColorSelected={(c) => onColorChangeComplete(c)}
                style={styles.nativePicker}
            />
        </View>
    );
}

const styles = StyleSheet.create({
    container: { alignItems: 'center', justifyContent: 'center' },
    nativePicker: { width: 300, height: 300 },
});


