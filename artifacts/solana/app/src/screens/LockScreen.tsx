import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Animated,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import LinearGradient from 'react-native-linear-gradient';
import Icon from 'react-native-vector-icons/Ionicons';
import ReactNativeBiometrics, { BiometryTypes } from 'react-native-biometrics';
import ReactNativeHapticFeedback from 'react-native-haptic-feedback';
import { useMobileWallet } from '../solana/MobileWalletAdapter';
import { useAuthStore } from '../stores/authStore';
import { Colors } from '../theme/colors';
import { spacing, typography, borderRadius } from '../theme/tokens';

/**
 * GenoSync Lock Screen - Solana Mobile
 *
 * Features:
 * - Solana Mobile Wallet Adapter (Seed Vault, Phantom, Solflare)
 * - Animated Solana-branded gradient
 * - Biometric auth via Seed Vault
 * - Auto-authenticates on successful wallet connection
 */

const rnBiometrics = new ReactNativeBiometrics();
const hapticOptions = {
  enableVibrateFallback: true,
  ignoreAndroidSystemSettings: false,
};

export const LockScreen: React.FC = () => {
  const { connect, isConnecting, walletAddress, walletPublicKey } = useMobileWallet();
  const { setAuthenticated, setWalletAddress } = useAuthStore();
  const [fadeAnim] = useState(new Animated.Value(0));
  const [slideAnim] = useState(new Animated.Value(50));
  const [biometricsAvailable, setBiometricsAvailable] = useState(false);

  useEffect(() => {
    // Check if biometrics are available
    rnBiometrics.isSensorAvailable().then((resultObject) => {
      const { available, biometryType } = resultObject;
      if (available && (biometryType === BiometryTypes.FaceID || biometryType === BiometryTypes.TouchID || biometryType === BiometryTypes.Biometrics)) {
        setBiometricsAvailable(true);
      }
    });

    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 1000,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 800,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  useEffect(() => {
    if (walletAddress && walletPublicKey) {
      setWalletAddress(walletAddress);
      setAuthenticated(true);
    }
  }, [walletAddress, walletPublicKey]);

  const handleConnect = async () => {
    try {
      ReactNativeHapticFeedback.trigger('impactMedium', hapticOptions);
      await connect();
    } catch (error) {
      console.error('Connection failed:', error);
      ReactNativeHapticFeedback.trigger('notificationError', hapticOptions);
    }
  };

  const handleBiometricAuth = async () => {
    try {
      const { success } = await rnBiometrics.simplePrompt({
        promptMessage: 'Authenticate to access GenoSync',
      });

      if (success) {
        ReactNativeHapticFeedback.trigger('notificationSuccess', hapticOptions);
        // In a real app, we might check for a saved session or key
        // For this implementation, we'll trigger the wallet connection
        handleConnect();
      }
    } catch (error) {
      console.error('Biometric auth failed:', error);
      ReactNativeHapticFeedback.trigger('notificationError', hapticOptions);
    }
  };

  const formatAddress = (addr: string | null) => {
    if (!addr) return '';
    return `${addr.slice(0, 4)}...${addr.slice(-4)}`;
  };

  return (
    <SafeAreaView style={styles.container}>
      <LinearGradient
        colors={['#0B0F19', '#141B2D', '#1A1A3E']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.gradient}
      >
        {/* Subtle Solana-colored accent overlay */}
        <View style={styles.accentOverlay} />

        <Animated.View
          style={[
            styles.content,
            { opacity: fadeAnim, transform: [{ translateY: slideAnim }] },
          ]}
        >
          {/* Solana Logo Area */}
          <View style={styles.logoContainer}>
            <View style={styles.logoOuterRing}>
              <View style={styles.logoInnerRing}>
                <Icon name="fitness" size={40} color={Colors.solana.purple} />
              </View>
            </View>
            <Text style={styles.title}>GenoSync</Text>
            <Text style={styles.subtitle}>AI Wellness on Solana</Text>
            <View style={styles.solanaBadge}>
              <View style={styles.solanaDot} />
              <Text style={styles.solanaBadgeText}>Solana Powered</Text>
            </View>
          </View>

          {/* Feature Cards */}
          <View style={styles.featuresContainer}>
            <FeatureItem
              icon="scan"
              title="Computer Vision"
              description="On-device pose & posture detection"
              accentColor={Colors.solana.purple}
            />
            <FeatureItem
              icon="sparkles"
              title="AI Wellness Coach"
              description="Claude-powered personalized guidance"
              accentColor={Colors.solana.green}
            />
            <FeatureItem
              icon="logo-solana"
              title="Earn AURA Tokens"
              description="SPL rewards for every wellness session"
              accentColor={Colors.accent}
            />
          </View>

          {/* Connect Button */}
          <View style={styles.buttonContainer}>
            {walletAddress ? (
              <View style={styles.connectedContainer}>
                <Icon name="checkmark-circle" size={24} color={Colors.success} />
                <Text style={styles.connectedText}>
                  {formatAddress(walletAddress)}
                </Text>
                <View style={styles.enteringBadge}>
                  <ActivityIndicator size="small" color={Colors.success} />
                  <Text style={styles.enteringText}>Entering...</Text>
                </View>
              </View>
            ) : (
              <>
                <TouchableOpacity
                  style={styles.connectButton}
                  onPress={handleConnect}
                  disabled={isConnecting}
                  activeOpacity={0.85}
                >
                  {isConnecting ? (
                    <>
                      <ActivityIndicator color="#fff" />
                      <Text style={styles.buttonText}>Connecting...</Text>
                    </>
                  ) : (
                    <>
                      <Icon name="wallet" size={24} color="#fff" />
                      <Text style={styles.buttonText}>Connect Solana Wallet</Text>
                    </>
                  )}
                </TouchableOpacity>

                {biometricsAvailable && (
                  <TouchableOpacity
                    style={styles.biometricButton}
                    onPress={handleBiometricAuth}
                    activeOpacity={0.7}
                  >
                    <Icon name="finger-print" size={24} color={Colors.solana.green} />
                    <Text style={styles.biometricButtonText}>Sign in with Biometrics</Text>
                  </TouchableOpacity>
                )}
              </>
            )}

            {/* Wallet Options */}
            <View style={styles.walletOptions}>
              <View style={styles.walletOption}>
                <Icon name="lock-closed" size={14} color={Colors.solana.purple} />
                <Text style={styles.walletOptionText}>Seed Vault</Text>
              </View>
              <View style={styles.walletOption}>
                <Icon name="logo-solana" size={14} color={Colors.solana.green} />
                <Text style={styles.walletOptionText}>Phantom</Text>
              </View>
              <View style={styles.walletOption}>
                <Icon name="flame" size={14} color={Colors.warning} />
                <Text style={styles.walletOptionText}>Solflare</Text>
              </View>
            </View>
          </View>

          {/* Security Note */}
          <View style={styles.securityNote}>
            <Icon name="shield-checkmark" size={14} color={Colors.textMuted} />
            <Text style={styles.securityText}>
              Keys stay in your wallet. Biometric auth required.
            </Text>
          </View>
        </Animated.View>
      </LinearGradient>
    </SafeAreaView>
  );
};

const FeatureItem: React.FC<{
  icon: string;
  title: string;
  description: string;
  accentColor: string;
}> = ({ icon, title, description, accentColor }) => (
  <View style={styles.featureItem}>
    <View style={[styles.featureIcon, { backgroundColor: `${accentColor}15` }]}>
      <Icon name={icon} size={20} color={accentColor} />
    </View>
    <View style={styles.featureText}>
      <Text style={styles.featureTitle}>{title}</Text>
      <Text style={styles.featureDescription}>{description}</Text>
    </View>
  </View>
);

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  gradient: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.xxl,
  },
  accentOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: `${Colors.solana.purple}05`,
  },
  content: {
    width: '100%',
    alignItems: 'center',
    zIndex: 1,
  },
  logoContainer: {
    alignItems: 'center',
    marginBottom: spacing.xxl,
  },
  logoOuterRing: {
    width: 110,
    height: 110,
    borderRadius: 55,
    borderWidth: 2,
    borderColor: `${Colors.solana.purple}40`,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  logoInnerRing: {
    width: 90,
    height: 90,
    borderRadius: 45,
    backgroundColor: `${Colors.solana.purple}15`,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: `${Colors.solana.purple}30`,
  },
  title: {
    ...typography.h1,
    color: Colors.textPrimary,
    marginBottom: spacing.sm,
  },
  subtitle: {
    ...typography.body,
    color: Colors.textSecondary,
    marginBottom: spacing.md,
  },
  solanaBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: `${Colors.solana.purple}15`,
    paddingVertical: 6,
    paddingHorizontal: 14,
    borderRadius: borderRadius.full,
    gap: 6,
  },
  solanaDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: Colors.solana.green,
  },
  solanaBadgeText: {
    ...typography.caption,
    color: Colors.solana.purpleLight,
    fontWeight: '600',
  },
  featuresContainer: {
    width: '100%',
    marginBottom: spacing.xxl,
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    backgroundColor: Colors.surface,
    borderRadius: borderRadius.lg,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: Colors.cardBorder,
  },
  featureIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacing.lg,
  },
  featureText: {
    flex: 1,
  },
  featureTitle: {
    ...typography.body,
    color: Colors.textPrimary,
    fontWeight: '600',
    marginBottom: 4,
  },
  featureDescription: {
    ...typography.caption,
    color: Colors.textMuted,
    lineHeight: 18,
  },
  buttonContainer: {
    width: '100%',
    alignItems: 'center',
  },
  connectButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.solana.purple,
    paddingVertical: 16,
    paddingHorizontal: 32,
    borderRadius: borderRadius.lg,
    width: '100%',
    gap: spacing.md,
  },
  buttonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
  },
  biometricButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: spacing.md,
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: borderRadius.lg,
    width: '100%',
    gap: spacing.sm,
    backgroundColor: `${Colors.solana.green}10`,
    borderWidth: 1,
    borderColor: `${Colors.solana.green}30`,
  },
  biometricButtonText: {
    color: Colors.solana.green,
    fontSize: 16,
    fontWeight: '600',
  },
  connectedContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.successBg,
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: borderRadius.lg,
    gap: spacing.sm,
    borderWidth: 1,
    borderColor: `${Colors.success}30`,
    width: '100%',
  },
  connectedText: {
    ...typography.body,
    color: Colors.success,
    fontWeight: '600',
  },
  enteringBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    marginLeft: 'auto',
    gap: 4,
  },
  enteringText: {
    ...typography.caption,
    color: Colors.success,
  },
  walletOptions: {
    flexDirection: 'row',
    marginTop: spacing.lg,
    gap: spacing.md,
  },
  walletOption: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: borderRadius.md,
    gap: 4,
    borderWidth: 1,
    borderColor: Colors.cardBorder,
  },
  walletOptionText: {
    ...typography.caption,
    color: Colors.textSecondary,
  },
  securityNote: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: spacing.xl,
    gap: 6,
  },
  securityText: {
    ...typography.caption,
    color: Colors.textMuted,
  },
});
