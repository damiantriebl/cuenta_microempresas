import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
} from 'react-native';
import { TransactionEvent } from '@/schemas/types';
import {
  calculateClientDebt,
  formatTransactionHistoryDetailed,
  formatCurrency,
  FormattedTransactionGroup
} from '@/schemas/business-logic';
import TransactionCard from './TransactionCard';
import ZeroBalanceSeparator from './ZeroBalanceSeparator';
import FavorBalanceDisplay from './FavorBalanceDisplay';
import PaymentSplitVisualization from './PaymentSplitVisualization';

interface TransactionHistoryListProps {
  events: TransactionEvent[];
  onEditEvent?: (event: TransactionEvent) => void;
  onDeleteEvent?: (event: TransactionEvent) => void;
  onViewNotes?: (event: TransactionEvent) => void;
}

interface HistoryItemProps {
  group: FormattedTransactionGroup;
  onEdit?: () => void;
  onDelete?: () => void;
  onViewNotes?: () => void;
}

const HistoryItem: React.FC<HistoryItemProps> = ({ group, onEdit, onDelete, onViewNotes }) => {
  if (group.type === 'zero-balance') {
    return <ZeroBalanceSeparator message={group.message} />;
  }

  if (group.type === 'favor-balance') {
    return (
      <FavorBalanceDisplay
        amount={group.amount || 0}
        message={group.message}
      />
    );
  }

  if (group.type === 'payment-split' && group.event && group.splitInfo) {
    return (
      <PaymentSplitVisualization
        event={group.event}
        debtPortion={group.splitInfo.debtPortion}
        favorPortion={group.splitInfo.favorPortion}
        onEdit={onEdit}
        onDelete={onDelete}
        onViewNotes={onViewNotes}
      />
    );
  }

  if (!group.event) return null;

  return (
    <TransactionCard
      event={group.event}
      onEdit={onEdit}
      onDelete={onDelete}
      onViewNotes={onViewNotes}
      splitAmount={group.amount}
    />
  );
};

const TransactionHistoryList: React.FC<TransactionHistoryListProps> = ({
  events,
  onEditEvent,
  onDeleteEvent,
  onViewNotes,
}) => {
  // Validate events data
  if (!events) {
    console.error('TransactionHistoryList: events is null or undefined');
    return (
      <View style={styles.emptyContainer}>
        <Text style={styles.emptyText}>Error: No se pudieron cargar las transacciones</Text>
      </View>
    );
  }

  if (!Array.isArray(events)) {
    console.error('TransactionHistoryList: events is not an array', { events, type: typeof events });
    return (
      <View style={styles.emptyContainer}>
        <Text style={styles.emptyText}>Error: Datos de transacciones inválidos</Text>
      </View>
    );
  }

  // Calculate debt and format for display
  let debtCalculation;
  let formattedHistory;
  
  try {
    debtCalculation = calculateClientDebt(events);
    formattedHistory = formatTransactionHistoryDetailed(debtCalculation);
  } catch (error) {
    console.error('TransactionHistoryList: Error calculating debt', { error, events });
    return (
      <View style={styles.emptyContainer}>
        <Text style={styles.emptyText}>Error al procesar las transacciones</Text>
      </View>
    );
  }

  const renderItem = ({ item }: { item: FormattedTransactionGroup }) => (
    <HistoryItem
      group={item}
      onEdit={item.event && onEditEvent ? () => onEditEvent(item.event! as TransactionEvent) : undefined}
      onDelete={item.event && onDeleteEvent ? () => onDeleteEvent(item.event! as TransactionEvent) : undefined}
      onViewNotes={item.event && onViewNotes ? () => onViewNotes(item.event! as TransactionEvent) : undefined}
    />
  );

  if (events.length === 0) {
    return (
      <View style={styles.emptyContainer}>
        <Text style={styles.emptyText}>No hay transacciones registradas</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <FlatList
        data={formattedHistory}
        renderItem={renderItem}
        keyExtractor={(item, index) =>
          item.event?.id || `${item.type}-${index}`
        }
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.listContent}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#ebebeb',
  },
  listContent: {
    padding: 16,
    paddingBottom: 32,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  emptyText: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
  },


});

export default TransactionHistoryList;