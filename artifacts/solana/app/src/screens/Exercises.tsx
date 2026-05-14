import React, { useMemo, useState } from 'react';
import {
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { NavigationProp, ParamListBase, useNavigation } from '@react-navigation/native';
import ExerciseBreakModal from '../components/ExerciseBreakModal';
import MovementChallenge from '../components/MovementChallenge';
import { Colors } from '../theme/colors';
import { borderRadius, shadows, spacing, typography } from '../theme/tokens';

const ExerciseBreakModalAny = ExerciseBreakModal as React.ComponentType<{
  visible?: boolean;
  onClose?: () => void;
}>;

const MovementChallengeAny = MovementChallenge as React.ComponentType<{
  onClose?: () => void;
}>;

export const Exercises: React.FC = () => {
  const navigation = useNavigation<NavigationProp<ParamListBase>>();
  const [breakVisible, setBreakVisible] = useState(false);
  const [challengeVisible, setChallengeVisible] = useState(false);

  const cards = useMemo(
    () => [
      {
        key: 'stretch',
        title: 'Take a stretch break',
        description: 'Open guided stretches to reduce stiffness and reset posture.',
        action: () => setBreakVisible(true),
      },
      {
        key: 'challenge',
        title: 'Random movement challenge',
        description: 'Launch a quick movement task to boost circulation and focus.',
        action: () => setChallengeVisible(true),
      },
      {
        key: 'breathing',
        title: 'Breathing',
        description: 'Go to meditation breathing mode for fast nervous-system reset.',
        action: () => navigation.navigate('Meditation'),
      },
    ],
    [navigation],
  );

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <View style={styles.header}>
        <Text style={styles.title}>Exercises</Text>
        <Text style={styles.subtitle}>Micro-breaks and movement boosts for your day</Text>
      </View>

      <ScrollView contentContainerStyle={styles.grid}>
        {cards.map((card) => (
          <TouchableOpacity key={card.key} style={styles.card} activeOpacity={0.88} onPress={card.action}>
            <Text style={styles.cardTitle}>{card.title}</Text>
            <Text style={styles.cardDescription}>{card.description}</Text>
            <Text style={styles.cardCta}>Open</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      <ExerciseBreakModalAny visible={breakVisible} onClose={() => setBreakVisible(false)} />

      <Modal
        visible={challengeVisible}
        animationType="slide"
        transparent
        onRequestClose={() => setChallengeVisible(false)}
      >
        <View style={styles.modalBackdrop}>
          <Pressable style={styles.backdropPressable} onPress={() => setChallengeVisible(false)} />
          <View style={styles.challengeSheet}>
            <View style={styles.sheetHeader}>
              <Text style={styles.sheetTitle}>Movement Challenge</Text>
              <TouchableOpacity onPress={() => setChallengeVisible(false)}>
                <Text style={styles.closeText}>Close</Text>
              </TouchableOpacity>
            </View>
            <MovementChallengeAny onClose={() => setChallengeVisible(false)} />
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
};

export default Exercises;

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
  grid: {
    padding: spacing.lg,
    gap: spacing.md,
  },
  card: {
    backgroundColor: Colors.surface,
    borderRadius: borderRadius.xl,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: 'rgba(148, 163, 184, 0.22)',
    ...shadows.sm,
  },
  cardTitle: {
    ...(typography.h3 as object),
    color: Colors.textPrimary,
    marginBottom: spacing.xs,
  },
  cardDescription: {
    ...(typography.body as object),
    color: Colors.textSecondary,
    marginBottom: spacing.md,
  },
  cardCta: {
    ...(typography.caption as object),
    color: Colors.solana.green,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'flex-end',
  },
  backdropPressable: {
    flex: 1,
  },
  challengeSheet: {
    backgroundColor: Colors.surface,
    borderTopLeftRadius: borderRadius.xl,
    borderTopRightRadius: borderRadius.xl,
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.xl,
    paddingTop: spacing.sm,
    minHeight: '60%',
  },
  sheetHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.sm,
    marginBottom: spacing.sm,
  },
  sheetTitle: {
    ...(typography.h3 as object),
    color: Colors.textPrimary,
  },
  closeText: {
    ...(typography.body as object),
    color: Colors.solana.purple,
  },
});
