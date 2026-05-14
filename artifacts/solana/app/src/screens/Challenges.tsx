import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Alert,
  FlatList,
  RefreshControl,
  SafeAreaView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Colors } from '../theme/colors';
import { borderRadius, shadows, spacing, typography } from '../theme/tokens';
import {
  ChallengeStatus,
  useChallengesStore,
} from '../stores/challengesStore';

type Segment = 'active' | 'pending' | 'history';

type ChallengeLike = {
  pda?: string;
  address?: string;
  id?: string;
  status?: unknown;
  metric?: unknown;
  target?: number;
  wager?: number;
  creator?: string;
  creatorPubkey?: string;
  opponent?: string;
  opponentPubkey?: string;
  expiry?: number;
  expiresAt?: number;
};

const formatPubkey = (value?: string | null): string => {
  if (!value) return 'Unknown';
  if (value.length <= 10) return value;
  return `${value.slice(0, 4)}...${value.slice(-4)}`;
};

const normalizeStatus = (status: unknown): string => String(status ?? '').toLowerCase();
const normalizeMetric = (metric: unknown): string => String(metric ?? '').toLowerCase();

const metricLabel = (metric: unknown): string => {
  const m = normalizeMetric(metric);
  if (m.includes('hrv')) return 'HRV';
  if (m.includes('strain')) return 'Strain';
  if (m.includes('focus')) return 'Focus';
  if (m.includes('steps')) return 'Steps';
  if (m.includes('apm')) return 'APM';
  return String(metric ?? 'Metric');
};

const statusLabel = (status: unknown): string => {
  const s = normalizeStatus(status);
  if (s.includes('await')) return 'Awaiting Scores';
  if (s.includes('settled')) return 'Settled';
  if (s.includes('cancel')) return 'Canceled';
  if (s.includes('active')) return 'Active';
  if (s.includes('pending') || s.includes('open') || s.includes('created')) return 'Pending';
  return String(status ?? 'Unknown');
};

const statusColor = (status: unknown): string => {
  const s = normalizeStatus(status);
  if (s.includes('active')) return Colors.solana.green;
  if (s.includes('pending') || s.includes('open') || s.includes('created')) return '#F59E0B';
  if (s.includes('settled')) return Colors.solana.purple;
  if (s.includes('cancel') || s.includes('reject') || s.includes('expired')) return '#EF4444';
  if (s.includes('await')) return '#38BDF8';
  return Colors.textSecondary;
};

const toSegment = (status: unknown): Segment => {
  const s = normalizeStatus(status);
  if (s.includes('pending') || s.includes('open') || s.includes('created')) return 'pending';
  if (s.includes('active') || s.includes('await')) return 'active';
  return 'history';
};

const getChallengeKey = (challenge: ChallengeLike): string =>
  challenge.pda ?? challenge.address ?? challenge.id ?? `${challenge.creator ?? 'x'}-${challenge.opponent ?? 'y'}-${challenge.expiry ?? 0}`;

const ChallengeCard = ({
  item,
  onPress,
}: {
  item: ChallengeLike;
  onPress: (challenge: ChallengeLike) => void;
}) => {
  const creator = item.creatorPubkey ?? item.creator;
  const opponent = item.opponentPubkey ?? item.opponent;

  return (
    <TouchableOpacity activeOpacity={0.85} style={styles.card} onPress={() => onPress(item)}>
      <View style={styles.cardHeader}>
        <Text style={styles.cardTitle}>{metricLabel(item.metric)} Challenge</Text>
        <View style={[styles.statusPill, { borderColor: statusColor(item.status) }]}>
          <Text style={[styles.statusText, { color: statusColor(item.status) }]}>{statusLabel(item.status)}</Text>
        </View>
      </View>

      <Text style={styles.cardSubtext}>
        {formatPubkey(creator)} vs {formatPubkey(opponent)}
      </Text>

      <View style={styles.cardMetaRow}>
        <Text style={styles.cardMeta}>Target: {item.target ?? '--'}</Text>
        <Text style={styles.cardMeta}>Wager: {item.wager ?? 0} AURA</Text>
      </View>
    </TouchableOpacity>
  );
};

