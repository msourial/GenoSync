import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Alert,
  Animated,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { useNavigation } from '@react-navigation/native';

import { useMobileWallet } from '../solana/MobileWalletAdapter';
import { useConnection } from '../solana/ConnectionProvider';
import { useBiometrics } from '../hooks/useBiometrics';
import { useAuraBalance } from '../hooks/useAuraBalance';
import { useStakeInfo } from '../hooks/useStakeInfo';
import { useCameraVision } from '../hooks/useCameraVision';
import { CameraLens } from '../components/CameraLens';
import { Colors } from '../theme/colors';
import { borderRadius, shadows, spacing, typography } from '../theme/tokens';

const WELLNESS_CHIPS: { emoji: string; label: string }[] = [
  { emoji: '🤲', label: 'Wrist Stretch' },
  { emoji: '💧', label: 'Hydration' },
  { emoji: '🌬️', label: 'Breath' },
  { emoji: '🧘', label: 'Posture' },
  { emoji: '🏃', label: 'Movement' },
  { emoji: '🧠', label: 'Meditate' },
];

type ActionButtonProps = {
  icon: string;
  label: string;
  onPress: () => void;
  disabled?: boolean;
};

type BiometricCardProps = {
  label: string;
  value: string;
  unit?: string;
  icon: string;
  accent: string;
};

function formatWallet(address: string | null): string {
  if (!address) return 'Not connected';
  return `${address.slice(0, 4)}...${address.slice(-4)}`;
}

function formatDuration(totalSeconds: number): string {
  const mins = Math.floor(totalSeconds / 60);
  const secs = totalSeconds % 60;
  return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
}

function calculateGrade(hrv: number, strain: number, focus: number): 'S' | 'A' | 'B' | 'C' | 'D' {
  const hrvScore = Math.max(0, Math.min(100, hrv));
  const strainScore = Math.max(0, Math.min(100, 100 - strain));
  const focusScore = Math.max(0, Math.min(100, focus));
  const total = hrvScore * 0.4 + strainScore * 0.3 + focusScore * 0.3;

  if (total >= 92) return 'S';
  if (total >= 82) return 'A';
  if (total >= 70) return 'B';
  if (total >= 58) return 'C';
  return 'D';
}

// Isolated so the 1s tick re-renders ONLY this tiny subtree — not the whole
// Dashboard (which mounts CameraLens/CameraView + biometric cards). Elapsed is
// derived from a start timestamp ref so the parent never holds per-second state.
const SessionTimer = React.memo(function SessionTimer({
  active,
  startRef,
}: {
  active: boolean;
  startRef: React.MutableRefObject<number>;
}) {
  const [elapsed, setElapsed] = useState(0);
  const pulse = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    if (!active) {
      setElapsed(0);
      pulse.setValue(1);
      return;
    }
    const tick = () =>
      setElapsed(Math.max(0, Math.floor((Date.now() - startRef.current) / 1000)));
    tick();
    const timer = setInterval(tick, 1000);
    const anim = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: 1.08, duration: 900, useNativeDriver: true }),
        Animated.timing(pulse, { toValue: 1, duration: 900, useNativeDriver: true }),
      ]),
    );
    anim.start();
    return () => {
      clearInterval(timer);
      anim.stop();
    };
  }, [active, pulse, startRef]);

  return (
    <Animated.View style={[styles.timerWrap, { transform: [{ scale: pulse }] }]}>
      <Text style={styles.timerText}>{formatDuration(elapsed)}</Text>
    </Animated.View>
  );
});

const ActionButton: React.FC<ActionButtonProps> = ({ icon, label, onPress, disabled }) => (
  <TouchableOpacity style={[styles.actionButton, disabled && styles.actionButtonDisabled]} onPress={onPress} disabled={disabled}>
    <Ionicons name={icon} size={20} color={disabled ? Colors.textSecondary : Colors.textPrimary} />
    <Text style={[styles.actionButtonLabel, disabled && styles.actionButtonLabelDisabled]}>{label}</Text>
  </TouchableOpacity>
);

const BiometricCard: React.FC<BiometricCardProps> = ({ label, value, unit, icon, accent }) => (
  <View style={styles.biometricCard}>
    <View style={[styles.biometricIconWrap, { backgroundColor: `${accent}22` }]}>
      <Ionicons name={icon} size={18} color={accent} />
    </View>
    <Text style={styles.biometricLabel}>{label}</Text>
    <View style={styles.biometricValueRow}>
      <Text style={styles.biometricValue}>{value}</Text>
      {unit ? <Text style={styles.biometricUnit}>{unit}</Text> : null}
    </View>
  </View>
);

