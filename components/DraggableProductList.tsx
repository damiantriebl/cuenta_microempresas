import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Alert,
  FlatList,
  PanResponder,
  Animated,
  Dimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Product } from '@/schemas/types';

const { height: screenHeight } = Dimensions.get('window');

interface DraggableProductListProps {
  products: Product[];
  onEdit: (product: Product) => void;
  onDelete: (product: Product) => void;
  onReorder: (fromIndex: number, toIndex: number) => void;
  isLoading?: boolean;
}

interface ProductItemProps {
  product: Product;
  index: number;
  onEdit: (product: Product) => void;
  onDelete: (product: Product) => void;
  onMoveUp: () => void;
  onMoveDown: () => void;
  onDragStart?: (index: number) => void;
  onDragEnd?: (fromIndex: number, toIndex: number) => void;
  canMoveUp: boolean;
  canMoveDown: boolean;
  isLoading?: boolean;
  isDragging?: boolean;
}

function ProductItem({
  product,
  index,
  onEdit,
  onDelete,
  onMoveUp,
  onMoveDown,
  onDragStart,
  onDragEnd,
  canMoveUp,
  canMoveDown,
  isLoading = false,
  isDragging = false,
}: ProductItemProps) {
  const [dragPosition] = useState(new Animated.ValueXY());
  const [isDraggingState, setIsDraggingState] = useState(false);

  const panResponder = PanResponder.create({
    onMoveShouldSetPanResponder: (evt, gestureState) => {
      // Only start drag if moving vertically more than horizontally and with sufficient movement
      const isVerticalMovement = Math.abs(gestureState.dy) > Math.abs(gestureState.dx);
      const hasMinimumMovement = Math.abs(gestureState.dy) > 15;
      return isVerticalMovement && hasMinimumMovement;
    },
    onPanResponderGrant: () => {
      setIsDraggingState(true);
      onDragStart?.(index);
      dragPosition.setOffset({
        x: dragPosition.x._value,
        y: dragPosition.y._value,
      });
    },
    onPanResponderMove: (evt, gestureState) => {
      // Manual update to only allow vertical movement
      dragPosition.x.setValue(0); // Lock horizontal movement
      dragPosition.y.setValue(gestureState.dy); // Allow vertical movement
    },
    onPanResponderRelease: (evt, gestureState) => {
      setIsDraggingState(false);
      dragPosition.flattenOffset();
      
      // Calculate which position to drop to based on gesture
      const itemHeight = 90; // More accurate item height including margins
      const threshold = itemHeight * 0.5; // 50% of item height to trigger move
      
      let newIndex = index;
      
      if (Math.abs(gestureState.dy) > threshold) {
        if (gestureState.dy > 0) {
          // Dragging down
          newIndex = index + Math.ceil(gestureState.dy / itemHeight);
        } else {
          // Dragging up
          newIndex = index + Math.floor(gestureState.dy / itemHeight);
        }
      }
      
      // Ensure newIndex is within bounds
      newIndex = Math.max(0, newIndex);
      
      console.log('ProductItem.panResponder: Drag ended', {
        index,
        gestureY: gestureState.dy,
        threshold,
        newIndex,
        itemHeight,
        willReorder: newIndex !== index
      });
      
      if (newIndex !== index && onDragEnd) {
        console.log('ProductItem.panResponder: Calling onDragEnd', { from: index, to: newIndex });
        onDragEnd(index, newIndex);
      } else {
        console.log('ProductItem.panResponder: No reorder needed', { 
          reason: newIndex === index ? 'same position' : 'no onDragEnd callback'
        });
      }
      
      // Reset position with smooth animation
      Animated.spring(dragPosition, {
        toValue: { x: 0, y: 0 },
        useNativeDriver: false,
        tension: 100,
        friction: 8,
      }).start();
    },
  });
  const handleDelete = () => {
    Alert.alert(
      'Eliminar Producto',
      `¿Estás seguro de que quieres eliminar "${product.nombre}"?`,
      [
        { text: 'Cancelar', style: 'cancel' },
        { 
          text: 'Eliminar', 
          style: 'destructive',
          onPress: () => onDelete(product)
        },
      ]
    );
  };

  const formatPrice = (price?: number) => {
    return price !== undefined ? `$${price.toFixed(2)}` : '-';
  };

  const totalPrice = (product.ultimoCosto || 0) + (product.ultimaGanancia || 0);

  return (
    <Animated.View
      style={[
        styles.productItem,
        { backgroundColor: product.colorFondo },
        isDraggingState && styles.draggingItem,
        {
          transform: dragPosition.getTranslateTransform(),
          zIndex: isDraggingState ? 1000 : 1,
          elevation: isDraggingState ? 10 : 2,
        }
      ]}
      {...panResponder.panHandlers}
    >
      <View style={styles.productInfo}>
        <View style={styles.productHeader}>
          <Text style={styles.productName}>{product.nombre}</Text>
          <View style={styles.dragHandle}>
            <Ionicons name="reorder-three" size={24} color="rgba(255,255,255,0.9)" />
            <Text style={styles.dragHint}>Arrastra</Text>
          </View>
        </View>
        <View style={styles.priceInfo}>
          <Text style={styles.priceText}>
            Costo: {formatPrice(product.ultimoCosto)} | 
            Ganancia: {formatPrice(product.ultimaGanancia)} | 
            Total: {formatPrice(totalPrice)}
          </Text>
        </View>
      </View>

      <View style={styles.actions}>
        {/* Reorder buttons */}
        <View style={styles.reorderButtons}>
          <TouchableOpacity
            style={[styles.reorderButton, !canMoveUp && styles.disabledButton]}
            onPress={onMoveUp}
            disabled={!canMoveUp || isLoading || isDraggingState}
          >
            <Ionicons name="chevron-up" size={20} color={canMoveUp ? "#333" : "#ccc"} />
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.reorderButton, !canMoveDown && styles.disabledButton]}
            onPress={onMoveDown}
            disabled={!canMoveDown || isLoading || isDraggingState}
          >
            <Ionicons name="chevron-down" size={20} color={canMoveDown ? "#333" : "#ccc"} />
          </TouchableOpacity>
        </View>

        {/* Edit and delete buttons */}
        <View style={styles.editDeleteButtons}>
          <TouchableOpacity
            style={[styles.actionButton, styles.editButton]}
            onPress={() => onEdit(product)}
            disabled={isLoading || isDraggingState}
          >
            <Ionicons name="pencil" size={20} color="#007BFF" />
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.actionButton, styles.deleteButton]}
            onPress={handleDelete}
            disabled={isLoading || isDraggingState}
          >
            <Ionicons name="trash" size={20} color="#FF0000" />
          </TouchableOpacity>
        </View>
      </View>
    </Animated.View>
  );
}

