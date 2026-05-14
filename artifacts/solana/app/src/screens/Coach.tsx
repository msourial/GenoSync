import React, { useCallback, useMemo, useState } from 'react';
import {
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import AuraChat from '../components/AuraChat';
import { Colors } from '../theme/colors';
import { borderRadius, shadows, spacing, typography } from '../theme/tokens';

const SUGGESTED_PROMPTS = [
  'How can I improve my HRV?',
  'Suggest a 5-min break',
  'I feel stressed after meetings',
  'What should I do before sleep?',
];

const CANNED_RESPONSES: Record<string, string> = {
  'How can I improve my HRV?':
    'Try 4-7-8 breathing for 3 minutes, reduce late caffeine, and add a short evening walk. Consistency across sleep and hydration helps HRV most.',
  'Suggest a 5-min break':
    'Do this reset: 60s neck rolls, 60s shoulder mobility, 90s box breathing (4-4-4-4), then 90s brisk hallway walk.',
  'I feel stressed after meetings':
    'After each meeting, run a 2-minute decompression: inhale 4s, exhale 6s, then one posture reset and 30 seconds of eye relaxation.',
  'What should I do before sleep?':
    'Keep lights dim, avoid heavy food and screens in the last hour, and do 5 minutes of slow breathing to shift into recovery mode.',
};

const AuraChatAny = AuraChat as React.ComponentType<{
  onSend?: (message: string) => Promise<string>;
  initialPrompt?: string;
}>;

export const Coach: React.FC = () => {
  const [seedPrompt, setSeedPrompt] = useState<string>('');

  const handleSend = useCallback(async (message: string): Promise<string> => {
    const key = Object.keys(CANNED_RESPONSES).find(
      (k) => k.toLowerCase() === message.trim().toLowerCase(),
    );

    if (key) {
      return CANNED_RESPONSES[key];
    }

    return 'Great question. Try a short breath reset now, then we can tune your next session based on HRV and strain trends.';
  }, []);

  const chips = useMemo(
    () =>
      SUGGESTED_PROMPTS.map((prompt) => (
        <TouchableOpacity
          key={prompt}
          style={styles.chip}
          onPress={() => {
            setSeedPrompt(prompt);
            Alert.alert('Prompt ready', 'Added to coach context. Ask it in chat.');
          }}
          activeOpacity={0.8}
        >
          <Text style={styles.chipText}>{prompt}</Text>
        </TouchableOpacity>
      )),
    [],
  );

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <View style={styles.header}>
        <Text style={styles.title}>Aura Coach</Text>
        <Text style={styles.subtitle}>Personalized recovery and performance guidance</Text>
      </View>

      <View style={styles.chipsSection}>
        <Text style={styles.sectionLabel}>Suggested prompts</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipsRow}>
          {chips}
        </ScrollView>
      </View>

      <View style={styles.chatContainer}>
        <AuraChatAny onSend={handleSend} initialPrompt={seedPrompt} />
      </View>
    </SafeAreaView>
  );
};

export default Coach;

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
  chipsSection: {
    paddingBottom: spacing.sm,
  },
  sectionLabel: {
    ...(typography.caption as object),
    color: Colors.textSecondary,
    marginBottom: spacing.xs,
    paddingHorizontal: spacing.lg,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  chipsRow: {
    paddingHorizontal: spacing.lg,
    gap: spacing.sm,
  },
  chip: {
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: 'rgba(148, 163, 184, 0.25)',
    borderRadius: borderRadius.lg,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    ...shadows.sm,
  },
  chipText: {
    ...(typography.caption as object),
    color: Colors.textPrimary,
  },
  chatContainer: {
    flex: 1,
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.md,
  },
});
