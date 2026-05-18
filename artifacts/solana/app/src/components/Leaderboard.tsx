import React, { useMemo } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { Colors } from '../theme/colors';
import { borderRadius, shadows, spacing, typography } from '../theme/tokens';

type LeaderboardEntry = {
  pubkey: string;
  wins: number;
  losses: number;
  net: number;
};

type Props = {
  entries: LeaderboardEntry[];
  title?: string;
  max?: number;
};

const formatPubkey = (pubkey: string): string => {
  if (!pubkey) return 'Unknown';
  if (pubkey.length <= 12) return pubkey;
  return `${pubkey.slice(0, 4)}...${pubkey.slice(-4)}`;
};

const rankColor = (rank: number): string => {
  if (rank === 1) return '#FBBF24';
  if (rank === 2) return '#E5E7EB';
  if (rank === 3) return '#D97706';
  return Colors.textSecondary;
};

const rankIcon = (rank: number): string => {
  if (rank <= 3) return 'medal';
  return 'ellipse-outline';
};

export const Leaderboard: React.FC<Props> = ({ entries, title = 'Leaderboard', max = 10 }) => {
  const sorted = useMemo(() => {
    return [...entries]
      .sort((a, b) => b.net - a.net || b.wins - a.wins || a.losses - b.losses)
      .slice(0, max);
  }, [entries, max]);

  return (
    <View style={styles.container}>
      <Text style={styles.title}>{title}</Text>

      {sorted.length === 0 ? (
        <View style={styles.emptyWrap}>
          <Text style={styles.emptyText}>No players yet.</Text>
        </View>
      ) : (
        sorted.map((entry, index) => {
          const rank = index + 1;
          const netPositive = entry.net >= 0;
          return (
            <View key={`${entry.pubkey}-${index}`} style={styles.row}>
              <View style={styles.left}>
                <Ionicons name={rankIcon(rank)} size={16} color={rankColor(rank)} />
                <Text style={[styles.rank, { color: rankColor(rank) }]}>#{rank}</Text>
                <Text style={styles.pubkey}>{formatPubkey(entry.pubkey)}</Text>
              </View>

              <View style={styles.right}>
                <Text style={styles.record}>{entry.wins}W/{entry.losses}L</Text>
                <Text style={[styles.net, { color: netPositive ? Colors.solana.green : '#EF4444' }]}>
                  {netPositive ? '+' : ''}{entry.net}
                </Text>
              </View>
            </View>
          );
        })
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: Colors.surface,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: '#ffffff14',
    padding: spacing.md,
    ...shadows.sm,
  },
  title: {
    color: Colors.textPrimary,
    ...typography.h3,
    marginBottom: spacing.sm,
  },
  emptyWrap: {
    paddingVertical: spacing.md,
  },
  emptyText: {
    color: Colors.textSecondary,
    ...typography.body,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: spacing.xs,
  },
  left: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  right: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  rank: {
    ...typography.caption,
    fontWeight: '700',
    minWidth: 24,
  },
  pubkey: {
    color: Colors.textPrimary,
    ...typography.body,
  },
  record: {
    color: Colors.textSecondary,
    ...typography.caption,
  },
  net: {
    ...typography.caption,
    fontWeight: '700',
    minWidth: 42,
    textAlign: 'right',
  },
});

export default Leaderboard;
