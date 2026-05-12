import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Animated,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/Ionicons';
import { Colors } from '../theme/colors';
import { spacing, typography, borderRadius } from '../theme/tokens';

interface Proposal {
  id: string;
  title: string;
  description: string;
  status: 'active' | 'passed' | 'rejected' | 'pending';
  votesFor: number;
  votesAgainst: number;
  quorum: number;
  endTime: number;
}

const MOCK_PROPOSALS: Proposal[] = [
  {
    id: '1',
    title: 'Increase S-Grade XP Reward',
    description: 'Raise AURA reward for S-grade wellness sessions from 100 to 150 AURA to encourage peak performance.',
    status: 'active',
    votesFor: 12500,
    votesAgainst: 3200,
    quorum: 15000,
    endTime: Date.now() + 86400000 * 3,
  },
  {
    id: '2',
    title: 'Add Meditation Challenge',
    description: 'Introduce a daily 10-minute meditation challenge with 50 AURA reward for completion.',
    status: 'active',
    votesFor: 8900,
    votesAgainst: 1200,
    quorum: 10000,
    endTime: Date.now() + 86400000 * 5,
  },
  {
    id: '3',
    title: '90-Day Staking Minimum',
    description: 'Require minimum 90-day staking period for governance voting rights.',
    status: 'passed',
    votesFor: 21000,
    votesAgainst: 4500,
    quorum: 20000,
    endTime: Date.now() - 86400000,
  },
];

