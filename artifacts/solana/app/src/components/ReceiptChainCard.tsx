import React from 'react';
import {
  FlatList,
  ListRenderItem,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import * as ColorModule from '../theme/colors';
import * as ThemeTokens from '../theme/tokens';

export interface BioReceipt {
  hash: string;
  timestamp: number;
  metric: string;
  value: string;
}

export interface ReceiptChainCardProps {
  receipts: BioReceipt[];
  onTapReceipt?: (r: BioReceipt) => void;
  emptyMessage?: string;
}

const palette = (((ColorModule as any).Colors ?? (ColorModule as any).default) || {}) as any;
const tokens = ThemeTokens as any;

const colors = {
  surface: palette.surface ?? '#0B0F19',
  textPrimary: palette.textPrimary ?? '#FFFFFF',
  textSecondary: palette.textSecondary ?? '#94A3B8',
  purple: palette.solana?.purple ?? '#9945FF',
  green: palette.solana?.green ?? '#14F195',
};

const spacing = tokens.spacing ?? {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
  xxxl: 32,
};

const borderRadius = tokens.borderRadius ?? {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
};

const truncateHash = (hash: string): string => {
  if (hash.length <= 14) {
    return hash;
  }
  return `${hash.slice(0, 8)}...${hash.slice(-6)}`;
};

const formatTime = (ts: number): string => {
  const date = new Date(ts);
  return date.toLocaleString();
};

export const ReceiptChainCard: React.FC<ReceiptChainCardProps> = ({
  receipts,
  onTapReceipt,
  emptyMessage = 'No bio-receipts yet. Complete a session to mint your first proof.',
}) => {
  const renderItem: ListRenderItem<BioReceipt> = ({ item }) => {
    const row = (
      <View style={styles.itemRow}>
        <View style={styles.itemIconWrap}>
          <Ionicons name="receipt-outline" size={18} color={colors.purple} />
        </View>

        <View style={styles.itemBody}>
          <Text style={styles.metricText}>{item.metric}</Text>
          <Text style={styles.valueText}>{item.value}</Text>
          <Text style={styles.metaText}>{truncateHash(item.hash)}</Text>
          <Text style={styles.timeText}>{formatTime(item.timestamp)}</Text>
        </View>

        {onTapReceipt ? <Ionicons name="chevron-forward" size={18} color={colors.textSecondary} /> : null}
      </View>
    );

    if (!onTapReceipt) {
      return row;
    }

    return (
      <TouchableOpacity activeOpacity={0.85} onPress={() => onTapReceipt(item)}>
        {row}
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <Ionicons name="shield-checkmark-outline" size={18} color={colors.green} />
        <Text style={styles.headerTitle}>Bio Receipt Chain</Text>
      </View>

      {receipts.length === 0 ? (
        <View style={styles.emptyWrap}>
          <Text style={styles.emptyText}>{emptyMessage}</Text>
        </View>
      ) : (
        <FlatList
          data={receipts}
          keyExtractor={(item) => `${item.hash}-${item.timestamp}`}
          renderItem={renderItem}
          ItemSeparatorComponent={() => <View style={styles.separator} />}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.listContent}
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.xl,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    padding: spacing.lg,
    maxHeight: 360,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  headerTitle: {
    color: colors.textPrimary,
    fontSize: 16,
    fontWeight: '700',
  },
  listContent: {
    paddingBottom: spacing.sm,
  },
  separator: {
    height: spacing.sm,
  },
  itemRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: 'rgba(255,255,255,0.03)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.07)',
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    gap: spacing.md,
  },
  itemIconWrap: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: 'rgba(153,69,255,0.12)',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 2,
  },
  itemBody: {
    flex: 1,
  },
  metricText: {
    color: colors.textPrimary,
    fontSize: 14,
    fontWeight: '700',
  },
  valueText: {
    color: colors.green,
    fontSize: 14,
    marginTop: 2,
    fontWeight: '600',
  },
  metaText: {
    color: colors.textSecondary,
    fontSize: 12,
    marginTop: spacing.xs,
  },
  timeText: {
    color: colors.textSecondary,
    fontSize: 11,
    marginTop: 2,
  },
  emptyWrap: {
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    backgroundColor: 'rgba(255,255,255,0.03)',
    padding: spacing.lg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyText: {
    color: colors.textSecondary,
    fontSize: 13,
    textAlign: 'center',
    lineHeight: 18,
  },
});

export default ReceiptChainCard;
