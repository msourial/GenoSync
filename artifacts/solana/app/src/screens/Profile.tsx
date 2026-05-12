import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/Ionicons';
import { Colors } from '../theme/colors';
import { spacing, typography, borderRadius } from '../theme/tokens';
import { useMobileWallet } from '../solana/MobileWalletAdapter';
import { useAuthStore } from '../stores/authStore';

export const ProfileScreen: React.FC = () => {
  const { walletAddress, disconnect } = useMobileWallet();
  const { logout } = useAuthStore();

  const handleDisconnect = async () => {
    await disconnect();
    logout();
  };

  const formatAddress = (addr: string | null) => {
    if (!addr) return 'Not connected';
    return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView style={styles.scrollView}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>Profile</Text>
        </View>

        {/* Wallet Card */}
        <View style={styles.walletCard}>
          <View style={styles.walletIconBg}>
            <Icon name="wallet" size={32} color={Colors.solana.purple} />
          </View>
          <View style={styles.walletInfo}>
            <Text style={styles.walletLabel}>Connected Wallet</Text>
            <Text style={styles.walletAddress}>{formatAddress(walletAddress)}</Text>
          </View>
          <View style={styles.networkBadge}>
            <Text style={styles.networkText}>Solana</Text>
          </View>
        </View>

        {/* Stats */}
        <View style={styles.statsGrid}>
          <StatCard icon="fitness" label="Sessions" value="42" color={Colors.solana.green} />
          <StatCard icon="trophy" label="S-Grades" value="12" color={Colors.accent} />
          <StatCard icon="flame" label="Streak" value="7 days" color={Colors.solana.purple} />
          <StatCard icon="time" label="Total Time" value="28h" color={Colors.info} />
        </View>

        {/* Settings */}
        <Text style={styles.sectionTitle}>Settings</Text>
        <View style={styles.settingsCard}>
          <SettingRow icon="notifications" label="Notifications" toggle />
          <SettingRow icon="moon" label="Dark Mode" toggle value />
          <SettingRow icon="volume-high" label="Sound Effects" toggle value />
          <SettingRow icon="globe" label="Language" value="English" />
          <SettingRow icon="shield-checkmark" label="Biometric Auth" toggle value />
        </View>

        {/* Wellness Data */}
        <Text style={styles.sectionTitle}>Wellness Data</Text>
        <View style={styles.settingsCard}>
          <SettingRow icon="download" label="Export Data" />
          <SettingRow icon="trash" label="Clear Session History" danger />
          <SettingRow icon="cloud-upload" label="Sync to Shadow Drive" />
        </View>

        {/* About */}
        <Text style={styles.sectionTitle}>About</Text>
        <View style={styles.settingsCard}>
          <SettingRow icon="information-circle" label="Version" value="1.0.0" />
          <SettingRow icon="document-text" label="Terms of Service" />
          <SettingRow icon="lock-closed" label="Privacy Policy" />
        </View>

        {/* Disconnect */}
        <TouchableOpacity style={styles.disconnectButton} onPress={handleDisconnect}>
          <Icon name="log-out" size={20} color={Colors.error} />
          <Text style={styles.disconnectText}>Disconnect Wallet</Text>
        </TouchableOpacity>

        <Text style={styles.footer}>Built for Solana Saga & Seeker</Text>
      </ScrollView>
    </SafeAreaView>
  );
};

const StatCard: React.FC<{
  icon: string;
  label: string;
  value: string;
  color: string;
}> = ({ icon, label, value, color }) => (
  <View style={[styles.statCard, { borderColor: `${color}30` }]}>
    <View style={[styles.statIconBg, { backgroundColor: `${color}15` }]}>
      <Icon name={icon} size={20} color={color} />
    </View>
    <Text style={styles.statValue}>{value}</Text>
    <Text style={styles.statLabel}>{label}</Text>
  </View>
);