export default function DraggableProductList({
  products,
  onEdit,
  onDelete,
  onReorder,
  isLoading = false,
}: DraggableProductListProps) {
  const [draggingIndex, setDraggingIndex] = useState<number | null>(null);

  const handleMoveUp = (index: number) => {
    if (index > 0) {
      console.log('DraggableProductList.handleMoveUp: Moving product up', {
        index,
        productName: products[index]?.nombre,
        newIndex: index - 1,
        productsLength: products.length
      });
      onReorder(index, index - 1);
    } else {
      console.log('DraggableProductList.handleMoveUp: Cannot move up', { 
        index, 
        reason: 'already at top' 
      });
    }
  };

  const handleMoveDown = (index: number) => {
    if (index < products.length - 1) {
      console.log('DraggableProductList.handleMoveDown: Moving product down', {
        index,
        productName: products[index]?.nombre,
        newIndex: index + 1,
        productsLength: products.length
      });
      onReorder(index, index + 1);
    } else {
      console.log('DraggableProductList.handleMoveDown: Cannot move down', { 
        index, 
        reason: 'already at bottom',
        productsLength: products.length
      });
    }
  };

  const handleDragStart = (index: number) => {
    setDraggingIndex(index);
  };

  const handleDragEnd = (fromIndex: number, toIndex: number) => {
    setDraggingIndex(null);
    
    // Clamp toIndex to valid range
    const clampedToIndex = Math.max(0, Math.min(toIndex, products.length - 1));
    
    console.log('DraggableProductList.handleDragEnd: Processing drag end', {
      fromIndex,
      toIndex,
      clampedToIndex,
      productsLength: products.length
    });
    
    if (fromIndex !== clampedToIndex && fromIndex >= 0 && fromIndex < products.length) {
      console.log('DraggableProductList.handleDragEnd: Calling onReorder', {
        from: fromIndex,
        to: clampedToIndex,
        productName: products[fromIndex]?.nombre
      });
      onReorder(fromIndex, clampedToIndex);
    } else {
      console.log('DraggableProductList.handleDragEnd: No reorder needed');
    }
  };

  const renderProduct = ({ item: product, index }: { item: Product; index: number }) => (
    <ProductItem
      product={product}
      index={index}
      onEdit={onEdit}
      onDelete={onDelete}
      onMoveUp={() => handleMoveUp(index)}
      onMoveDown={() => handleMoveDown(index)}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
      canMoveUp={index > 0}
      canMoveDown={index < products.length - 1}
      isLoading={isLoading}
      isDragging={draggingIndex === index}
    />
  );

  if (products.length === 0) {
    return (
      <View style={styles.emptyContainer}>
        <Ionicons name="cube-outline" size={64} color="#ccc" />
        <Text style={styles.emptyText}>No hay productos</Text>
        <Text style={styles.emptySubtext}>Agrega tu primer producto para comenzar</Text>
      </View>
    );
  }

  return (
    <FlatList
      data={products}
      renderItem={renderProduct}
      keyExtractor={(item) => item.id}
      style={styles.list}
      showsVerticalScrollIndicator={false}
    />
  );
}

