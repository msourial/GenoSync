import React, { useEffect, useMemo, useState } from 'react';
import {
  Modal,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  FlatList,
  ListRenderItem,
} from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import * as ColorModule from '../theme/colors';
import * as ThemeTokens from '../theme/tokens';

export interface Exercise {
  id: string;
  name: string;
  reps: number;
  durationSec: number;
  icon: string;
}

export const EXERCISES: Exercise[] = [
  { id: 'wrist-stretch', name: 'Wrist Stretch', reps: 8, durationSec: 30, icon: 'hand-left-outline' },
  { id: 'eye-roll', name: 'Eye Roll', reps: 10, durationSec: 25, icon: 'eye-outline' },
  { id: 'shoulder-shrug', name: 'Shoulder Shrug', reps: 12, durationSec: 35, icon: 'body-outline' },
  { id: 'deep-breath', name: 'Deep Breath', reps: 6, durationSec: 40, icon: 'leaf-outline' },
  { id: 'neck-rotation', name: 'Neck Rotation', reps: 10, durationSec: 30, icon: 'refresh-circle-outline' },
  { id: 'posture-reset', name: 'Posture Reset', reps: 5, durationSec: 45, icon: 'walk-outline' },
];

export interface ExerciseBreakModalProps {
  visible: boolean;
  onClose: () => void;
  onCompleted: (exerciseId: string) => void;
}

const palette = (((ColorModule as any).Colors ?? (ColorModule as any).default) || {}) as any;
const tokens = ThemeTokens as any;

const colors = {
  background: palette.background ?? '#000000',
  surface: palette.surface ?? '#0B0F19',
  textPrimary: palette.textPrimary ?? '#FFFFFF',
  textSecondary: palette.textSecondary ?? '#94A3B8',
  purple: palette.solana?.purple ?? '#9945FF',
  green: palette.solana?.green ?? '#14F195',
};

const spacing = tokens.spacing ?? {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
  xxxl: 32,
};

const borderRadius = tokens.borderRadius ?? {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
};

export const ExerciseBreakModal: React.FC<ExerciseBreakModalProps> = ({ visible, onClose, onCompleted }) => {
  const [activeExercise, setActiveExercise] = useState<Exercise | null>(null);
  const [remainingSec, setRemainingSec] = useState(0);

  useEffect(() => {
    if (!visible) {
      setActiveExercise(null);
      setRemainingSec(0);
    }
  }, [visible]);

  useEffect(() => {
    if (!activeExercise) {
      return;
    }

    if (remainingSec <= 0) {
      onCompleted(activeExercise.id);
      setActiveExercise(null);
      return;
    }

    const id = setTimeout(() => setRemainingSec((v) => Math.max(0, v - 1)), 1000);
    return () => clearTimeout(id);
  }, [activeExercise, remainingSec, onCompleted]);

  const startExercise = (exercise: Exercise) => {
    setActiveExercise(exercise);
    setRemainingSec(exercise.durationSec);
  };

  const headerText = useMemo(() => {
    if (activeExercise) {
      return `Do ${activeExercise.name}`;
    }
    return 'Take an Exercise Break';
  }, [activeExercise]);

  const renderItem: ListRenderItem<Exercise> = ({ item }) => (
    <TouchableOpacity style={styles.itemCard} onPress={() => startExercise(item)} activeOpacity={0.85}>
      <View style={styles.itemIconWrap}>
        <Ionicons name={item.icon as any} size={20} color={colors.green} />
      </View>
      <View style={styles.itemBody}>
        <Text style={styles.itemTitle}>{item.name}</Text>
        <Text style={styles.itemMeta}>{item.reps} reps • {item.durationSec}s</Text>
      </View>
      <Ionicons name="play" size={20} color={colors.textSecondary} />
    </TouchableOpacity>
  );

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={styles.modalCard}>
          <View style={styles.headerRow}>
            <Text style={styles.headerTitle}>{headerText}</Text>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
              <Ionicons name="close" size={20} color={colors.textSecondary} />
            </TouchableOpacity>
          </View>

          {activeExercise ? (
            <View style={styles.activeWrap}>
              <Ionicons name={activeExercise.icon as any} size={34} color={colors.purple} />
              <Text style={styles.activeName}>{activeExercise.name}</Text>
              <Text style={styles.countdown}>{remainingSec}s</Text>
              <Text style={styles.itemMeta}>Target: {activeExercise.reps} reps</Text>

              <TouchableOpacity
                style={styles.skipBtn}
                onPress={() => {
                  onCompleted(activeExercise.id);
                  setActiveExercise(null);
                }}
              >
                <Text style={styles.skipText}>Mark as Done</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <FlatList
              data={EXERCISES}
              keyExtractor={(item) => item.id}
              renderItem={renderItem}
              contentContainerStyle={styles.listContent}
              showsVerticalScrollIndicator={false}
            />
          )}
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.65)',
    justifyContent: 'center',
    padding: spacing.lg,
  },
  modalCard: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.xl,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    padding: spacing.lg,
    maxHeight: '80%',
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.lg,
  },
  headerTitle: {
    color: colors.textPrimary,
    fontSize: 18,
    fontWeight: '700',
    flexShrink: 1,
  },
  closeBtn: {
    width: 30,
    height: 30,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.06)',
    marginLeft: spacing.sm,
  },
  listContent: {
    paddingBottom: spacing.md,
    gap: spacing.sm,
  },
  itemCard: {
    backgroundColor: 'rgba(255,255,255,0.03)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  itemIconWrap: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(20,241,149,0.1)',
  },
  itemBody: {
    flex: 1,
  },
  itemTitle: {
    color: colors.textPrimary,
    fontSize: 15,
    fontWeight: '600',
  },
  itemMeta: {
    color: colors.textSecondary,
    fontSize: 12,
    marginTop: 2,
  },
  activeWrap: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.xl,
  },
  activeName: {
    color: colors.textPrimary,
    fontSize: 22,
    fontWeight: '700',
    marginTop: spacing.sm,
  },
  countdown: {
    color: colors.green,
    fontSize: 48,
    fontWeight: '800',
    marginTop: spacing.sm,
    marginBottom: spacing.sm,
  },
  skipBtn: {
    marginTop: spacing.xl,
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.md,
    backgroundColor: colors.purple,
    borderRadius: borderRadius.lg,
  },
  skipText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 15,
  },
});

export default ExerciseBreakModal;
