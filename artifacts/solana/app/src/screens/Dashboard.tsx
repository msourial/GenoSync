import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Animated,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/Ionicons';
import ReactNativeHapticFeedback from 'react-native-haptic-feedback';
import { useMobileWallet } from '../solana/MobileWalletAdapter';
import { useStakingStore } from '../stores/stakingStore';
import { Colors } from '../theme/colors';

/**
 * GenoSync Dashboard - Mobile
 * 
 * Features:
 * - Live biometric monitoring
 * - Wellness score display
 * - AURA balance & boost multiplier
 * - Quick actions for staking, NFTs, governance
 */

interface SessionStats {
  duration: number;
  apm: number;
  hrv: number;
  strain: number;
  focusScore: number;
  grade: 'S' | 'A' | 'B' | 'C' | 'D' | null;
}

const hapticOptions = {
  enableVibrateFallback: true,
  ignoreAndroidSystemSettings: false,
};

export const DashboardScreen: React.FC = () => {
  const { walletAddress } = useMobileWallet();
  const { stakeInfo, auraBalance } = useStakingStore();
  const [isSessionActive, setIsSessionActive] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [sessionStats, setSessionStats] = useState<SessionStats>({
    duration: 0,
    apm: 0,
    hrv: 0,
    strain: 0,
    focusScore: 0,
    grade: null,
  });
  const [pulseAnim] = useState(new Animated.Value(1));

  // Pulse animation for active session
  useEffect(() => {
    if (isSessionActive) {
      Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 1.2,
            duration: 1000,
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnim, {
            toValue: 1,
            duration: 1000,
            useNativeDriver: true,
          }),
        ])
      ).start();
    } else {
      pulseAnim.setValue(1);
    }
  }, [isSessionActive]);

  // Simulate session timer
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isSessionActive) {
      interval = setInterval(() => {
        setSessionStats((prev) => ({
          ...prev,
          duration: prev.duration + 1,
          // Simulate biometric fluctuations
          hrv: 45 + Math.random() * 20,
          strain: Math.min(100, prev.strain + Math.random() * 2),
        }));
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [isSessionActive]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    ReactNativeHapticFeedback.trigger('impactLight', hapticOptions);
    // Simulate data fetch
    setTimeout(() => {
      setRefreshing(false);
      ReactNativeHapticFeedback.trigger('notificationSuccess', hapticOptions);
    }, 2000);
  }, []);

  const toggleSession = () => {
    if (isSessionActive) {
      // End session - calculate grade
      const grade = calculateGrade(sessionStats);
      setSessionStats((prev) => ({ ...prev, grade }));
      ReactNativeHapticFeedback.trigger('notificationWarning', hapticOptions);
    } else {
      ReactNativeHapticFeedback.trigger('notificationSuccess', hapticOptions);
    }
    setIsSessionActive(!isSessionActive);
  };

  const calculateGrade = (stats: SessionStats): 'S' | 'A' | 'B' | 'C' | 'D' => {
    const score = (stats.focusScore * 0.4 + (100 - stats.strain) * 0.3 + stats.hrv * 0.3);
    if (score >= 90) return 'S';
    if (score >= 80) return 'A';
    if (score >= 70) return 'B';
    if (score >= 60) return 'C';
    return 'D';
  };

  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const getBoostMultiplier = () => {
    if (!stakeInfo) return 1;
    return stakeInfo.boostMultiplier / 100;
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        style={styles.scrollView}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={Colors.solana.purple}
            colors={[Colors.solana.purple]}
            progressBackgroundColor={Colors.surface}
          />
        }
      >
        {/* Header */}
        <View style={styles.header}>
          <View>
            <Text style={styles.greeting}>Welcome back</Text>
            <Text style={styles.walletAddress}>
              {walletAddress?.slice(0, 6)}...{walletAddress?.slice(-4)}
            </Text>
          </View>
          <TouchableOpacity style={styles.profileButton}>
            <Icon name="person-circle" size={40} color="#e94560" />
          </TouchableOpacity>
        </View>

        {/* AURA Balance Card */}
        <View style={styles.balanceCard}>
          <View style={styles.balanceHeader}>
            <Icon name="logo-solana" size={20} color="#9945ff" />
            <Text style={styles.balanceLabel}>AURA Balance</Text>
          </View>
          <Text style={styles.balanceAmount}>
            {auraBalance.toLocaleString()} AURA
          </Text>
          {stakeInfo && (
            <View style={styles.boostBadge}>
              <Icon name="flame" size={14} color="#f59e0b" />
              <Text style={styles.boostText}>
                {getBoostMultiplier()}x Boost Active
              </Text>
            </View>
          )}
        </View>

        {/* Session Control */}
        <View style={styles.sessionSection}>
          <Text style={styles.sectionTitle}>Wellness Session</Text>
          
          <TouchableOpacity
            style={[
              styles.sessionButton,
              isSessionActive && styles.sessionButtonActive,
            ]}
            onPress={toggleSession}
          >
            <Animated.View
              style={[
                styles.pulseRing,
                { transform: [{ scale: pulseAnim }] },
              ]}
            />
            <Icon
              name={isSessionActive ? 'stop' : 'play'}
              size={32}
              color={isSessionActive ? '#ef4444' : '#4ade80'}
            />
            <Text style={styles.sessionButtonText}>
              {isSessionActive ? 'End Session' : 'Start Session'}
            </Text>
            {isSessionActive && (
              <Text style={styles.timer}>{formatTime(sessionStats.duration)}</Text>
            )}
          </TouchableOpacity>

          {/* Grade Badge */}
          {sessionStats.grade && !isSessionActive && (
            <View style={[styles.gradeBadge, { backgroundColor: getGradeColor(sessionStats.grade) }]}>
              <Text style={styles.gradeText}>Grade {sessionStats.grade}</Text>
              {sessionStats.grade === 'S' && (
                <Text style={styles.gradeBonus}>+ NFT Earned!</Text>
              )}
            </View>
          )}
        </View>

        {/* Live Biometrics */}
        {isSessionActive && (
          <View style={styles.biometricsSection}>
            <Text style={styles.sectionTitle}>Live Biometrics</Text>
            <View style={styles.biometricGrid}>
              <BiometricCard
                icon="heart"
                label="HRV"
                value={`${Math.round(sessionStats.hrv)}`}
                unit="ms"
                color="#ef4444"
              />
              <BiometricCard
                icon="flash"
                label="Strain"
                value={`${Math.round(sessionStats.strain)}`}
                unit="%"
                color="#f59e0b"
              />
              <BiometricCard
                icon="eye"
                label="Focus"
                value={`${Math.round(sessionStats.focusScore)}`}
                unit="%"
                color="#3b82f6"
              />
              <BiometricCard
                icon="trending-up"
                label="APM"
                value={`${Math.round(sessionStats.apm)}`}
                unit=""
                color="#10b981"
              />
            </View>
          </View>
        )}

        {/* Quick Actions */}
        <View style={styles.actionsSection}>
          <Text style={styles.sectionTitle}>Quick Actions</Text>
          <View style={styles.actionsGrid}>
            <ActionButton
              icon="lock-closed"
              label="Stake AURA"
              route="Staking"
              color="#8b5cf6"
            />
            <ActionButton
              icon="trophy"
              label="NFTs"
              route="NFTs"
              color="#f59e0b"
            />
            <ActionButton
              icon="people"
              label="Governance"
              route="Governance"
              color="#3b82f6"
            />
            <ActionButton
              icon="time"
              label="History"
              route="History"
              color="#64748b"
            />
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const BiometricCard: React.FC<{
  icon: string;
  label: string;
  value: string;
  unit: string;
  color: string;
}> = ({ icon, label, value, unit, color }) => (
  <View style={styles.biometricCard}>
    <Icon name={icon} size={20} color={color} />
    <Text style={[styles.biometricValue, { color }]}>{value}</Text>
    <Text style={styles.biometricUnit}>{unit}</Text>
    <Text style={styles.biometricLabel}>{label}</Text>
  </View>
);

const ActionButton: React.FC<{
  icon: string;
  label: string;
  route: string;
  color: string;
}> = ({ icon, label, color }) => (
  <TouchableOpacity style={[styles.actionButton, { backgroundColor: `${color}20` }]}>
    <Icon name={icon} size={24} color={color} />
    <Text style={[styles.actionLabel, { color }]}>{label}</Text>
  </TouchableOpacity>
);

const getGradeColor = (grade: string): string => {
  switch (grade) {
    case 'S': return '#f59e0b'; // Gold
    case 'A': return '#10b981'; // Green
    case 'B': return '#3b82f6'; // Blue
    case 'C': return '#64748b'; // Gray
    case 'D': return '#ef4444'; // Red
    default: return '#64748b';
  }
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0f172a',
  },
  scrollView: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 16,
  },
  greeting: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
  },
  walletAddress: {
    fontSize: 13,
    color: '#94a3b8',
    marginTop: 4,
  },
  profileButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(233, 69, 96, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  balanceCard: {
    margin: 20,
    padding: 20,
    backgroundColor: '#1e293b',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#334155',
  },
  balanceHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  balanceLabel: {
    fontSize: 14,
    color: '#94a3b8',
    fontWeight: '500',
  },
  balanceAmount: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#fff',
  },
  boostBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 12,
    gap: 6,
  },
  boostText: {
    fontSize: 13,
    color: '#f59e0b',
    fontWeight: '600',
  },
  sessionSection: {
    paddingHorizontal: 20,
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#fff',
    marginBottom: 16,
  },
  sessionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#1e293b',
    paddingVertical: 24,
    borderRadius: 16,
    gap: 12,
    position: 'relative',
  },
  sessionButtonActive: {
    backgroundColor: 'rgba(74, 222, 128, 0.1)',
    borderWidth: 2,
    borderColor: '#4ade80',
  },
  pulseRing: {
    position: 'absolute',
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(74, 222, 128, 0.3)',
  },
  sessionButtonText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#fff',
  },
  timer: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#4ade80',
    marginLeft: 12,
  },
  gradeBadge: {
    marginTop: 16,
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 12,
    alignItems: 'center',
  },
  gradeText: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
  },
  gradeBonus: {
    fontSize: 14,
    color: '#fff',
    marginTop: 4,
    opacity: 0.9,
  },
  biometricsSection: {
    paddingHorizontal: 20,
    marginBottom: 24,
  },
  biometricGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  biometricCard: {
    width: '48%',
    backgroundColor: '#1e293b',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  biometricValue: {
    fontSize: 28,
    fontWeight: 'bold',
    marginTop: 8,
  },
  biometricUnit: {
    fontSize: 12,
    color: '#64748b',
  },
  biometricLabel: {
    fontSize: 12,
    color: '#94a3b8',
    marginTop: 4,
  },
  actionsSection: {
    paddingHorizontal: 20,
    paddingBottom: 100,
  },
  actionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  actionButton: {
    width: '48%',
    paddingVertical: 20,
    borderRadius: 12,
    alignItems: 'center',
    gap: 8,
  },
  actionLabel: {
    fontSize: 14,
    fontWeight: '600',
  },
});