const SettingRow: React.FC<{
  icon: string;
  label: string;
  value?: string | boolean;
  toggle?: boolean;
  danger?: boolean;
}> = ({ icon, label, value, toggle, danger }) => (
  <View style={styles.settingRow}>
    <View style={styles.settingLeft}>
      <Icon name={icon} size={20} color={danger ? Colors.error : Colors.textMuted} />
      <Text style={[styles.settingLabel, danger && { color: Colors.error }]}>{label}</Text>
    </View>
    {toggle ? (
      <View style={[styles.toggle, value && styles.toggleActive]}>
        <View style={[styles.toggleKnob, value && styles.toggleKnobActive]} />
      </View>
    ) : (
      <Text style={styles.settingValue}>{value}</Text>
    )}
  </View>
);

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  scrollView: {
    flex: 1,
  },
  header: {
    paddingHorizontal: spacing.screen,
    paddingTop: spacing.lg,
    paddingBottom: spacing.md,
  },
  title: {
    ...typography.h2,
    color: Colors.textPrimary,
  },
  walletCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    marginHorizontal: spacing.screen,
    marginBottom: spacing.xl,
    borderWidth: 1,
    borderColor: `${Colors.solana.purple}30`,
  },
  walletIconBg: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: `${Colors.solana.purple}15`,
    justifyContent: 'center',
    alignItems: 'center',
  },
  walletInfo: {
    flex: 1,
    marginLeft: spacing.lg,
  },
  walletLabel: {
    ...typography.caption,
    color: Colors.textMuted,
    marginBottom: 4,
  },
  walletAddress: {
    ...typography.body,
    color: Colors.textPrimary,
    fontWeight: '600',
  },
  networkBadge: {
    backgroundColor: `${Colors.solana.green}15`,
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: borderRadius.sm,
  },
  networkText: {
    ...typography.caption,
    color: Colors.solana.green,
    fontWeight: '600',
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.md,
    paddingHorizontal: spacing.screen,
    marginBottom: spacing.xl,
  },
  statCard: {
    width: '47%',
    backgroundColor: Colors.surface,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    alignItems: 'center',
    borderWidth: 1,
    marginBottom: spacing.sm,
  },
  statIconBg: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  statValue: {
    ...typography.h3,
    color: Colors.textPrimary,
    marginBottom: 4,
  },
  statLabel: {
    ...typography.caption,
    color: Colors.textMuted,
  },
  sectionTitle: {
    ...typography.label,
    color: Colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 1,
    paddingHorizontal: spacing.screen,
    marginTop: spacing.xl,
    marginBottom: spacing.md,
  },
  settingsCard: {
    backgroundColor: Colors.surface,
    borderRadius: borderRadius.lg,
    marginHorizontal: spacing.screen,
    overflow: 'hidden',
  },
  settingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: spacing.lg,
    paddingHorizontal: spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: Colors.cardBorder,
  },
  settingLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  settingLabel: {
    ...typography.body,
    color: Colors.textPrimary,
  },
  settingValue: {
    ...typography.bodySmall,
    color: Colors.textMuted,
  },
  toggle: {
    width: 48,
    height: 26,
    borderRadius: 13,
    backgroundColor: Colors.cardBorder,
    justifyContent: 'center',
    paddingHorizontal: 2,
  },
  toggleActive: {
    backgroundColor: Colors.solana.purple,
  },
  toggleKnob: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: Colors.textPrimary,
  },
  toggleKnobActive: {
    transform: [{ translateX: 22 }],
  },
  disconnectButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.errorBg,
    borderRadius: borderRadius.lg,
    paddingVertical: spacing.lg,
    marginHorizontal: spacing.screen,
    marginTop: spacing.xxl,
    gap: spacing.sm,
  },
  disconnectText: {
    ...typography.body,
    color: Colors.error,
    fontWeight: '600',
  },
  footer: {
    ...typography.caption,
    color: Colors.textMuted,
    textAlign: 'center',
    marginTop: spacing.xl,
    marginBottom: spacing.xxxl,
  },
});
