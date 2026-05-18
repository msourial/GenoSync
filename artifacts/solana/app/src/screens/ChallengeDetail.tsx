import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Alert,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { Colors } from '../theme/colors';
import { borderRadius, shadows, spacing, typography } from '../theme/tokens';
import {
  ChallengeStatus,
  useChallengesStore,
} from '../stores/challengesStore';
import { useMobileWallet } from '../solana/MobileWalletAdapter';

type ChallengeLike = {
  pda?: string;
  address?: string;
  id?: string;
  creator?: string;
  creatorPubkey?: string;
  opponent?: string;
  opponentPubkey?: string;
  wager?: number;
  metric?: unknown;
  target?: number;
  status?: unknown;
  expiry?: number;
  expiresAt?: number;
  creatorScore?: number;
  opponentScore?: number;
  scoreCreator?: number;
  scoreOpponent?: number;
  scores?: {
    creator?: number;
    opponent?: number;
  };
};

type RouteParams = {
  params?: {
    pda?: string;
  };
};

const formatPubkey = (value?: string | null): string => {
  if (!value) return 'Unknown';
  if (value.length <= 10) return value;
  return `${value.slice(0, 4)}...${value.slice(-4)}`;
};

const normalize = (value: unknown): string => String(value ?? '').toLowerCase();

const metricLabel = (metric: unknown): string => {
  const m = normalize(metric);
  if (m.includes('hrv')) return 'HRV';
  if (m.includes('strain')) return 'Strain';
  if (m.includes('focus')) return 'Focus';
  if (m.includes('steps')) return 'Steps';
  if (m.includes('apm')) return 'APM';
  return String(metric ?? 'Metric');
};

const getExpiryMs = (challenge?: ChallengeLike | null): number => {
  if (!challenge) return 0;
  const raw = challenge.expiresAt ?? challenge.expiry ?? 0;
  if (!raw) return 0;
  if (raw > 1_000_000_000_000) return raw;
  return raw * 1000;
};

const getRemainingLabel = (challenge?: ChallengeLike | null): string => {
  const expiryMs = getExpiryMs(challenge);
  if (!expiryMs) return 'No expiry';
  const diff = expiryMs - Date.now();
  if (diff <= 0) return 'Expired';

  const mins = Math.floor(diff / 60000);
  const hours = Math.floor(mins / 60);
  const days = Math.floor(hours / 24);

  if (days > 0) return `${days}d ${hours % 24}h remaining`;
  if (hours > 0) return `${hours}h ${mins % 60}m remaining`;
  return `${mins}m remaining`;
};

const getStatus = (challenge?: ChallengeLike | null): string => normalize(challenge?.status);

