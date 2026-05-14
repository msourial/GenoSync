import React from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Platform,
  StyleSheet,
  Text,
  ToastAndroid,
  TouchableOpacity,
  View,
} from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';

import { useGovernance } from '../hooks/useGovernance';
import type { Proposal } from '../types';
import { Colors } from '../theme/colors';
import { borderRadius, shadows, spacing, typography } from '../theme/tokens';

function statusColor(status: Proposal['status']): string {
  switch (status) {
    case 'active':
      return '#22C55E';
    case 'passed':
      return '#06B6D4';
    case 'rejected':
      return '#EF4444';
    default:
      return '#94A3B8';
  }
}

function formatEndTime(ts: number): string {
  const date = new Date(ts);
  return date.toLocaleDateString();
}

const Governance: React.FC = () => {
  const { proposals, loading, vote } = useGovernance();

  const handleVote = async (id: string, support: boolean) => {
    try {
      await vote(id, support);
      const message = support ? 'Vote submitted: For' : 'Vote submitted: Against';
      if (Platform.OS === 'android') {
        ToastAndroid.show(message, ToastAndroid.SHORT);
      } else {
        Alert.alert('Vote submitted', message);
      }
    } catch (e) {
      Alert.alert('Vote failed', (e as Error)?.message ?? 'Please try again.');
    }
  };

  const renderProposal = ({ item }: { item: Proposal }) => {
    const totalVotes = item.votesFor + item.votesAgainst;
    const forPct = totalVotes === 0 ? 0 : (item.votesFor / totalVotes) * 100;
    const againstPct = 100 - forPct;
    const isActive = item.status === 'active';

    return (
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <Text style={styles.title}>{item.title}</Text>
          <View style={[styles.statusBadge, { backgroundColor: `${statusColor(item.status)}22`, borderColor: statusColor(item.status) }]}>
            <Text style={[styles.statusText, { color: statusColor(item.status) }]}>{item.status.toUpperCase()}</Text>
          </View>
        </View>

        <Text style={styles.description}>{item.description}</Text>

        <View style={styles.statsRow}>
          <Text style={styles.statLabel}>For: <Text style={styles.statValue}>{item.votesFor}</Text></Text>
          <Text style={styles.statLabel}>Against: <Text style={styles.statValue}>{item.votesAgainst}</Text></Text>
          <Text style={styles.statLabel}>Quorum: <Text style={styles.statValue}>{item.quorum}</Text></Text>
        </View>

        <View style={styles.progressWrap}>
          <View style={[styles.progressFor, { width: `${forPct}%` }]} />
          <View style={[styles.progressAgainst, { width: `${againstPct}%` }]} />
        </View>

        <View style={styles.footerRow}>
          <Text style={styles.endTime}>Ends {formatEndTime(item.endTime)}</Text>
          <View style={styles.voteButtons}>
            <TouchableOpacity
              disabled={!isActive}
              style={[styles.voteBtn, styles.forBtn, !isActive && styles.disabledBtn]}
              onPress={() => handleVote(item.id, true)}
            >
              <Ionicons name="thumbs-up-outline" size={15} color={Colors.textPrimary} />
              <Text style={styles.voteBtnText}>For</Text>
            </TouchableOpacity>
            <TouchableOpacity
              disabled={!isActive}
              style={[styles.voteBtn, styles.againstBtn, !isActive && styles.disabledBtn]}
              onPress={() => handleVote(item.id, false)}
            >
              <Ionicons name="thumbs-down-outline" size={15} color={Colors.textPrimary} />
              <Text style={styles.voteBtnText}>Against</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.screenTitle}>Governance</Text>
        <Ionicons name="shield-checkmark-outline" size={22} color={Colors.solana.green} />
      </View>

      {loading && proposals.length === 0 ? (
        <View style={styles.loaderWrap}>
          <ActivityIndicator color={Colors.solana.green} />
        </View>
      ) : null}

      {!loading && proposals.length === 0 ? (
        <View style={styles.emptyWrap}>
          <Ionicons name="chatbox-ellipses-outline" size={34} color={Colors.textSecondary} />
          <Text style={styles.emptyTitle}>No active proposals</Text>
        </View>
      ) : null}

      <FlatList
        data={proposals}
        renderItem={renderProposal}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.lg,
  },
  screenTitle: {
    color: Colors.textPrimary,
    ...typography.h1,
  },
  listContent: {
    paddingBottom: spacing.xxxl,
    gap: spacing.md,
  },
  card: {
    backgroundColor: Colors.surface,
    borderRadius: borderRadius.xl,
    padding: spacing.lg,
    marginBottom: spacing.md,
    ...shadows.sm,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: spacing.sm,
  },
  title: {
    color: Colors.textPrimary,
    ...typography.h2,
    flex: 1,
  },
  statusBadge: {
    borderWidth: 1,
    borderRadius: borderRadius.md,
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
  },
  statusText: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.6,
  },
  description: {
    color: Colors.textSecondary,
    ...typography.body,
    marginTop: spacing.sm,
  },
  statsRow: {
    marginTop: spacing.md,
    flexDirection: 'row',
    justifyContent: 'space-between',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  statLabel: {
    color: Colors.textSecondary,
    ...typography.caption,
  },
  statValue: {
    color: Colors.textPrimary,
    fontWeight: '700',
  },
  progressWrap: {
    marginTop: spacing.md,
    width: '100%',
    height: 10,
    borderRadius: 999,
    backgroundColor: '#1F2937',
    overflow: 'hidden',
    flexDirection: 'row',
  },
  progressFor: {
    backgroundColor: '#22C55E',
    height: '100%',
  },
  progressAgainst: {
    backgroundColor: '#EF4444',
    height: '100%',
  },
  footerRow: {
    marginTop: spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.md,
  },
  endTime: {
    color: Colors.textSecondary,
    ...typography.caption,
  },
  voteButtons: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  voteBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    borderRadius: borderRadius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  forBtn: {
    backgroundColor: '#14532d',
  },
  againstBtn: {
    backgroundColor: '#7f1d1d',
  },
  disabledBtn: {
    opacity: 0.45,
  },
  voteBtnText: {
    color: Colors.textPrimary,
    ...typography.caption,
    fontWeight: '700',
  },
  loaderWrap: {
    paddingVertical: spacing.lg,
  },
  emptyWrap: {
    marginTop: spacing.xxxl,
    alignItems: 'center',
    gap: spacing.sm,
  },
  emptyTitle: {
    color: Colors.textPrimary,
    ...typography.h2,
  },
});

export default Governance;
