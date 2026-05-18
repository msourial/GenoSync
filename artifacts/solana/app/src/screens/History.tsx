import React, { useMemo } from 'react';
import {
  ActivityIndicator,
  FlatList,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';

import { useHistory } from '../hooks/useHistory';
import type { SessionRecord } from '../types';
import { Colors } from '../theme/colors';
import { borderRadius, shadows, spacing, typography } from '../theme/tokens';

function gradeColor(grade: SessionRecord['grade']): string {
  switch (grade) {
    case 'S':
      return '#22C55E';
    case 'A':
      return '#06B6D4';
    case 'B':
      return '#6366F1';
    case 'C':
      return '#F59E0B';
    default:
      return '#EF4444';
  }
}

function formatDuration(minutes: number): string {
  const hrs = Math.floor(minutes / 60);
  const mins = minutes % 60;
  if (hrs === 0) return `${mins}m`;
  return `${hrs}h ${mins}m`;
}

const History: React.FC = () => {
  const { records, loading } = useHistory();

  const totals = useMemo(() => {
    if (records.length === 0) {
      return { totalAura: 0, totalDuration: 0, avgHrv: 0 };
    }

    const totalAura = records.reduce((sum, rec) => sum + rec.auraEarned, 0);
    const totalDuration = records.reduce((sum, rec) => sum + rec.duration, 0);
    const avgHrv = records.reduce((sum, rec) => sum + rec.hrv, 0) / records.length;

    return { totalAura, totalDuration, avgHrv };
  }, [records]);

  const renderRecord = ({ item }: { item: SessionRecord }) => {
    const tint = gradeColor(item.grade);

    return (
      <View style={styles.recordCard}>
        <View style={styles.rowTop}>
          <View>
            <Text style={styles.date}>{item.date}</Text>
            <Text style={styles.duration}>{formatDuration(item.duration)} • HRV {item.hrv}</Text>
          </View>
          <View style={[styles.gradeBadge, { backgroundColor: `${tint}22`, borderColor: tint }]}>
            <Text style={[styles.gradeText, { color: tint }]}>{item.grade}</Text>
          </View>
        </View>

        <View style={styles.metricsRow}>
          <Text style={styles.metricLabel}>Strain: <Text style={styles.metricValue}>{item.strain}</Text></Text>
          <Text style={styles.metricLabel}>AURA: <Text style={styles.metricValue}>{item.auraEarned}</Text></Text>
        </View>

        {item.challenges.length > 0 ? (
          <View style={styles.challengesRow}>
            {item.challenges.map((challenge) => (
              <View key={`${item.id}-${challenge}`} style={styles.challengeBadge}>
                <Text style={styles.challengeText}>{challenge}</Text>
              </View>
            ))}
          </View>
        ) : null}
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Session History</Text>
        <Ionicons name="time-outline" size={20} color={Colors.solana.green} />
      </View>

      <View style={styles.summaryRow}>
        <View style={styles.summaryCard}>
          <Text style={styles.summaryLabel}>Total AURA</Text>
          <Text style={styles.summaryValue}>{totals.totalAura.toFixed(0)}</Text>
        </View>
        <View style={styles.summaryCard}>
          <Text style={styles.summaryLabel}>Duration</Text>
          <Text style={styles.summaryValue}>{formatDuration(totals.totalDuration)}</Text>
        </View>
        <View style={styles.summaryCard}>
          <Text style={styles.summaryLabel}>Avg HRV</Text>
          <Text style={styles.summaryValue}>{totals.avgHrv.toFixed(1)}</Text>
        </View>
      </View>

      {loading && records.length === 0 ? (
        <View style={styles.loaderWrap}>
          <ActivityIndicator color={Colors.solana.green} />
        </View>
      ) : null}

      {!loading && records.length === 0 ? (
        <View style={styles.emptyWrap}>
          <Ionicons name="albums-outline" size={34} color={Colors.textSecondary} />
          <Text style={styles.emptyTitle}>No session history yet</Text>
        </View>
      ) : null}

      <FlatList
        data={records}
        renderItem={renderRecord}
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
  title: {
    color: Colors.textPrimary,
    ...typography.h1,
  },
  summaryRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginBottom: spacing.lg,
  },
  summaryCard: {
    flex: 1,
    backgroundColor: Colors.surface,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    ...shadows.sm,
  },
  summaryLabel: {
    color: Colors.textSecondary,
    ...typography.caption,
  },
  summaryValue: {
    marginTop: spacing.xs,
    color: Colors.textPrimary,
    ...typography.body,
    fontWeight: '700',
  },
  listContent: {
    paddingBottom: spacing.xxxl,
    gap: spacing.md,
  },
  recordCard: {
    backgroundColor: Colors.surface,
    borderRadius: borderRadius.xl,
    padding: spacing.lg,
    marginBottom: spacing.md,
    ...shadows.sm,
  },
  rowTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  date: {
    color: Colors.textPrimary,
    ...typography.h2,
  },
  duration: {
    color: Colors.textSecondary,
    ...typography.caption,
    marginTop: spacing.xs,
  },
  gradeBadge: {
    borderWidth: 1,
    borderRadius: borderRadius.md,
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
  },
  gradeText: {
    fontSize: 12,
    fontWeight: '800',
  },
  metricsRow: {
    marginTop: spacing.md,
    flexDirection: 'row',
    gap: spacing.lg,
  },
  metricLabel: {
    color: Colors.textSecondary,
    ...typography.caption,
  },
  metricValue: {
    color: Colors.textPrimary,
    fontWeight: '700',
  },
  challengesRow: {
    marginTop: spacing.md,
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
  },
  challengeBadge: {
    backgroundColor: '#1f2937',
    borderRadius: borderRadius.md,
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
  },
  challengeText: {
    color: Colors.textSecondary,
    ...typography.caption,
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

export default History;
