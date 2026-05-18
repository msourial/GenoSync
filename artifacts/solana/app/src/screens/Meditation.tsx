import React, { useCallback, useState } from 'react';
import { Alert, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import MeditationMode from '../components/MeditationMode';
import { BrainwaveVisualizer } from '../components/BrainwaveVisualizer';
import { Colors } from '../theme/colors';
import { borderRadius, shadows, spacing, typography } from '../theme/tokens';

const MeditationModeAny = MeditationMode as React.ComponentType<{
  onComplete?: () => void;
}>;

const BrainwaveVisualizerAny = BrainwaveVisualizer as React.ComponentType<{
  isActive?: boolean;
}>;

export const Meditation: React.FC = () => {
  const [isSessionComplete, setIsSessionComplete] = useState(false);

  const handleComplete = useCallback(() => {
    setIsSessionComplete(true);
  }, []);

  const handleMintReceipt = useCallback(() => {
    Alert.alert('Mint Receipt', 'Receipt mint flow will be connected in a follow-up task.');
  }, []);

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <View style={styles.header}>
        <Text style={styles.title}>Meditation</Text>
        <Text style={styles.subtitle}>Calm your nervous system and improve recovery</Text>
      </View>

      <View style={styles.visualizerCard}>
        <BrainwaveVisualizerAny isActive={!isSessionComplete} />
      </View>

      <View style={styles.modeContainer}>
        <MeditationModeAny onComplete={handleComplete} />
      </View>

      {isSessionComplete ? (
        <View style={styles.footer}>
          <TouchableOpacity style={styles.mintButton} onPress={handleMintReceipt} activeOpacity={0.85}>
            <Text style={styles.mintButtonText}>Mint Receipt</Text>
          </TouchableOpacity>
        </View>
      ) : null}
    </SafeAreaView>
  );
};

export default Meditation;

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  header: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.sm,
    paddingBottom: spacing.md,
  },
  title: {
    ...(typography.h1 as object),
    color: Colors.textPrimary,
  },
  subtitle: {
    ...(typography.body as object),
    color: Colors.textSecondary,
    marginTop: spacing.xs,
  },
  visualizerCard: {
    marginHorizontal: spacing.lg,
    marginBottom: spacing.md,
    backgroundColor: Colors.surface,
    borderRadius: borderRadius.xl,
    padding: spacing.md,
    ...shadows.glow,
  },
  modeContainer: {
    flex: 1,
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.md,
  },
  footer: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.lg,
    paddingTop: spacing.sm,
  },
  mintButton: {
    backgroundColor: Colors.solana.purple,
    borderRadius: borderRadius.lg,
    paddingVertical: spacing.md,
    alignItems: 'center',
    justifyContent: 'center',
    ...shadows.sm,
  },
  mintButtonText: {
    ...typography.body,
    fontWeight: '700',
    color: Colors.textPrimary,
  },
});
