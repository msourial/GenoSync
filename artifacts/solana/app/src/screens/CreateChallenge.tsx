import React, { useMemo, useState } from 'react';
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { Colors } from '../theme/colors';
import { borderRadius, shadows, spacing, typography } from '../theme/tokens';
import {
  ChallengeMetric,
  useChallengesStore,
} from '../stores/challengesStore';

const EXPIRY_OPTIONS = [1, 3, 7, 14, 30] as const;

const metricLabel = (metric: unknown): string => {
  const raw = String(metric ?? '').toLowerCase();
  if (raw.includes('hrv')) return 'HRV';
  if (raw.includes('strain')) return 'Strain';
  if (raw.includes('focus')) return 'Focus';
  if (raw.includes('steps')) return 'Steps';
  if (raw.includes('apm')) return 'APM';
  return String(metric);
};

const enumValues = (source: unknown): string[] => {
  const values = Object.values((source ?? {}) as Record<string, unknown>);
  return values.filter((v) => typeof v === 'string') as string[];
};

export default function CreateChallengeScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<any>>();
  const { create, isLoading } = useChallengesStore();

  const metrics = useMemo(() => {
    const values = enumValues(ChallengeMetric);
    return values.length > 0 ? values : ['hrv', 'strain', 'focus', 'steps', 'apm'];
  }, []);

  const [opponent, setOpponent] = useState('');
  const [metric, setMetric] = useState(metrics[0]);
  const [target, setTarget] = useState('50');
  const [wager, setWager] = useState('10');
  const [expiryDays, setExpiryDays] = useState<number>(7);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const onSubmit = async () => {
    const targetNum = Number(target);
    const wagerNum = Number(wager);

    if (!opponent.trim()) {
      Alert.alert('Missing opponent', 'Enter the opponent wallet address.');
      return;
    }
    if (!Number.isFinite(targetNum) || targetNum <= 0) {
      Alert.alert('Invalid target', 'Target must be a positive number.');
      return;
    }
    if (!Number.isFinite(wagerNum) || wagerNum < 0) {
      Alert.alert('Invalid wager', 'Wager must be 0 or greater.');
      return;
    }

    try {
      setIsSubmitting(true);
      const nowSec = Math.floor(Date.now() / 1000);
      const expiresAt = nowSec + expiryDays * 24 * 60 * 60;

      const input: any = {
        opponent: opponent.trim(),
        opponentPubkey: opponent.trim(),
        metric,
        target: targetNum,
        wager: wagerNum,
        expiryDays,
        expiresAt,
      };

      await create(input);
      navigation.goBack();
    } catch (e) {
      Alert.alert('Unable to create challenge', e instanceof Error ? e.message : 'Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          <Text style={styles.title}>Create Challenge</Text>

          <Text style={styles.label}>Opponent Public Key</Text>
          <View style={styles.rowInput}>
            <TextInput
              value={opponent}
              onChangeText={setOpponent}
              autoCapitalize="none"
              autoCorrect={false}
              placeholder="Enter opponent pubkey"
              placeholderTextColor={Colors.textSecondary}
              style={[styles.input, styles.flex]}
            />
            <TouchableOpacity
              style={styles.pasteBtn}
              onPress={() => Alert.alert('Paste', 'Long-press the input and choose Paste from your keyboard menu.')}
            >
              <Ionicons name="clipboard-outline" size={16} color={Colors.textPrimary} />
              <Text style={styles.pasteText}>Paste</Text>
            </TouchableOpacity>
          </View>

          <Text style={styles.label}>Metric</Text>
          <View style={styles.chipsWrap}>
            {metrics.map((item) => {
              const selected = metric === item;
              return (
                <TouchableOpacity
                  key={item}
                  onPress={() => setMetric(item)}
                  style={[styles.chip, selected && styles.chipActive]}
                >
                  <Text style={[styles.chipText, selected && styles.chipTextActive]}>{metricLabel(item)}</Text>
                </TouchableOpacity>
              );
            })}
          </View>

          <Text style={styles.label}>Target</Text>
          <TextInput
            value={target}
            onChangeText={setTarget}
            keyboardType="numeric"
            placeholder="e.g. 80"
            placeholderTextColor={Colors.textSecondary}
            style={styles.input}
          />

          <Text style={styles.label}>Wager (AURA)</Text>
          <TextInput
            value={wager}
            onChangeText={setWager}
            keyboardType="numeric"
            placeholder="e.g. 25"
            placeholderTextColor={Colors.textSecondary}
            style={styles.input}
          />

          <Text style={styles.label}>Expiry</Text>
          <View style={styles.chipsWrap}>
            {EXPIRY_OPTIONS.map((days) => {
              const selected = expiryDays === days;
              return (
                <TouchableOpacity
                  key={days}
                  style={[styles.chip, selected && styles.chipActive]}
                  onPress={() => setExpiryDays(days)}
                >
                  <Text style={[styles.chipText, selected && styles.chipTextActive]}>{days}d</Text>
                </TouchableOpacity>
              );
            })}
          </View>

          <TouchableOpacity
            style={[styles.submitButton, (isSubmitting || isLoading) && styles.submitButtonDisabled]}
            onPress={onSubmit}
            disabled={isSubmitting || isLoading}
            activeOpacity={0.85}
          >
            <Text style={styles.submitText}>{isSubmitting ? 'Creating...' : 'Create Challenge'}</Text>
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  content: {
    padding: spacing.lg,
    paddingBottom: spacing.xxxl,
  },
  title: {
    ...typography.h1,
    color: Colors.textPrimary,
    marginBottom: spacing.lg,
  },
  label: {
    ...typography.body,
    color: Colors.textSecondary,
    marginTop: spacing.md,
    marginBottom: spacing.xs,
    fontWeight: '600',
  },
  rowInput: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  flex: {
    flex: 1,
  },
  input: {
    backgroundColor: Colors.surface,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: '#1F2937',
    color: Colors.textPrimary,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    ...typography.body,
  },
  pasteBtn: {
    backgroundColor: '#1F2937',
    borderRadius: borderRadius.md,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.sm,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  pasteText: {
    ...typography.caption,
    color: Colors.textPrimary,
    fontWeight: '600',
  },
  chipsWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  chip: {
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: '#1F2937',
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.md,
    borderRadius: borderRadius.md,
  },
  chipActive: {
    borderColor: Colors.solana.purple,
    backgroundColor: 'rgba(153, 69, 255, 0.2)',
  },
  chipText: {
    ...typography.body,
    color: Colors.textSecondary,
    fontWeight: '600',
  },
  chipTextActive: {
    color: Colors.textPrimary,
  },
  submitButton: {
    marginTop: spacing.xl,
    backgroundColor: Colors.solana.green,
    borderRadius: borderRadius.md,
    paddingVertical: spacing.md,
    alignItems: 'center',
    justifyContent: 'center',
    ...shadows.sm,
  },
  submitButtonDisabled: {
    opacity: 0.6,
  },
  submitText: {
    ...typography.body,
    color: '#0B0F19',
    fontWeight: '800',
  },
});