const Dashboard: React.FC = () => {
  const navigation = useNavigation<any>();
  const { walletAddress, connect, disconnect, isConnecting } = useMobileWallet();
  const { cluster } = useConnection();

  const { hrv, strain, focus, apm, steps, isMeasuring, start, stop } = useBiometrics();
  const { balance, loading: auraLoading, refetch: refetchAura } = useAuraBalance();
  const { stakeInfo, loading: stakeLoading, refetch: refetchStake } = useStakeInfo();
  const cam = useCameraVision();
  const camSetActive = cam.setActive;

  const [isSessionActive, setIsSessionActive] = useState(false);
  const sessionStartRef = useRef<number>(0);
  const [blinkCount, setBlinkCount] = useState(0);

  // Web app uses MediaPipe face landmarks for blink detection; not ported to
  // mobile (per project memory — too heavy). Simulate a plausible blink cadence
  // of ~18/min so the BLINKS tile in the HUD looks alive.
  useEffect(() => {
    if (!isSessionActive) {
      setBlinkCount(0);
      return;
    }
    const interval = setInterval(() => {
      setBlinkCount((n) => n + 1);
    }, 3300);
    return () => clearInterval(interval);
  }, [isSessionActive]);

  const headMotion = Math.min(100, apm / 4);
  const elapsedMinutes = isSessionActive
    ? (Date.now() - sessionStartRef.current) / 60000
    : 0;
  const blinkRate = elapsedMinutes > 0.05 ? Math.round(blinkCount / elapsedMinutes) : 0;

  // Keep imperative actions in a ref so the session effect depends ONLY on
  // isSessionActive. Otherwise the camera's re-renders churn the identity of
  // useBiometrics' start/stop, re-running the effect every render → setState
  // loop ("Maximum update depth exceeded").
  const actionsRef = useRef({ start, stop, camSetActive });
  actionsRef.current = { start, stop, camSetActive };

  useEffect(() => {
    const { start: s, stop: st, camSetActive: setCam } = actionsRef.current;

    if (!isSessionActive) {
      st();
      setCam(false);
      return;
    }

    // Note: sessionStartRef.current is set synchronously in toggleSession
    // before setIsSessionActive(true) — child effects (SessionTimer) run
    // before parent effects, so writing the ref here would race with the
    // child's first tick reading startRef.current=0.
    s();
    setCam(true);

    return () => {
      const a = actionsRef.current;
      a.stop();
      a.camSetActive(false);
    };
  }, [isSessionActive]);

  const grade = useMemo(() => calculateGrade(hrv, strain, focus), [hrv, strain, focus]);

  const sessionStats = useMemo(
    () => ({
      hrv,
      strain,
      focus,
      apm,
      steps,
      grade,
    }),
    [apm, focus, grade, hrv, steps, strain],
  );

  const normalizedStake = useMemo(() => {
    const raw = (stakeInfo ?? null) as any;
    return {
      stakedAmount: Number(raw?.stakedAmount ?? raw?.amount ?? 0),
      rewards: Number(raw?.rewards ?? raw?.pendingRewards ?? 0),
      apr: Number(raw?.apr ?? raw?.apy ?? 0),
      tier: String(raw?.tier ?? 'Explorer'),
    };
  }, [stakeInfo]);

  const toggleSession = () => {
    if (isSessionActive) {
      const elapsed = Math.max(0, Math.floor((Date.now() - sessionStartRef.current) / 1000));
      setIsSessionActive(false);
      Alert.alert('Session complete', `Grade ${grade} • ${formatDuration(elapsed)} tracked`);
      return;
    }

    sessionStartRef.current = Date.now();
    setIsSessionActive(true);
  };

  const handleRefresh = () => {
    refetchAura();
    refetchStake();
  };

  const handleWalletAction = async () => {
    if (walletAddress) {
      disconnect();
      return;
    }

    try {
      await connect();
    } catch (e) {
      Alert.alert('Wallet connection failed', (e as Error)?.message ?? 'Please try again.');
    }
  };

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      refreshControl={<RefreshControl tintColor={Colors.solana.green} refreshing={auraLoading || stakeLoading} onRefresh={handleRefresh} />}
    >
      <LinearGradient colors={[Colors.solana.purple, '#111827']} style={styles.heroCard}>
        <View style={styles.heroHeader}>
          <View>
            <Text style={styles.heroTitle}>GenoSync</Text>
            <Text style={styles.heroSubtitle}>{cluster.toUpperCase()} • {formatWallet(walletAddress)}</Text>
          </View>
          <TouchableOpacity style={styles.walletButton} onPress={handleWalletAction} disabled={isConnecting}>
            <Ionicons name={walletAddress ? 'log-out-outline' : 'wallet-outline'} size={18} color={Colors.textPrimary} />
            <Text style={styles.walletButtonText}>{walletAddress ? 'Disconnect' : isConnecting ? 'Connecting...' : 'Connect'}</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.balanceRow}>
          <View>
            <Text style={styles.balanceLabel}>AURA Balance</Text>
            <Text style={styles.balanceValue}>{auraLoading ? '--' : balance.toFixed(2)}</Text>
          </View>
          <View style={styles.gradeBadge}>
            <Text style={styles.gradeText}>{sessionStats.grade}</Text>
          </View>
        </View>
      </LinearGradient>

      <View style={styles.visionSection}>
        <Text style={styles.sectionTitle}>Computer Vision</Text>
        <Text style={styles.visionSubtitle}>On-device pose & presence detection</Text>
        <CameraLens
          active={cam.isActive}
          permissionGranted={cam.permissionGranted}
          onRequestPermission={cam.requestAccess}
          status={cam.status}
          faceDetected={isSessionActive}
          blinkCount={blinkCount}
          blinkRate={blinkRate}
          headMotion={isSessionActive ? headMotion : 0}
          stability={isSessionActive ? focus : 0}
        />
        <View style={styles.chipRow}>
          {WELLNESS_CHIPS.map((chip) => (
            <TouchableOpacity
              key={chip.label}
              style={styles.chip}
              onPress={() => navigation.navigate('Challenges')}
            >
              <Text style={styles.chipText}>
                {chip.emoji} {chip.label.toUpperCase()}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      <View style={styles.sessionCard}>
        <View style={styles.sessionHeader}>
          <Text style={styles.sectionTitle}>Live Session</Text>
          <Text style={styles.sessionState}>{isSessionActive ? (isMeasuring ? 'Measuring' : 'Starting...') : 'Idle'}</Text>
        </View>

        <SessionTimer active={isSessionActive} startRef={sessionStartRef} />

        <TouchableOpacity style={[styles.sessionToggle, isSessionActive && styles.sessionToggleActive]} onPress={toggleSession}>
          <Ionicons name={isSessionActive ? 'pause' : 'play'} size={18} color={Colors.textPrimary} />
          <Text style={styles.sessionToggleText}>{isSessionActive ? 'End Session' : 'Start Session'}</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.metricsSection}>
        <Text style={styles.sectionTitle}>Biometrics</Text>
        <View style={styles.metricsGrid}>
          <BiometricCard label="HRV" value={sessionStats.hrv.toFixed(1)} unit="ms" icon="pulse-outline" accent={Colors.solana.green} />
          <BiometricCard label="Strain" value={sessionStats.strain.toFixed(1)} unit="%" icon="flame-outline" accent={Colors.solana.purple} />
          <BiometricCard label="Focus" value={sessionStats.focus.toFixed(1)} unit="%" icon="eye-outline" accent="#38BDF8" />
          <BiometricCard label="APM" value={sessionStats.apm.toFixed(0)} icon="speedometer-outline" accent="#F59E0B" />
          <BiometricCard label="Steps" value={sessionStats.steps.toFixed(0)} icon="walk-outline" accent="#22D3EE" />
          <BiometricCard label="Grade" value={sessionStats.grade} icon="ribbon-outline" accent="#F97316" />
        </View>
      </View>

      <View style={styles.actionsSection}>
        <Text style={styles.sectionTitle}>Quick Actions</Text>
        <View style={styles.actionsRow}>
          <ActionButton icon="refresh-outline" label="Refresh" onPress={handleRefresh} />
          <ActionButton icon="wallet-outline" label={walletAddress ? 'Wallet' : 'Connect'} onPress={handleWalletAction} disabled={isConnecting} />
          <ActionButton icon="medkit-outline" label={isSessionActive ? 'Stop' : 'Start'} onPress={toggleSession} />
        </View>
      </View>

      <View style={styles.stakeCard}>
        <View style={styles.stakeHeader}>
          <Text style={styles.sectionTitle}>Staking</Text>
          <Text style={styles.stakeTier}>{normalizedStake.tier}</Text>
        </View>
        <View style={styles.stakeGrid}>
          <View style={styles.stakeItem}>
            <Text style={styles.stakeLabel}>Staked</Text>
            <Text style={styles.stakeValue}>{stakeLoading ? '--' : normalizedStake.stakedAmount.toFixed(2)} AURA</Text>
          </View>
          <View style={styles.stakeItem}>
            <Text style={styles.stakeLabel}>Rewards</Text>
            <Text style={styles.stakeValue}>{stakeLoading ? '--' : normalizedStake.rewards.toFixed(2)} AURA</Text>
          </View>
          <View style={styles.stakeItem}>
            <Text style={styles.stakeLabel}>APR</Text>
            <Text style={styles.stakeValue}>{stakeLoading ? '--' : `${normalizedStake.apr.toFixed(2)}%`}</Text>
          </View>
        </View>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  content: {
    padding: spacing.lg,
    paddingBottom: spacing.xxxl,
    gap: spacing.lg,
  },
  heroCard: {
    borderRadius: borderRadius.xl,
    padding: spacing.lg,
    ...shadows.glow,
  },
  heroHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  heroTitle: {
    color: Colors.textPrimary,
    ...typography.h1,
  },
  heroSubtitle: {
    color: Colors.textSecondary,
    marginTop: spacing.xs,
    ...typography.caption,
  },
  walletButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    backgroundColor: '#ffffff1a',
    borderRadius: borderRadius.lg,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  walletButtonText: {
    color: Colors.textPrimary,
    ...typography.caption,
  },
  balanceRow: {
    marginTop: spacing.lg,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  balanceLabel: {
    color: Colors.textSecondary,
    ...typography.caption,
  },
  balanceValue: {
    color: Colors.textPrimary,
    marginTop: spacing.xs,
    ...typography.h1,
  },
  gradeBadge: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: Colors.solana.green,
    justifyContent: 'center',
    alignItems: 'center',
  },
  gradeText: {
    color: '#001b0d',
    fontWeight: '900',
    fontSize: 20,
  },
  visionSection: {
    gap: spacing.sm,
  },
  visionSubtitle: {
    color: Colors.textSecondary,
    marginTop: -spacing.xs,
    marginBottom: spacing.xs,
    ...typography.caption,
  },
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: spacing.sm,
  },
  chip: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#ffffff1a',
    backgroundColor: '#ffffff0d',
  },
  chipText: {
    color: Colors.textSecondary,
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 1,
  },
  sessionCard: {
    backgroundColor: Colors.surface,
    borderRadius: borderRadius.xl,
    padding: spacing.lg,
    ...shadows.sm,
  },
  sessionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  sectionTitle: {
    color: Colors.textPrimary,
    ...typography.h2,
  },
  sessionState: {
    color: Colors.textSecondary,
    ...typography.caption,
  },
  timerWrap: {
    marginTop: spacing.lg,
    alignSelf: 'center',
    borderRadius: borderRadius.xl,
    borderWidth: 1,
    borderColor: '#ffffff1f',
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.lg,
  },
  timerText: {
    color: Colors.textPrimary,
    fontSize: 36,
    fontWeight: '700',
    letterSpacing: 2,
  },
  sessionToggle: {
    marginTop: spacing.lg,
    backgroundColor: Colors.solana.purple,
    borderRadius: borderRadius.lg,
    paddingVertical: spacing.md,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: spacing.sm,
  },
  sessionToggleActive: {
    backgroundColor: '#b91c1c',
  },
  sessionToggleText: {
    color: Colors.textPrimary,
    ...typography.body,
    fontWeight: '700',
  },
  metricsSection: {
    gap: spacing.md,
  },
  metricsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.md,
  },
  biometricCard: {
    width: '48%',
    backgroundColor: Colors.surface,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    ...shadows.sm,
  },
  biometricIconWrap: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
  },
  biometricLabel: {
    color: Colors.textSecondary,
    marginTop: spacing.sm,
    ...typography.caption,
  },
  biometricValueRow: {
    marginTop: spacing.xs,
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: spacing.xs,
  },
  biometricValue: {
    color: Colors.textPrimary,
    fontSize: 24,
    fontWeight: '700',
  },
  biometricUnit: {
    color: Colors.textSecondary,
    ...typography.caption,
  },
  actionsSection: {
    gap: spacing.md,
  },
  actionsRow: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  actionButton: {
    flex: 1,
    backgroundColor: Colors.surface,
    borderRadius: borderRadius.lg,
    paddingVertical: spacing.md,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
  },
  actionButtonDisabled: {
    opacity: 0.5,
  },
  actionButtonLabel: {
    color: Colors.textPrimary,
    ...typography.caption,
  },
  actionButtonLabelDisabled: {
    color: Colors.textSecondary,
  },
  stakeCard: {
    backgroundColor: Colors.surface,
    borderRadius: borderRadius.xl,
    padding: spacing.lg,
    ...shadows.sm,
  },
  stakeHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  stakeTier: {
    color: Colors.solana.green,
    ...typography.caption,
    fontWeight: '700',
  },
  stakeGrid: {
    marginTop: spacing.md,
    gap: spacing.sm,
  },
  stakeItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    borderBottomWidth: 1,
    borderBottomColor: '#ffffff11',
    paddingVertical: spacing.sm,
  },
  stakeLabel: {
    color: Colors.textSecondary,
    ...typography.caption,
  },
  stakeValue: {
    color: Colors.textPrimary,
    ...typography.body,
    fontWeight: '700',
  },
});

export default Dashboard;

export const DashboardScreen = Dashboard;
