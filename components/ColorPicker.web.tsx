import React from 'react';
import { SketchPicker } from 'react-color';

export default function ColorPicker({
    color,
    onColorChangeComplete,
}: {
    color: string;
    onColorChangeComplete: (hex: string) => void;
}) {
    return (
        <SketchPicker
            color={color}
            onChangeComplete={(c) => onColorChangeComplete(c.hex)}
        />
    );
}