const styles = StyleSheet.create({
  list: {
    flex: 1,
  },
  productItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    marginVertical: 4,
    marginHorizontal: 8,
    borderRadius: 12,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    minHeight: 80,
  },
  draggingItem: {
    elevation: 10,
    shadowOpacity: 0.3,
    shadowRadius: 8,
    transform: [{ scale: 1.05 }],
  },
  productInfo: {
    flex: 1,
  },
  productHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  productName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#fff',
    textShadowColor: 'rgba(0, 0, 0, 0.3)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 2,
    flex: 1,
  },
  dragHandle: {
    padding: 4,
    marginLeft: 8,
    alignItems: 'center',
  },
  dragHint: {
    fontSize: 10,
    color: 'rgba(255,255,255,0.7)',
    textShadowColor: 'rgba(0, 0, 0, 0.3)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 2,
    marginTop: 2,
  },
  priceInfo: {
    marginTop: 4,
  },
  priceText: {
    fontSize: 14,
    color: '#fff',
    textShadowColor: 'rgba(0, 0, 0, 0.3)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 2,
  },
  actions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  reorderButtons: {
    marginRight: 12,
  },
  reorderButton: {
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    borderRadius: 6,
    padding: 4,
    marginVertical: 2,
  },
  editDeleteButtons: {
    flexDirection: 'row',
  },
  actionButton: {
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    borderRadius: 8,
    padding: 8,
    marginHorizontal: 4,
  },
  editButton: {
    // Additional styling if needed
  },
  deleteButton: {
    // Additional styling if needed
  },
  disabledButton: {
    opacity: 0.5,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  emptyText: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#666',
    marginTop: 16,
  },
  emptySubtext: {
    fontSize: 16,
    color: '#999',
    textAlign: 'center',
    marginTop: 8,
  },
});