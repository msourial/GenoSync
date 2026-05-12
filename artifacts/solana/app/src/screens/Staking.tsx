import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  TextInput,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/Ionicons';
import { useStakingStore, StakeInfo } from '../stores/stakingStore';
import { LockupPeriod, formatLockupPeriod, formatMultiplier, formatTimeRemaining } from '../sdk/staking';

/**
 * GenoSync Staking Screen - Mobile
 * 
 * Features:
 * - Stake AURA tokens
 * - View lockup periods (30d/90d)
 * - See boost multipliers (2x/3x)
 * - Real-time APY display
 */

export const StakingScreen: React.FC = () => {
  const { stakeInfo, auraBalance, isLoading, stake, unstake, refresh } = useStakingStore();
  const [amount, setAmount] = useState('');
  const [selectedPeriod, setSelectedPeriod] = useState<LockupPeriod>(LockupPeriod.Days30);
  const [activeTab, setActiveTab] = useState<'stake' | 'unstake'>('stake');

  // Refresh on mount
  useEffect(() => {
    refresh();
  }, []);

  const handleStake = async () => {
    const stakeAmount = parseFloat(amount);
    if (isNaN(stakeAmount) || stakeAmount <= 0) return;
    if (stakeAmount > auraBalance) return;

    await stake(stakeAmount, selectedPeriod);
    setAmount('');
  };

  const handleUnstake = async () => {
    await unstake();
  };

  const calculateReward = (amt: number, days: number): number => {
    const multiplier = days === 30 ? 2 : 3;
    // Approximate daily yield
    const dailyYield = 0.1; // 0.1% daily
    return (amt * dailyYield * days * multiplier) / 100;
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView style={styles.scrollView}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity style={styles.backButton}>
            <Icon name="arrow-back" size={24} color="#fff" />
          </TouchableOpacity>
          <Text style={styles.title}>AURA Staking</Text>
          <TouchableOpacity onPress={refresh}>
            <Icon name="refresh" size={24} color="#94a3b8" />
          </TouchableOpacity>
        </View>

        {/* Total Staked Card */}
        <View style={styles.statsCard}>
          <View style={styles.statRow}>
            <View>
              <Text style={styles.statLabel}>Total Staked</Text>
              <Text style={styles.statValue}>
                {stakeInfo?.amount.toLocaleString() || '0'} AURA
              </Text>
            </View>
            <View style={styles.statBadge}>
              <Icon name="lock-closed" size={14} color="#8b5cf6" />
              <Text style={styles.statBadgeText}>
                {stakeInfo ? formatLockupPeriod(stakeInfo.lockupPeriod) : 'Not Staked'}
              </Text>
            </View>
          </View>

          {stakeInfo && (
            <>
              <View style={styles.divider} />
              <View style={styles.statRow}>
                <View>
                  <Text style={styles.statLabel}>Boost Multiplier</Text>
                  <Text style={[styles.statValue, { color: '#f59e0b' }]}>
                    {formatMultiplier(stakeInfo.boostMultiplier)}
                  </Text>
                </View>
                <View>
                  <Text style={styles.statLabel}>Time Remaining</Text>
                  <Text style={styles.statValue}>
                    {stakeInfo.isLocked 
                      ? formatTimeRemaining(stakeInfo.timeRemaining)
                      : 'Unlocked'}
                  </Text>
                </View>
              </View>
            </>
          )}
        </View>

        {/* Tab Switcher */}
        <View style={styles.tabContainer}>
          <TouchableOpacity
            style={[styles.tab, activeTab === 'stake' && styles.tabActive]}
            onPress={() => setActiveTab('stake')}
          >
            <Text style={[styles.tabText, activeTab === 'stake' && styles.tabTextActive]}>
              Stake
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.tab, activeTab === 'unstake' && styles.tabActive]}
            onPress={() => setActiveTab('unstake')}
            disabled={!stakeInfo}
          >
            <Text style={[styles.tabText, activeTab === 'unstake' && styles.tabTextActive]}>
              Unstake
            </Text>
          </TouchableOpacity>
        </View>

        {activeTab === 'stake' ? (
          <>
            {/* Staking Options */}
            <Text style={styles.sectionTitle}>Select Lockup Period</Text>
            <View style={styles.periodContainer}>
              <PeriodCard
                days={30}
                multiplier={2}
                isSelected={selectedPeriod === LockupPeriod.Days30}
                onSelect={() => setSelectedPeriod(LockupPeriod.Days30)}
              />
              <PeriodCard
                days={90}
                multiplier={3}
                isSelected={selectedPeriod === LockupPeriod.Days90}
                onSelect={() => setSelectedPeriod(LockupPeriod.Days90)}
              />
            </View>

            {/* Amount Input */}
            <View style={styles.inputContainer}>
              <Text style={styles.sectionTitle}>Amount to Stake</Text>
              <View style={styles.inputWrapper}>
                <TextInput
                  style={styles.input}
                  value={amount}
                  onChangeText={setAmount}
                  placeholder="0.00"
                  placeholderTextColor="#64748b"
                  keyboardType="decimal-pad"
                />
                <Text style={styles.inputSuffix}>AURA</Text>
              </View>
              <View style={styles.balanceRow}>
                <Text style={styles.balanceText}>
                  Available: {auraBalance.toLocaleString()} AURA
                </Text>
                <TouchableOpacity onPress={() => setAmount(auraBalance.toString())}>
                  <Text style={styles.maxButton}>MAX</Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* Reward Preview */}
            {amount && !isNaN(parseFloat(amount)) && (
              <View style={styles.previewCard}>
                <Text style={styles.previewTitle}>Estimated Rewards</Text>
                <View style={styles.previewRow}>
                  <Text style={styles.previewLabel}>Daily Yield</Text>
                  <Text style={styles.previewValue}>
                    +{calculateReward(parseFloat(amount) || 0, selectedPeriod === LockupPeriod.Days30 ? 30 : 90).toFixed(2)} AURA
                  </Text>
                </View>
                <View style={styles.previewRow}>
                  <Text style={styles.previewLabel}>Wellness Boost</Text>
                  <Text style={[styles.previewValue, { color: '#f59e0b' }]}>
                    {formatMultiplier(selectedPeriod === LockupPeriod.Days30 ? 200 : 300)} XP Multiplier
                  </Text>
                </View>
              </View>
            )}

            {/* Stake Button */}
            <TouchableOpacity
              style={[
                styles.actionButton,
                (!amount || parseFloat(amount) <= 0 || parseFloat(amount) > auraBalance) && 
                  styles.actionButtonDisabled,
              ]}
              onPress={handleStake}
              disabled={!amount || parseFloat(amount) <= 0 || parseFloat(amount) > auraBalance || isLoading}
            >
              {isLoading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.actionButtonText}>
                  {parseFloat(amount) > auraBalance ? 'Insufficient Balance' : 'Stake AURA'}
                </Text>
              )}
            </TouchableOpacity>
          </>
        ) : (
          <>
            {/* Unstake Section */}
            <View style={styles.unstakeCard}>
              <Icon name="lock-closed" size={48} color="#64748b" />
              <Text style={styles.unstakeTitle}>Unstake AURA</Text>
              <Text style={styles.unstakeDescription}>
                {stakeInfo?.isLocked 
                  ? `Your tokens are locked for ${formatTimeRemaining(stakeInfo.timeRemaining)}`
                  : 'Your tokens are unlocked and ready to unstake'}
              </Text>
              
              {stakeInfo && (
                <View style={styles.unstakeInfo}>
                  <View style={styles.unstakeRow}>
                    <Text style={styles.unstakeLabel}>Staked Amount</Text>
                    <Text style={styles.unstakeValue}>{stakeInfo.amount.toLocaleString()} AURA</Text>
                  </View>
                  <View style={styles.unstakeRow}>
                    <Text style={styles.unstakeLabel}>Lockup Period</Text>
                    <Text style={styles.unstakeValue}>{formatLockupPeriod(stakeInfo.lockupPeriod)}</Text>
                  </View>
                </View>
              )}
            </View>

            <TouchableOpacity
              style={[
                styles.actionButton,
                styles.unstakeButton,
                (!stakeInfo || stakeInfo.isLocked) && styles.actionButtonDisabled,
              ]}
              onPress={handleUnstake}
              disabled={!stakeInfo || stakeInfo.isLocked || isLoading}
            >
              {isLoading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.actionButtonText}>
                  {!stakeInfo 
                    ? 'No Tokens Staked' 
                    : stakeInfo.isLocked 
                      ? 'Still Locked' 
                      : 'Unstake Now'}
                </Text>
              )}
            </TouchableOpacity>
          </>
        )}

        {/* Info Section */}
        <View style={styles.infoSection}>
          <Text style={styles.infoTitle}>How Staking Works</Text>
          <InfoItem
            icon="flame"
            title="Earn XP Boosts"
            description="Stake AURA to multiply your wellness session XP rewards"
          />
          <InfoItem
            icon="lock-closed"
            title="Lockup Periods"
            description="30-day (2x boost) or 90-day (3x boost) options"
          />
          <InfoItem
            icon="shield-checkmark"
            title="Secure & Decentralized"
            description="Your tokens are secured by Solana blockchain"
          />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const PeriodCard: React.FC<{
  days: number;
  multiplier: number;
  isSelected: boolean;
  onSelect: () => void;
}> = ({ days, multiplier, isSelected, onSelect }) => (
  <TouchableOpacity
    style={[styles.periodCard, isSelected && styles.periodCardSelected]}
    onPress={onSelect}
  >
    <Text style={[styles.periodDays, isSelected && styles.periodTextSelected]}>
      {days} Days
    </Text>
    <Text style={[styles.periodMultiplier, isSelected && styles.periodTextSelected]}>
      {multiplier}x Boost
    </Text>
    <View style={[styles.periodBadge, isSelected && styles.periodBadgeSelected]}>
      <Text style={[styles.periodBadgeText, isSelected && styles.periodTextSelected]}>
        {isSelected ? 'Selected' : 'Select'}
      </Text>
    </View>
  </TouchableOpacity>
);

