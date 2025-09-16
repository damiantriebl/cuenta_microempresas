import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Timestamp } from 'firebase/firestore';
import TransactionHistoryList from './TransactionHistoryList';
import { TransactionEvent } from '@/schemas/types';

// Example usage component showing how to use the transaction history system
const TransactionHistoryExample: React.FC = () => {
  // Example transaction data
  const sampleEvents: TransactionEvent[] = [
    {
      id: '1',
      clienteId: 'client1',
      tipo: 'venta',
      fecha: Timestamp.fromDate(new Date('2024-01-15')),
      producto: 'Producto A',
      productoColor: '#FF6B6B',
      cantidad: 2,
      costoUnitario: 100,
      gananciaUnitaria: 50,
      totalVenta: 300,
      creado: Timestamp.fromDate(new Date('2024-01-15')),
      borrado: false,
    },
    {
      id: '2',
      clienteId: 'client1',
      tipo: 'pago',
      fecha: Timestamp.fromDate(new Date('2024-01-16')),
      montoPago: 150,
      creado: Timestamp.fromDate(new Date('2024-01-16')),
      borrado: false,
    },
    {
      id: '3',
      clienteId: 'client1',
      tipo: 'venta',
      fecha: Timestamp.fromDate(new Date('2024-01-17')),
      producto: 'Producto B',
      productoColor: '#4ECDC4',
      cantidad: 1,
      costoUnitario: 200,
      gananciaUnitaria: 100,
      totalVenta: 300,
      creado: Timestamp.fromDate(new Date('2024-01-17')),
      borrado: false,
    },
    {
      id: '4',
      clienteId: 'client1',
      tipo: 'pago',
      fecha: Timestamp.fromDate(new Date('2024-01-18')),
      montoPago: 500, // Overpayment that should create favor balance
      creado: Timestamp.fromDate(new Date('2024-01-18')),
      borrado: false,
    },
  ];

  const handleEditEvent = (event: TransactionEvent) => {
    console.log('Edit event:', event.id);
    // Implement edit functionality
  };

  const handleDeleteEvent = (event: TransactionEvent) => {
    console.log('Delete event:', event.id);
    // Implement delete functionality
  };

  return (
    <View style={styles.container}>
      <TransactionHistoryList
        events={sampleEvents}
        onEditEvent={handleEditEvent}
        onDeleteEvent={handleDeleteEvent}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#ebebeb',
  },
});

export default TransactionHistoryExample;