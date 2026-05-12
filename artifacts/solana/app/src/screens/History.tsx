import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  FlatList,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/Ionicons';
import { Colors } from '../theme/colors';
import { spacing, typography, borderRadius } from '../theme/tokens';

interface SessionRecord {
  id: string;
  date: string;
  duration: number;
  grade: 'S' | 'A' | 'B' | 'C' | 'D';
  hrv: number;
  strain: number;
  auraEarned: number;
  challenges: string[];
}

const MOCK_HISTORY: SessionRecord[] = [
  {
    id: '1',
    date: '2026-05-09',
    duration: 1800,
    grade: 'S',
    hrv: 72,
    strain: 15,
    auraEarned: 150,
    challenges: ['Posture', 'Hydration', 'Breathing'],
  },
  {
    id: '2',
    date: '2026-05-08',
    duration: 1500,
    grade: 'A',
    hrv: 65,
    strain: 22,
    auraEarned: 100,
    challenges: ['Stretch', 'Movement'],
  },
  {
    id: '3',
    date: '2026-05-07',
    duration: 1200,
    grade: 'B',
    hrv: 58,
    strain: 35,
    auraEarned: 50,
    challenges: ['Hydration'],
  },
  {
    id: '4',
    date: '2026-05-06',
    duration: 2100,
    grade: 'S',
    hrv: 74,
    strain: 12,
    auraEarned: 150,
    challenges: ['Posture', 'Meditation', 'Stretch'],
  },
];