const InfoItem: React.FC<{
  icon: string;
  title: string;
  description: string;
}> = ({ icon, title, description }) => (
  <View style={styles.infoItem}>
    <View style={styles.infoIcon}>
      <Icon name={icon} size={20} color="#8b5cf6" />
    </View>
    <View style={styles.infoText}>
      <Text style={styles.infoItemTitle}>{title}</Text>
      <Text style={styles.infoItemDescription}>{description}</Text>
    </View>
  </View>
);

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
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 16,
  },
  backButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#fff',
  },
  statsCard: {
    margin: 20,
    padding: 20,
    backgroundColor: '#1e293b',
    borderRadius: 16,
  },
  statRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  statLabel: {
    fontSize: 14,
    color: '#94a3b8',
    marginBottom: 4,
  },
  statValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
  },
  statBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(139, 92, 246, 0.1)',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 20,
    gap: 6,
  },
  statBadgeText: {
    fontSize: 12,
    color: '#8b5cf6',
    fontWeight: '600',
  },
  divider: {
    height: 1,
    backgroundColor: '#334155',
    marginVertical: 16,
  },
  tabContainer: {
    flexDirection: 'row',
    marginHorizontal: 20,
    marginBottom: 20,
    backgroundColor: '#1e293b',
    borderRadius: 12,
    padding: 4,
  },
  tab: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
    borderRadius: 8,
  },
  tabActive: {
    backgroundColor: '#334155',
  },
  tabText: {
    fontSize: 16,
    color: '#64748b',
    fontWeight: '600',
  },
  tabTextActive: {
    color: '#fff',
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
    marginHorizontal: 20,
    marginBottom: 12,
  },
  periodContainer: {
    flexDirection: 'row',
    gap: 12,
    marginHorizontal: 20,
    marginBottom: 24,
  },
  periodCard: {
    flex: 1,
    padding: 16,
    backgroundColor: '#1e293b',
    borderRadius: 12,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'transparent',
  },
  periodCardSelected: {
    borderColor: '#8b5cf6',
    backgroundColor: 'rgba(139, 92, 246, 0.1)',
  },
  periodDays: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 4,
  },
  periodMultiplier: {
    fontSize: 14,
    color: '#f59e0b',
    marginBottom: 12,
  },
  periodTextSelected: {
    color: '#8b5cf6',
  },
  periodBadge: {
    paddingVertical: 4,
    paddingHorizontal: 12,
    backgroundColor: '#334155',
    borderRadius: 12,
  },
  periodBadgeSelected: {
    backgroundColor: '#8b5cf6',
  },
  periodBadgeText: {
    fontSize: 12,
    color: '#94a3b8',
  },
  inputContainer: {
    marginHorizontal: 20,
    marginBottom: 24,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1e293b',
    borderRadius: 12,
    paddingHorizontal: 16,
    borderWidth: 1,
    borderColor: '#334155',
  },
  input: {
    flex: 1,
    fontSize: 24,
    color: '#fff',
    paddingVertical: 16,
  },
  inputSuffix: {
    fontSize: 16,
    color: '#94a3b8',
    fontWeight: '600',
  },
  balanceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 8,
  },
  balanceText: {
    fontSize: 13,
    color: '#64748b',
  },
  maxButton: {
    fontSize: 13,
    color: '#8b5cf6',
    fontWeight: '600',
  },
  previewCard: {
    marginHorizontal: 20,
    marginBottom: 24,
    padding: 16,
    backgroundColor: 'rgba(139, 92, 246, 0.1)',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#8b5cf6',
  },
  previewTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#8b5cf6',
    marginBottom: 12,
  },
  previewRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  previewLabel: {
    fontSize: 14,
    color: '#94a3b8',
  },
  previewValue: {
    fontSize: 14,
    color: '#fff',
    fontWeight: '600',
  },
  actionButton: {
    marginHorizontal: 20,
    marginBottom: 24,
    backgroundColor: '#8b5cf6',
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  actionButtonDisabled: {
    backgroundColor: '#334155',
  },
  actionButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#fff',
  },
  unstakeButton: {
    backgroundColor: '#ef4444',
  },
  unstakeCard: {
    margin: 20,
    padding: 32,
    backgroundColor: '#1e293b',
    borderRadius: 16,
    alignItems: 'center',
  },
  unstakeTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#fff',
    marginTop: 16,
    marginBottom: 8,
  },
  unstakeDescription: {
    fontSize: 14,
    color: '#94a3b8',
    textAlign: 'center',
    marginBottom: 24,
  },
  unstakeInfo: {
    width: '100%',
    backgroundColor: '#0f172a',
    borderRadius: 12,
    padding: 16,
  },
  unstakeRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  unstakeLabel: {
    fontSize: 14,
    color: '#64748b',
  },
  unstakeValue: {
    fontSize: 14,
    color: '#fff',
    fontWeight: '600',
  },
  infoSection: {
    marginHorizontal: 20,
    marginBottom: 100,
  },
  infoTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 16,
  },
  infoItem: {
    flexDirection: 'row',
    marginBottom: 16,
  },
  infoIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(139, 92, 246, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  infoText: {
    flex: 1,
  },
  infoItemTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
    marginBottom: 4,
  },
  infoItemDescription: {
    fontSize: 14,
    color: '#94a3b8',
    lineHeight: 20,
  },
});
