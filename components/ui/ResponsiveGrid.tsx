import React from 'react';
import { View, StyleSheet, ViewStyle, Dimensions } from 'react-native';
import { useTheme } from '@/context/ThemeProvider';

const { width: screenWidth } = Dimensions.get('window');

interface ResponsiveGridProps {
  children: React.ReactNode;
  columns?: number;
  spacing?: number;
  style?: ViewStyle;
  minItemWidth?: number;
}

export function ResponsiveGrid({
  children,
  columns,
  spacing,
  style,
  minItemWidth = 150,
}: ResponsiveGridProps) {
  const { spacing: themeSpacing } = useTheme();
  const gridSpacing = spacing ?? themeSpacing.md;

  // Calculate optimal number of columns if not specified
  const calculateColumns = (): number => {
    if (columns) return columns;
    
    const availableWidth = screenWidth - (gridSpacing * 2); // Account for container padding
    const itemWidthWithSpacing = minItemWidth + gridSpacing;
    const calculatedColumns = Math.floor(availableWidth / itemWidthWithSpacing);
    
    return Math.max(1, calculatedColumns);
  };

  const numColumns = calculateColumns();
  const itemWidth = (screenWidth - (gridSpacing * (numColumns + 1))) / numColumns;

  const renderChildren = () => {
    const childrenArray = React.Children.toArray(children);
    const rows: React.ReactNode[][] = [];

    for (let i = 0; i < childrenArray.length; i += numColumns) {
      rows.push(childrenArray.slice(i, i + numColumns));
    }

    return rows.map((row, rowIndex) => (
      <View key={rowIndex} style={[styles.row, { marginBottom: gridSpacing }]}>
        {row.map((child, colIndex) => (
          <View
            key={colIndex}
            style={[
              styles.item,
              {
                width: itemWidth,
                marginRight: colIndex < row.length - 1 ? gridSpacing : 0,
              },
            ]}
          >
            {child}
          </View>
        ))}
        {/* Fill empty spaces in the last row */}
        {row.length < numColumns &&
          Array.from({ length: numColumns - row.length }).map((_, index) => (
            <View
              key={`empty-${index}`}
              style={[
                styles.item,
                {
                  width: itemWidth,
                  marginRight: index < numColumns - row.length - 1 ? gridSpacing : 0,
                },
              ]}
            />
          ))}
      </View>
    ));
  };

  return (
    <View style={[styles.container, { padding: gridSpacing }, style]}>
      {renderChildren()}
    </View>
  );
}

interface FlexGridProps {
  children: React.ReactNode;
  spacing?: number;
  style?: ViewStyle;
}

export function FlexGrid({ children, spacing, style }: FlexGridProps) {
  const { spacing: themeSpacing } = useTheme();
  const gridSpacing = spacing ?? themeSpacing.md;

  return (
    <View style={[styles.flexContainer, { padding: gridSpacing }, style]}>
      {React.Children.map(children, (child, index) => (
        <View style={[styles.flexItem, { marginBottom: gridSpacing }]}>
          {child}
        </View>
      ))}
    </View>
  );
}

interface StackProps {
  children: React.ReactNode;
  direction?: 'vertical' | 'horizontal';
  spacing?: number;
  align?: 'start' | 'center' | 'end' | 'stretch';
  justify?: 'start' | 'center' | 'end' | 'space-between' | 'space-around';
  style?: ViewStyle;
}

export function Stack({
  children,
  direction = 'vertical',
  spacing,
  align = 'stretch',
  justify = 'start',
  style,
}: StackProps) {
  const { spacing: themeSpacing } = useTheme();
  const stackSpacing = spacing ?? themeSpacing.md;

  const alignItems = {
    start: 'flex-start',
    center: 'center',
    end: 'flex-end',
    stretch: 'stretch',
  } as const;

  const justifyContent = {
    start: 'flex-start',
    center: 'center',
    end: 'flex-end',
    'space-between': 'space-between',
    'space-around': 'space-around',
  } as const;

  const containerStyle: ViewStyle = {
    flexDirection: direction === 'horizontal' ? 'row' : 'column',
    alignItems: alignItems[align],
    justifyContent: justifyContent[justify],
  };

  return (
    <View style={[containerStyle, style]}>
      {React.Children.map(children, (child, index) => {
        const isLast = index === React.Children.count(children) - 1;
        const spacingStyle: ViewStyle = isLast
          ? {}
          : direction === 'horizontal'
          ? { marginRight: stackSpacing }
          : { marginBottom: stackSpacing };

        return (
          <View style={spacingStyle}>
            {child}
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  row: {
    flexDirection: 'row',
  },
  item: {
    // Individual items will have their width set dynamically
  },
  flexContainer: {
    flex: 1,
  },
  flexItem: {
    flex: 1,
  },
});