export const GovernanceScreen: React.FC = () => {
  const [votes, setVotes] = useState<Record<string, 'for' | 'against' | null>>({});
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const handleVote = (proposalId: string, direction: 'for' | 'against') => {
    setVotes((prev) => ({ ...prev, [proposalId]: direction }));
  };

  const getStatusColor = (status: Proposal['status']) => {
    switch (status) {
      case 'active': return Colors.info;
      case 'passed': return Colors.success;
      case 'rejected': return Colors.error;
      case 'pending': return Colors.warning;
    }
  };

  const getStatusLabel = (status: Proposal['status']) => {
    switch (status) {
      case 'active': return 'Voting Active';
      case 'passed': return 'Passed';
      case 'rejected': return 'Rejected';
      case 'pending': return 'Pending';
    }
  };

  const formatNumber = (num: number) => {
    if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
    if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
    return num.toString();
  };

  const formatTimeLeft = (endTime: number) => {
    const diff = endTime - Date.now();
    if (diff <= 0) return 'Ended';
    const days = Math.floor(diff / 86400000);
    if (days > 0) return `${days} days left`;
    const hours = Math.floor(diff / 3600000);
    return `${hours} hours left`;
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView style={styles.scrollView}>
        {/* Header */}
        <View style={styles.header}>
          <View>
            <Text style={styles.title}>Governance</Text>
            <Text style={styles.subtitle}>Shape the future of GenoSync</Text>
          </View>
          <View style={styles.powerBadge}>
            <Icon name="flash" size={14} color={Colors.solana.purple} />
            <Text style={styles.powerText}>1,000 AURA to propose</Text>
          </View>
        </View>

        {/* Stats */}
        <View style={styles.statsRow}>
          <View style={styles.statCard}>
            <Text style={styles.statValue}>3</Text>
            <Text style={styles.statLabel}>Active Proposals</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statValue}>12</Text>
            <Text style={styles.statLabel}>Total Votes</Text>
          </View>
        </View>

        {/* Proposals */}
        <Text style={styles.sectionTitle}>Active Proposals</Text>
        {MOCK_PROPOSALS.map((proposal) => {
          const isExpanded = expandedId === proposal.id;
          const totalVotes = proposal.votesFor + proposal.votesAgainst;
          const forPercent = totalVotes > 0 ? (proposal.votesFor / totalVotes) * 100 : 0;
          const hasVoted = votes[proposal.id];
          const isEnded = proposal.endTime < Date.now();

          return (
            <TouchableOpacity
              key={proposal.id}
              style={styles.proposalCard}
              onPress={() => setExpandedId(isExpanded ? null : proposal.id)}
              activeOpacity={0.8}
            >
              <View style={styles.proposalHeader}>
                <View style={[styles.statusBadge, { backgroundColor: `${getStatusColor(proposal.status)}20` }]}>
                  <View style={[styles.statusDot, { backgroundColor: getStatusColor(proposal.status) }]} />
                  <Text style={[styles.statusText, { color: getStatusColor(proposal.status) }]}>
                    {getStatusLabel(proposal.status)}
                  </Text>
                </View>
                {!isEnded && (
                  <Text style={styles.timeLeft}>{formatTimeLeft(proposal.endTime)}</Text>
                )}
              </View>

              <Text style={styles.proposalTitle}>{proposal.title}</Text>
              <Text style={styles.proposalDesc} numberOfLines={isExpanded ? undefined : 2}>
                {proposal.description}
              </Text>

              {/* Vote Bar */}
              <View style={styles.voteBarContainer}>
                <View style={[styles.voteBar, { width: `${forPercent}%`, backgroundColor: Colors.success }]} />
              </View>
              <View style={styles.voteCounts}>
                <Text style={styles.voteFor}>{formatNumber(proposal.votesFor)} FOR</Text>
                <Text style={styles.voteAgainst}>{formatNumber(proposal.votesAgainst)} AGAINST</Text>
              </View>

              {/* Voting Buttons */}
              {proposal.status === 'active' && !isEnded && (
                <View style={styles.voteButtons}>
                  <TouchableOpacity
                    style={[
                      styles.voteButton,
                      styles.voteForButton,
                      hasVoted === 'for' && styles.voteForActive,
                    ]}
                    onPress={() => handleVote(proposal.id, 'for')}
                  >
                    <Icon name="thumbs-up" size={18} color={hasVoted === 'for' ? Colors.textInverse : Colors.success} />
                    <Text style={[styles.voteButtonText, hasVoted === 'for' && { color: Colors.textInverse }]}>
                      {hasVoted === 'for' ? 'Voted For' : 'Vote For'}
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[
                      styles.voteButton,
                      styles.voteAgainstButton,
                      hasVoted === 'against' && styles.voteAgainstActive,
                    ]}
                    onPress={() => handleVote(proposal.id, 'against')}
                  >
                    <Icon name="thumbs-down" size={18} color={hasVoted === 'against' ? Colors.textInverse : Colors.error} />
                    <Text style={[styles.voteButtonText, hasVoted === 'against' && { color: Colors.textInverse }]}>
                      {hasVoted === 'against' ? 'Voted Against' : 'Vote Against'}
                    </Text>
                  </TouchableOpacity>
                </View>
              )}
            </TouchableOpacity>
          );
        })}

        {/* Create Proposal CTA */}
        <View style={styles.ctaCard}>
          <Icon name="create" size={32} color={Colors.solana.purple} />
          <Text style={styles.ctaTitle}>Have an idea?</Text>
          <Text style={styles.ctaDesc}>
            Hold at least 1,000 AURA to create a new governance proposal.
          </Text>
          <TouchableOpacity style={styles.ctaButton}>
            <Text style={styles.ctaButtonText}>Create Proposal</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  scrollView: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.screen,
    paddingTop: spacing.lg,
    paddingBottom: spacing.md,
  },
  title: {
    ...typography.h2,
    color: Colors.textPrimary,
  },
  subtitle: {
    ...typography.bodySmall,
    color: Colors.textMuted,
    marginTop: 4,
  },
  powerBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: `${Colors.solana.purple}15`,
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: borderRadius.md,
    gap: 4,
  },
  powerText: {
    ...typography.caption,
    color: Colors.solana.purple,
    fontWeight: '600',
  },
  statsRow: {
    flexDirection: 'row',
    gap: spacing.md,
    paddingHorizontal: spacing.screen,
    marginBottom: spacing.xl,
  },
  statCard: {
    flex: 1,
    backgroundColor: Colors.surface,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.cardBorder,
  },
  statValue: {
    ...typography.h3,
    color: Colors.textPrimary,
    marginBottom: 4,
  },
  statLabel: {
    ...typography.caption,
    color: Colors.textMuted,
  },
  sectionTitle: {
    ...typography.h4,
    color: Colors.textPrimary,
    paddingHorizontal: spacing.screen,
    marginBottom: spacing.md,
  },
  proposalCard: {
    backgroundColor: Colors.surface,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    marginHorizontal: spacing.screen,
    marginBottom: spacing.lg,
    borderWidth: 1,
    borderColor: Colors.cardBorder,
  },
  proposalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: borderRadius.sm,
    gap: 6,
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  statusText: {
    ...typography.caption,
    fontWeight: '600',
  },
  timeLeft: {
    ...typography.caption,
    color: Colors.textMuted,
  },
  proposalTitle: {
    ...typography.h4,
    color: Colors.textPrimary,
    marginBottom: spacing.sm,
  },
  proposalDesc: {
    ...typography.bodySmall,
    color: Colors.textSecondary,
    lineHeight: 20,
    marginBottom: spacing.lg,
  },
  voteBarContainer: {
    height: 6,
    backgroundColor: Colors.errorBg,
    borderRadius: 3,
    overflow: 'hidden',
    marginBottom: spacing.sm,
  },
  voteBar: {
    height: '100%',
    borderRadius: 3,
  },
  voteCounts: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: spacing.md,
  },
  voteFor: {
    ...typography.caption,
    color: Colors.success,
    fontWeight: '600',
  },
  voteAgainst: {
    ...typography.caption,
    color: Colors.error,
    fontWeight: '600',
  },
  voteButtons: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  voteButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderRadius: borderRadius.md,
    gap: 6,
    borderWidth: 1,
  },
  voteForButton: {
    backgroundColor: Colors.successBg,
    borderColor: `${Colors.success}40`,
  },
  voteForActive: {
    backgroundColor: Colors.success,
    borderColor: Colors.success,
  },
  voteAgainstButton: {
    backgroundColor: Colors.errorBg,
    borderColor: `${Colors.error}40`,
  },
  voteAgainstActive: {
    backgroundColor: Colors.error,
    borderColor: Colors.error,
  },
  voteButtonText: {
    ...typography.label,
    color: Colors.textPrimary,
  },
  ctaCard: {
    backgroundColor: Colors.surface,
    borderRadius: borderRadius.lg,
    padding: spacing.xxl,
    marginHorizontal: spacing.screen,
    marginTop: spacing.lg,
    marginBottom: spacing.xxxl,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.cardBorder,
    borderStyle: 'dashed',
  },
  ctaTitle: {
    ...typography.h4,
    color: Colors.textPrimary,
    marginTop: spacing.md,
    marginBottom: spacing.sm,
  },
  ctaDesc: {
    ...typography.bodySmall,
    color: Colors.textSecondary,
    textAlign: 'center',
    marginBottom: spacing.lg,
    lineHeight: 20,
  },
  ctaButton: {
    backgroundColor: Colors.solana.purple,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.xl,
    borderRadius: borderRadius.md,
  },
  ctaButtonText: {
    ...typography.label,
    color: Colors.textInverse,
  },
});