export default function ChallengesScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<any>>();
  const { challenges, isLoading, refresh } = useChallengesStore();
  const [segment, setSegment] = useState<Segment>('active');

  const load = useCallback(async () => {
    try {
      await refresh();
    } catch (e) {
      Alert.alert('Unable to refresh', e instanceof Error ? e.message : 'Please try again.');
    }
  }, [refresh]);

  useEffect(() => {
    void load();
  }, [load]);

  const filtered = useMemo(() => {
    const list = (challenges ?? []) as ChallengeLike[];
    return list.filter((c) => toSegment(c.status) === segment);
  }, [challenges, segment]);

  const onOpenChallenge = useCallback(
    (challenge: ChallengeLike) => {
      const pda = challenge.pda ?? challenge.address ?? challenge.id;
      if (!pda) {
        Alert.alert('Invalid challenge', 'Challenge address missing.');
        return;
      }
      navigation.navigate('ChallengeDetail' as never, { pda } as never);
    },
    [navigation],
  );

  const renderHeader = () => (
    <View style={styles.headerWrap}>
      <Text style={styles.title}>Challenges</Text>
      <View style={styles.segmentWrap}>
        {(['active', 'pending', 'history'] as Segment[]).map((value) => {
          const selected = value === segment;
          return (
            <TouchableOpacity
              key={value}
              style={[styles.segmentButton, selected && styles.segmentButtonActive]}
              onPress={() => setSegment(value)}
              activeOpacity={0.85}
            >
              <Text style={[styles.segmentText, selected && styles.segmentTextActive]}>
                {value[0].toUpperCase() + value.slice(1)}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <FlatList
        data={filtered}
        keyExtractor={(item) => getChallengeKey(item)}
        contentContainerStyle={styles.listContent}
        ListHeaderComponent={renderHeader}
        renderItem={({ item }) => <ChallengeCard item={item} onPress={onOpenChallenge} />}
        refreshControl={<RefreshControl refreshing={isLoading} onRefresh={load} tintColor={Colors.solana.purple} />}
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Ionicons name="trophy-outline" size={38} color={Colors.textSecondary} />
            <Text style={styles.emptyTitle}>No challenges here yet</Text>
            <Text style={styles.emptyText}>Start one now and bring your wellness stats on-chain.</Text>
            <TouchableOpacity
              style={styles.emptyCta}
              onPress={() => navigation.navigate('CreateChallenge' as never)}
              activeOpacity={0.85}
            >
              <Text style={styles.emptyCtaText}>Create Challenge</Text>
            </TouchableOpacity>
          </View>
        }
      />

      <TouchableOpacity
        activeOpacity={0.9}
        style={styles.fab}
        onPress={() => navigation.navigate('CreateChallenge' as never)}
      >
        <Ionicons name="add" size={28} color={Colors.textPrimary} />
      </TouchableOpacity>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  listContent: {
    paddingHorizontal: spacing.lg,
    paddingBottom: 120,
  },
  headerWrap: {
    marginTop: spacing.md,
    marginBottom: spacing.lg,
  },
  title: {
    ...typography.h1,
    color: Colors.textPrimary,
    marginBottom: spacing.md,
  },
  segmentWrap: {
    backgroundColor: Colors.surface,
    borderRadius: borderRadius.lg,
    padding: spacing.xs,
    flexDirection: 'row',
  },
  segmentButton: {
    flex: 1,
    borderRadius: borderRadius.md,
    paddingVertical: spacing.sm,
    alignItems: 'center',
  },
  segmentButtonActive: {
    backgroundColor: Colors.solana.purple,
  },
  segmentText: {
    ...typography.body,
    color: Colors.textSecondary,
    fontWeight: '600',
  },
  segmentTextActive: {
    color: Colors.textPrimary,
  },
  card: {
    backgroundColor: Colors.surface,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    marginBottom: spacing.md,
    ...shadows.sm,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.xs,
  },
  cardTitle: {
    ...typography.h3,
    color: Colors.textPrimary,
    flex: 1,
    marginRight: spacing.sm,
  },
  statusPill: {
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
  },
  statusText: {
    ...typography.caption,
    fontWeight: '700',
  },
  cardSubtext: {
    ...typography.body,
    color: Colors.textSecondary,
    marginBottom: spacing.sm,
  },
  cardMetaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  cardMeta: {
    ...typography.caption,
    color: Colors.textPrimary,
  },
  emptyState: {
    marginTop: spacing.xxxl,
    alignItems: 'center',
    paddingHorizontal: spacing.xl,
  },
  emptyTitle: {
    ...typography.h3,
    color: Colors.textPrimary,
    marginTop: spacing.md,
  },
  emptyText: {
    ...typography.body,
    color: Colors.textSecondary,
    textAlign: 'center',
    marginTop: spacing.xs,
    marginBottom: spacing.lg,
  },
  emptyCta: {
    backgroundColor: Colors.solana.green,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.md,
  },
  emptyCtaText: {
    ...typography.body,
    color: '#0B0F19',
    fontWeight: '700',
  },
  fab: {
    position: 'absolute',
    right: spacing.lg,
    bottom: spacing.xl,
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.solana.purple,
    ...shadows.glow,
  },
});