export default function ChallengeDetailScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<any>>();
  const route = useRoute() as RouteParams;
  const pda = route.params?.pda;
  const { walletAddress } = useMobileWallet();

  const {
    challenges,
    isLoading,
    refresh,
    accept,
    submitScore,
    settle,
    cancel,
  } = useChallengesStore();

  const [scoreInput, setScoreInput] = useState('');
  const [isActing, setIsActing] = useState(false);

  const challenge = useMemo(() => {
    const list = (challenges ?? []) as ChallengeLike[];
    return list.find((c) => (c.pda ?? c.address ?? c.id) === pda) ?? null;
  }, [challenges, pda]);

  const creator = challenge?.creatorPubkey ?? challenge?.creator;
  const opponent = challenge?.opponentPubkey ?? challenge?.opponent;

  const walletLower = (walletAddress ?? '').toLowerCase();
  const creatorIsMe = !!creator && creator.toLowerCase() === walletLower;
  const opponentIsMe = !!opponent && opponent.toLowerCase() === walletLower;
  const isParticipant = creatorIsMe || opponentIsMe;

  const creatorScore = challenge?.creatorScore ?? challenge?.scoreCreator ?? challenge?.scores?.creator ?? 0;
  const opponentScore = challenge?.opponentScore ?? challenge?.scoreOpponent ?? challenge?.scores?.opponent ?? 0;

  const status = getStatus(challenge);
  const isPending = status.includes('pending') || status.includes('open') || status.includes('created') || status === normalize(ChallengeStatus?.Pending);
  const isActive = status.includes('active') || status === normalize(ChallengeStatus?.Active);
  const isAwaitingScores = status.includes('await') || status === normalize(ChallengeStatus?.AwaitingScores);
  const isSettled = status.includes('settled') || status === normalize(ChallengeStatus?.Settled);

  const load = useCallback(async () => {
    try {
      await refresh();
    } catch (e) {
      Alert.alert('Failed to refresh', e instanceof Error ? e.message : 'Please try again.');
    }
  }, [refresh]);

  useEffect(() => {
    void load();
  }, [load]);

  const withAction = useCallback(
    async (fn: () => Promise<void>) => {
      try {
        setIsActing(true);
        await fn();
        await refresh();
      } catch (e) {
        Alert.alert('Action failed', e instanceof Error ? e.message : 'Please try again.');
      } finally {
        setIsActing(false);
      }
    },
    [refresh],
  );

  const handleAccept = useCallback(async () => {
    if (!pda) return;
    await withAction(async () => {
      await accept(pda);
    });
  }, [accept, pda, withAction]);

  const handleSubmitScore = useCallback(async () => {
    if (!pda) return;
    const parsed = Number(scoreInput);
    if (!Number.isFinite(parsed) || parsed < 0) {
      Alert.alert('Invalid score', 'Enter a valid non-negative score.');
      return;
    }
    await withAction(async () => {
      await submitScore(pda, parsed);
      setScoreInput('');
    });
  }, [pda, scoreInput, submitScore, withAction]);

  const handleSettle = useCallback(async () => {
    if (!pda) return;
    await withAction(async () => {
      await settle(pda);
    });
  }, [pda, settle, withAction]);

  const handleCancel = useCallback(async () => {
    if (!pda) return;
    Alert.alert('Cancel challenge?', 'This cannot be undone.', [
      { text: 'No', style: 'cancel' },
      {
        text: 'Cancel Challenge',
        style: 'destructive',
        onPress: () => {
          void withAction(async () => {
            await cancel(pda);
            navigation.goBack();
          });
        },
      },
    ]);
  }, [cancel, navigation, pda, withAction]);

  if (!pda) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.centered}>
          <Text style={styles.errorTitle}>Challenge not found</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.title}>Challenge Detail</Text>

        <View style={styles.matchCard}>
          <View style={styles.rowBetween}>
            <View style={styles.playerCol}>
              <View style={styles.avatar}><Text style={styles.avatarText}>C</Text></View>
              <Text style={styles.playerLabel}>Creator</Text>
              <Text style={styles.playerKey}>{formatPubkey(creator)}</Text>
              <Text style={styles.playerScore}>{creatorScore}</Text>
            </View>

            <View style={styles.vsWrap}>
              <Text style={styles.vs}>VS</Text>
            </View>

            <View style={styles.playerCol}>
              <View style={[styles.avatar, styles.avatarOpponent]}><Text style={styles.avatarText}>O</Text></View>
              <Text style={styles.playerLabel}>Opponent</Text>
              <Text style={styles.playerKey}>{formatPubkey(opponent)}</Text>
              <Text style={styles.playerScore}>{opponentScore}</Text>
            </View>
          </View>
        </View>

        <View style={styles.infoCard}>
          <InfoRow label="Wager" value={`${challenge?.wager ?? 0} AURA`} />
          <InfoRow label="Metric" value={metricLabel(challenge?.metric)} />
          <InfoRow label="Target" value={String(challenge?.target ?? '--')} />
          <InfoRow label="Time" value={getRemainingLabel(challenge)} />
          <InfoRow label="Status" value={String(challenge?.status ?? 'Unknown')} />
        </View>

        {isActive && isParticipant ? (
          <View style={styles.scoreInputWrap}>
            <Text style={styles.scoreInputLabel}>Submit your score</Text>
            <TextInput
              value={scoreInput}
              onChangeText={setScoreInput}
              keyboardType="numeric"
              placeholder="Enter score"
              placeholderTextColor={Colors.textSecondary}
              style={styles.input}
            />
          </View>
        ) : null}
      </ScrollView>

      <View style={styles.bottomActions}>
        {isPending && creatorIsMe ? (
          <TouchableOpacity
            style={[styles.secondaryButton, isActing && styles.buttonDisabled]}
            onPress={handleCancel}
            disabled={isActing || isLoading}
          >
            <Text style={styles.secondaryButtonText}>Cancel</Text>
          </TouchableOpacity>
        ) : null}

        {isPending && opponentIsMe ? (
          <ActionButton label="Accept" onPress={handleAccept} loading={isActing || isLoading} />
        ) : null}

        {isActive && isParticipant ? (
          <ActionButton label="Submit Score" onPress={handleSubmitScore} loading={isActing || isLoading} />
        ) : null}

        {isAwaitingScores ? (
          <ActionButton label="Settle" onPress={handleSettle} loading={isActing || isLoading} />
        ) : null}

        {isSettled ? <ActionButton label="View Result" onPress={() => {}} loading={false} disabled /> : null}
      </View>
    </SafeAreaView>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.infoRow}>
      <Text style={styles.infoLabel}>{label}</Text>
      <Text style={styles.infoValue}>{value}</Text>
    </View>
  );
}

