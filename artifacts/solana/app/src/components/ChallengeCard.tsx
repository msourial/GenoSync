import React, { useMemo } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { Colors } from '../theme/colors';
import { borderRadius, shadows, spacing, typography } from '../theme/tokens';
import { Challenge, ChallengeMetric, ChallengeStatus } from '../stores/challengesStore';

type Props = {
  challenge: Challenge;
  mySide?: 'creator' | 'opponent' | null;
  onPress?: () => void;
};

const formatPubkey = (pubkey?: string | null): string => {
  if (!pubkey) return 'Unknown';
  if (pubkey.length <= 10) return pubkey;
  return `${pubkey.slice(0, 4)}...${pubkey.slice(-4)}`;
};

const normalizeStatus = (statusLike: unknown): 'active' | 'passed' | 'rejected' | 'pending' => {
  const raw = String(statusLike ?? '').toLowerCase();
  if (raw.includes('active') || raw.includes('open') || raw.includes('accepted')) return 'active';
  if (raw.includes('pass') || raw.includes('won') || raw.includes('settled') || raw.includes('complete')) return 'passed';
  if (raw.includes('reject') || raw.includes('cancel') || raw.includes('fail') || raw.includes('lost')) return 'rejected';
  return 'pending';
};

const statusColor = (status: 'active' | 'passed' | 'rejected' | 'pending') => {
  switch (status) {
    case 'active':
      return Colors.solana.green;
    case 'passed':
      return '#22C55E';
    case 'rejected':
      return '#EF4444';
    default:
      return '#F59E0B';
  }
};

const getRemainingTime = (endLike: unknown): string => {
  const value = Number(endLike ?? 0);
  if (!value || Number.isNaN(value)) return 'No timer';
  const endMs = value < 1_000_000_000_000 ? value * 1000 : value;
  const diff = endMs - Date.now();
  if (diff <= 0) return 'Ended';
  const minutes = Math.floor(diff / (1000 * 60));
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);
  if (days > 0) return `${days}d ${hours % 24}h left`;
  if (hours > 0) return `${hours}h ${minutes % 60}m left`;
  return `${minutes}m left`;
};

const metricLabel = (metricLike: unknown): string => {
  const metric = String(metricLike ?? '').toLowerCase();
  if (!metric) return 'Metric';
  return metric
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (s) => s.toUpperCase());
};

export const ChallengeCard: React.FC<Props> = ({ challenge, mySide = null, onPress }) => {
  const c = challenge as any;
  const creator = c.creator ?? c.creatorPubkey ?? c.creatorAddress ?? '';
  const opponent = c.opponent ?? c.opponentPubkey ?? c.opponentAddress ?? '';
  const metric = c.metric ?? c.challengeMetric ?? ChallengeMetric?.HRV ?? 'hrv';
  const wager = Number(c.wagerAura ?? c.wager ?? 0);
  const status = normalizeStatus(c.status ?? ChallengeStatus?.Pending ?? 'pending');
  const timeText = getRemainingTime(c.endTime ?? c.endsAt ?? c.expiresAt ?? c.deadline);

  const accent = useMemo(() => {
    if (mySide === 'creator') return Colors.solana.purple;
    if (mySide === 'opponent') return Colors.solana.green;
    return Colors.surface;
  }, [mySide]);

  return (
    <Pressable
      onPress={onPress}
      disabled={!onPress}
      style={({ pressed }) => [
        styles.card,
        { borderColor: accent, opacity: pressed ? 0.92 : 1 },
      ]}
    >
      <View style={styles.topRow}>
        <View style={styles.avatarsWrap}>
          <View style={[styles.avatar, { backgroundColor: Colors.solana.purple }]}> 
            <Text style={styles.avatarText}>{formatPubkey(creator).charAt(0)}</Text>
          </View>
          <View style={[styles.avatar, styles.avatarOverlap, { backgroundColor: Colors.solana.green }]}> 
            <Text style={styles.avatarText}>{formatPubkey(opponent).charAt(0)}</Text>
          </View>
        </View>

        <View style={[styles.pill, { borderColor: statusColor(status) }]}>
          <View style={[styles.dot, { backgroundColor: statusColor(status) }]} />
          <Text style={[styles.pillText, { color: statusColor(status) }]}>{status.toUpperCase()}</Text>
        </View>
      </View>

      <View style={styles.midRow}>
        <Text style={styles.metric}>{metricLabel(metric)}</Text>
        <View style={styles.wagerWrap}>
          <Ionicons name="flash" color={Colors.solana.green} size={14} />
          <Text style={styles.wagerText}>{wager.toLocaleString()} AURA</Text>
        </View>
      </View>

      <View style={styles.bottomRow}>
        <Text style={styles.participant}>{formatPubkey(creator)}</Text>
        <Ionicons name="swap-horizontal" color={Colors.textSecondary} size={14} />
        <Text style={styles.participant}>{formatPubkey(opponent)}</Text>
      </View>

      <View style={styles.timeRow}>
        <Ionicons name="time-outline" size={13} color={Colors.textSecondary} />
        <Text style={styles.timeText}>{timeText}</Text>
      </View>
    </Pressable>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: Colors.surface,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    padding: spacing.md,
    marginBottom: spacing.sm,
    ...shadows.sm,
  },
  topRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  avatarsWrap: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatar: {
    width: 26,
    height: 26,
    borderRadius: 13,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#ffffff33',
  },
  avatarOverlap: {
    marginLeft: -8,
  },
  avatarText: {
    color: Colors.textPrimary,
    fontSize: 11,
    fontWeight: '700',
  },
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: borderRadius.xl,
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    gap: 6,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  pillText: {
    ...typography.caption,
    fontWeight: '700',
  },
  midRow: {
    marginTop: spacing.sm,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  metric: {
    color: Colors.textPrimary,
    ...typography.body,
    fontWeight: '700',
  },
  wagerWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  wagerText: {
    color: Colors.solana.green,
    ...typography.caption,
    fontWeight: '700',
  },
  bottomRow: {
    marginTop: spacing.sm,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  participant: {
    color: Colors.textSecondary,
    ...typography.caption,
  },
  timeRow: {
    marginTop: spacing.xs,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  timeText: {
    color: Colors.textSecondary,
    ...typography.caption,
  },
});

export default ChallengeCard;