export const HistoryScreen: React.FC = () => {
  const [filter, setFilter] = useState<'all' | 'S' | 'A' | 'B'>('all');

  const filtered = filter === 'all'
    ? MOCK_HISTORY
    : MOCK_HISTORY.filter((s) => s.grade === filter);

  const totalAura = MOCK_HISTORY.reduce((sum, s) => sum + s.auraEarned, 0);
  const totalTime = MOCK_HISTORY.reduce((sum, s) => sum + s.duration, 0);
  const sGrades = MOCK_HISTORY.filter((s) => s.grade === 'S').length;

  const getGradeColor = (grade: string) => {
    switch (grade) {
      case 'S': return Colors.grades.S;
      case 'A': return Colors.grades.A;
      case 'B': return Colors.grades.B;
      case 'C': return Colors.grades.C;
      default: return Colors.grades.D;
    }
  };

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    return `${mins}m`;
  };

  const renderSession = ({ item }: { item: SessionRecord }) => (
    <View style={styles.sessionCard}>
      <View style={styles.sessionHeader}>
        <View style={styles.dateSection}>
          <Text style={styles.sessionDate}>{item.date}</Text>
          <Text style={styles.sessionDuration}>{formatDuration(item.duration)}</Text>
        </View>
        <View style={[styles.gradeBadge, { backgroundColor: `${getGradeColor(item.grade)}20` }]}>
          <Text style={[styles.gradeText, { color: getGradeColor(item.grade) }]}>
            {item.grade}
          </Text>
        </View>
      </View>

      <View style={styles.biometrics}>
        <BioStat icon="heart" label="HRV" value={`${item.hrv}ms`} color={Colors.error} />
        <BioStat icon="flash" label="Strain" value={`${item.strain}%`} color={Colors.warning} />
        <BioStat icon="logo-solana" label="Earned" value={`${item.auraEarned} AURA`} color={Colors.solana.purple} />
      </View>

      <View style={styles.challenges}>
        {item.challenges.map((challenge) => (
          <View key={challenge} style={styles.challengeBadge}>
            <Text style={styles.challengeText}>{challenge}</Text>
          </View>
        ))}
      </View>
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <FlatList
        data={filtered}
        renderItem={renderSession}
        keyExtractor={(item) => item.id}
        ListHeaderComponent={
          <>
            <View style={styles.header}>
              <Text style={styles.title}>History</Text>
              <Text style={styles.subtitle}>Your wellness journey</Text>
            </View>

            {/* Summary Stats */}
            <View style={styles.statsRow}>
              <SummaryCard icon="time" label="Total Time" value={`${Math.floor(totalTime / 3600)}h`} color={Colors.info} />
              <SummaryCard icon="logo-solana" label="AURA Earned" value={`${totalAura}`} color={Colors.solana.purple} />
              <SummaryCard icon="trophy" label="S-Grades" value={`${sGrades}`} color={Colors.accent} />
            </View>

            {/* Filters */}
            <View style={styles.filterRow}>
              {(['all', 'S', 'A', 'B'] as const).map((f) => (
                <TouchableOpacity
                  key={f}
                  style={[styles.filterChip, filter === f && styles.filterChipActive]}
                  onPress={() => setFilter(f)}
                >
                  <Text style={[styles.filterChipText, filter === f && styles.filterChipTextActive]}>
                    {f === 'all' ? 'All' : `Grade ${f}`}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </>
        }
        contentContainerStyle={styles.listContent}
      />
    </SafeAreaView>
  );
};

const SummaryCard: React.FC<{ icon: string; label: string; value: string; color: string }> = ({
  icon,
  label,
  value,
  color,
}) => (
  <View style={[styles.summaryCard, { borderColor: `${color}30` }]}>
    <Icon name={icon} size={20} color={color} />
    <Text style={styles.summaryValue}>{value}</Text>
    <Text style={styles.summaryLabel}>{label}</Text>
  </View>
);

const BioStat: React.FC<{ icon: string; label: string; value: string; color: string }> = ({
  icon,
  label,
  value,
  color,
}) => (
  <View style={styles.bioStat}>
    <Icon name={icon} size={14} color={color} />
    <Text style={styles.bioStatLabel}>{label}</Text>
    <Text style={[styles.bioStatValue, { color }]}>{value}</Text>
  </View>
);

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  listContent: {
    paddingHorizontal: spacing.screen,
    paddingBottom: spacing.xxxl,
  },
  header: {
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
  statsRow: {
    flexDirection: 'row',
    gap: spacing.md,
    marginBottom: spacing.lg,
  },
  summaryCard: {
    flex: 1,
    backgroundColor: Colors.surface,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    alignItems: 'center',
    borderWidth: 1,
  },
  summaryValue: {
    ...typography.h4,
    color: Colors.textPrimary,
    marginTop: 6,
    marginBottom: 2,
  },
  summaryLabel: {
    ...typography.caption,
    color: Colors.textMuted,
  },
  filterRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginBottom: spacing.lg,
  },
  filterChip: {
    paddingVertical: 6,
    paddingHorizontal: 14,
    borderRadius: borderRadius.md,
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.cardBorder,
  },
  filterChipActive: {
    backgroundColor: Colors.solana.purple,
    borderColor: Colors.solana.purple,
  },
  filterChipText: {
    ...typography.caption,
    color: Colors.textSecondary,
    fontWeight: '500',
  },
  filterChipTextActive: {
    color: '#fff',
  },
  sessionCard: {
    backgroundColor: Colors.surface,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: Colors.cardBorder,
  },
  sessionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  dateSection: {},
  sessionDate: {
    ...typography.body,
    color: Colors.textPrimary,
    fontWeight: '600',
  },
  sessionDuration: {
    ...typography.caption,
    color: Colors.textMuted,
    marginTop: 2,
  },
  gradeBadge: {
    paddingVertical: 6,
    paddingHorizontal: 14,
    borderRadius: borderRadius.sm,
  },
  gradeText: {
    ...typography.label,
    fontSize: 14,
  },
  biometrics: {
    flexDirection: 'row',
    gap: spacing.lg,
    marginBottom: spacing.md,
  },
  bioStat: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  bioStatLabel: {
    ...typography.caption,
    color: Colors.textMuted,
  },
  bioStatValue: {
    ...typography.caption,
    fontWeight: '600',
  },
  challenges: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  challengeBadge: {
    backgroundColor: `${Colors.solana.green}15`,
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: borderRadius.sm,
  },
  challengeText: {
    ...typography.caption,
    color: Colors.solana.green,
    fontWeight: '500',
  },
});