function ActionButton({
  label,
  onPress,
  loading,
  disabled,
}: {
  label: string;
  onPress: () => void;
  loading?: boolean;
  disabled?: boolean;
}) {
  return (
    <TouchableOpacity
      style={[styles.primaryButton, (loading || disabled) && styles.buttonDisabled]}
      onPress={onPress}
      disabled={loading || disabled}
      activeOpacity={0.85}
    >
      <Text style={styles.primaryButtonText}>{loading ? 'Processing...' : label}</Text>
      {!loading ? <Ionicons name="arrow-forward" size={16} color={Colors.textPrimary} /> : null}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  content: {
    padding: spacing.lg,
    paddingBottom: 140,
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  title: {
    ...typography.h1,
    color: Colors.textPrimary,
    marginBottom: spacing.md,
  },
  errorTitle: {
    ...typography.h3,
    color: Colors.textPrimary,
  },
  matchCard: {
    backgroundColor: Colors.surface,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    ...shadows.sm,
  },
  rowBetween: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  playerCol: {
    alignItems: 'center',
    width: '40%',
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: Colors.solana.purple,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.xs,
  },
  avatarOpponent: {
    backgroundColor: Colors.solana.green,
  },
  avatarText: {
    color: Colors.textPrimary,
    fontWeight: '700',
  },
  playerLabel: {
    ...typography.caption,
    color: Colors.textSecondary,
  },
  playerKey: {
    ...typography.body,
    color: Colors.textPrimary,
    marginTop: 2,
  },
  playerScore: {
    ...typography.h2,
    color: Colors.textPrimary,
    marginTop: spacing.xs,
  },
  vsWrap: {
    width: '20%',
    alignItems: 'center',
  },
  vs: {
    ...typography.h3,
    color: Colors.textSecondary,
    fontWeight: '700',
  },
  infoCard: {
    marginTop: spacing.md,
    backgroundColor: Colors.surface,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: spacing.xs,
  },
  infoLabel: {
    ...typography.body,
    color: Colors.textSecondary,
  },
  infoValue: {
    ...typography.body,
    color: Colors.textPrimary,
    fontWeight: '600',
  },
  scoreInputWrap: {
    marginTop: spacing.md,
  },
  scoreInputLabel: {
    ...typography.body,
    color: Colors.textSecondary,
    marginBottom: spacing.xs,
  },
  input: {
    backgroundColor: Colors.surface,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: '#1F2937',
    color: Colors.textPrimary,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  bottomActions: {
    position: 'absolute',
    left: spacing.lg,
    right: spacing.lg,
    bottom: spacing.lg,
    gap: spacing.sm,
  },
  primaryButton: {
    backgroundColor: Colors.solana.purple,
    borderRadius: borderRadius.md,
    paddingVertical: spacing.md,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: spacing.xs,
    ...shadows.glow,
  },
  primaryButtonText: {
    ...typography.body,
    color: Colors.textPrimary,
    fontWeight: '700',
  },
  secondaryButton: {
    backgroundColor: '#1F2937',
    borderRadius: borderRadius.md,
    paddingVertical: spacing.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  secondaryButtonText: {
    ...typography.body,
    color: '#FCA5A5',
    fontWeight: '700',
  },
  buttonDisabled: {
    opacity: 0.6,
  },
});
