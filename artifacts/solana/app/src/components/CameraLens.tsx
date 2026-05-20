import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Animated, Easing } from 'react-native';
import { CameraView } from 'expo-camera';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { Colors } from '../theme/colors';
import { borderRadius, shadows, spacing, typography } from '../theme/tokens';

interface CameraLensProps {
  active: boolean;
  onRequestPermission: () => void;
  permissionGranted: boolean;
  status: string;
  faceDetected?: boolean;
  blinkCount?: number;
  blinkRate?: number;
  headMotion?: number;
  stability?: number;
}

// Faithful mobile port of the web app's "Sovereign Lens" HUD: PRESENCE /
// BLINKS / HEAD-motion bar / STABILITY in a 2x2 grid next to a circular
// camera with dual scan rings + purple glow + status dot. All animations
// use the native driver and there is ZERO setState in the render path —
// this component sits in Dashboard's render tree and must not drive parent
// re-renders.

const PURPLE = Colors.solana.purple;
const PURPLE_LIGHT = Colors.solana.purpleLight;
const HUD = 96;

const StatusDot: React.FC<{ analyzing: boolean }> = ({ analyzing }) => {
  const scale = useRef(new Animated.Value(1)).current;
  useEffect(() => {
    if (!analyzing) {
      scale.setValue(1);
      return;
    }
    const a = Animated.loop(
      Animated.sequence([
        Animated.timing(scale, { toValue: 1.25, duration: 1000, useNativeDriver: true }),
        Animated.timing(scale, { toValue: 1, duration: 1000, useNativeDriver: true }),
      ]),
    );
    a.start();
    return () => a.stop();
  }, [analyzing, scale]);
  return (
    <Animated.View
      style={[
        styles.statusDot,
        { backgroundColor: analyzing ? PURPLE : Colors.textMuted, transform: [{ scale }] },
      ]}
    >
      <Ionicons name={analyzing ? 'eye' : 'ellipse-outline'} size={9} color="#fff" />
    </Animated.View>
  );
};

const Tile: React.FC<{
  label: string;
  value: string;
  valueColor: string;
  sub?: string;
  subColor?: string;
}> = ({ label, value, valueColor, sub, subColor }) => (
  <View style={styles.tile}>
    <Text style={styles.tileLabel}>{label}</Text>
    <Text style={[styles.tileValue, { color: valueColor }]}>{value}</Text>
    {sub ? <Text style={[styles.tileSub, subColor ? { color: subColor } : null]}>{sub}</Text> : null}
  </View>
);

// HEAD-motion tile renders a percentage progress bar. Bar width is animated
// off the JS state path so updates stay smooth without re-rendering parents.
const HeadTile: React.FC<{ value: number; active: boolean }> = ({ value, active }) => {
  const width = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.timing(width, {
      toValue: Math.max(0, Math.min(100, value)),
      duration: 400,
      easing: Easing.out(Easing.quad),
      useNativeDriver: false,
    }).start();
  }, [value, width]);

  const pct = Math.round(Math.max(0, Math.min(100, value)));
  return (
    <View style={styles.tile}>
      <Text style={styles.tileLabel}>Head</Text>
      <View style={styles.barTrack}>
        <Animated.View
          style={[
            styles.barFill,
            { width: width.interpolate({ inputRange: [0, 100], outputRange: ['0%', '100%'] }) },
          ]}
        />
      </View>
      <Text style={[styles.tileValueSmall, { color: active ? PURPLE_LIGHT : Colors.textMuted }]}>
        {active ? `${pct}%` : '—'}
      </Text>
    </View>
  );
};

const CameraLensBase: React.FC<CameraLensProps> = ({
  active,
  onRequestPermission,
  permissionGranted,
  status,
  faceDetected = true,
  blinkCount = 0,
  blinkRate = 0,
  headMotion = 0,
  stability = 0,
}) => {
  const spin = useRef(new Animated.Value(0)).current;
  const spinSlow = useRef(new Animated.Value(0)).current;
  const glow = useRef(new Animated.Value(0)).current;
  const scan = useRef(new Animated.Value(0)).current;

  const analyzing = active && permissionGranted;
  const presenceOk = analyzing && faceDetected;

  useEffect(() => {
    if (!analyzing) {
      spin.setValue(0);
      spinSlow.setValue(0);
      glow.setValue(0);
      scan.setValue(0);
      return;
    }
    const loops = [
      Animated.loop(
        Animated.timing(spin, { toValue: 1, duration: 3000, easing: Easing.linear, useNativeDriver: true }),
      ),
      Animated.loop(
        Animated.timing(spinSlow, { toValue: 1, duration: 6000, easing: Easing.linear, useNativeDriver: true }),
      ),
      Animated.loop(
        Animated.sequence([
          Animated.timing(glow, { toValue: 1, duration: 1100, useNativeDriver: true }),
          Animated.timing(glow, { toValue: 0, duration: 1100, useNativeDriver: true }),
        ]),
      ),
      Animated.loop(
        Animated.timing(scan, { toValue: 1, duration: 2200, easing: Easing.inOut(Easing.quad), useNativeDriver: true }),
      ),
    ];
    loops.forEach((l) => l.start());
    return () => loops.forEach((l) => l.stop());
  }, [analyzing, spin, spinSlow, glow, scan]);

  if (!permissionGranted) {
    return (
      <View style={styles.container}>
        <View style={styles.permission}>
          <Ionicons name="videocam-off-outline" size={40} color={Colors.textSecondary} />
          <Text style={styles.permissionText}>Camera access needed</Text>
          <TouchableOpacity style={styles.enableBtn} onPress={onRequestPermission}>
            <Text style={styles.enableBtnText}>Enable Camera</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  const rotate = spin.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '360deg'] });
  const rotateRev = spinSlow.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '-360deg'] });
  const glowScale = glow.interpolate({ inputRange: [0, 1], outputRange: [1, 1.12] });
  const glowOpacity = glow.interpolate({ inputRange: [0, 1], outputRange: [0.35, 0.9] });
  const scanY = scan.interpolate({ inputRange: [0, 1], outputRange: [-HUD / 2 + 6, HUD / 2 - 6] });

  const statusText = analyzing ? 'ANALYZING' : status === 'NO CAM' ? 'NO CAM' : 'STANDBY';
  const statusColor = analyzing ? PURPLE_LIGHT : status === 'NO CAM' ? Colors.error : Colors.textMuted;

  const stabilityPct = Math.round(Math.max(0, Math.min(100, stability)));

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Ionicons name="scan-outline" size={13} color={PURPLE_LIGHT} />
          <Text style={styles.headerLabel}>Sovereign Lens</Text>
        </View>
        <Text style={[styles.statusText, { color: statusColor }]}>{statusText}</Text>
      </View>

      <View style={styles.body}>
        {/* Circular camera HUD */}
        <View style={styles.hudWrap}>
          <Animated.View
            style={[
              styles.glowRing,
              {
                opacity: analyzing ? glowOpacity : 0.15,
                transform: [{ scale: analyzing ? glowScale : 1 }],
                shadowColor: PURPLE,
              },
            ]}
          />
          <Animated.View style={[styles.ringSlow, { transform: [{ rotate: rotateRev }] }]} />
          <Animated.View style={[styles.ring, { transform: [{ rotate }] }]} />
          <View style={styles.hudClip}>
            {active ? (
              <CameraView style={StyleSheet.absoluteFill} facing="front" />
            ) : (
              <View style={styles.standby}>
                <Ionicons name="camera-outline" size={28} color={Colors.textMuted} />
              </View>
            )}
            <View
              pointerEvents="none"
              style={[
                StyleSheet.absoluteFill,
                { backgroundColor: analyzing ? 'rgba(153,69,255,0.10)' : 'rgba(148,163,184,0.08)' },
              ]}
            />
            {analyzing && (
              <Animated.View
                pointerEvents="none"
                style={[styles.scanLine, { transform: [{ translateY: scanY }] }]}
              />
            )}
          </View>
          <StatusDot analyzing={analyzing} />
        </View>

        {/* Metric grid */}
        <View style={styles.grid}>
          <View style={styles.gridRow}>
            <Tile
              label="PRESENCE"
              value={presenceOk ? 'OK' : '—'}
              valueColor={presenceOk ? PURPLE_LIGHT : Colors.textMuted}
            />
            <Tile
              label="BLINKS"
              value={analyzing ? String(blinkCount) : '—'}
              valueColor={analyzing ? PURPLE_LIGHT : Colors.textMuted}
              sub={analyzing && blinkRate > 0 ? `${blinkRate}/min` : undefined}
              subColor={Colors.textMuted}
            />
          </View>
          <View style={styles.gridRow}>
            <HeadTile value={analyzing ? headMotion : 0} active={analyzing} />
            <Tile
              label="STABILITY"
              value={analyzing ? `${stabilityPct}%` : '—'}
              valueColor={analyzing ? (stabilityPct < 70 ? Colors.warning : PURPLE_LIGHT) : Colors.textMuted}
              sub={analyzing ? (presenceOk ? '⬡ SECURE' : '⚠ BREACH') : undefined}
              subColor={presenceOk ? PURPLE_LIGHT : Colors.error}
            />
          </View>
        </View>
      </View>
    </View>
  );
};

export const CameraLens = React.memo(CameraLensBase);

const styles = StyleSheet.create({
  container: {
    backgroundColor: Colors.surface,
    borderRadius: borderRadius.xl,
    borderWidth: 1,
    borderColor: '#ffffff14',
    padding: spacing.md,
    ...shadows.glow,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  headerLeft: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  headerLabel: {
    color: Colors.textSecondary,
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 2,
    textTransform: 'uppercase',
  },
  statusText: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 2,
    textTransform: 'uppercase',
  },
  body: { flexDirection: 'row', alignItems: 'center', gap: spacing.lg },
  hudWrap: {
    width: HUD + 16,
    height: HUD + 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  glowRing: {
    position: 'absolute',
    width: HUD + 14,
    height: HUD + 14,
    borderRadius: (HUD + 14) / 2,
    borderWidth: 2,
    borderColor: PURPLE,
    shadowOpacity: 0.9,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 0 },
    elevation: 8,
  },
  ringSlow: {
    position: 'absolute',
    width: HUD + 12,
    height: HUD + 12,
    borderRadius: (HUD + 12) / 2,
    borderWidth: 1,
    borderColor: 'transparent',
    borderTopColor: '#B87AFF55',
    borderLeftColor: '#B87AFF22',
  },
  ring: {
    position: 'absolute',
    width: HUD + 6,
    height: HUD + 6,
    borderRadius: (HUD + 6) / 2,
    borderWidth: 2,
    borderColor: 'transparent',
    borderTopColor: PURPLE,
    borderRightColor: '#9945FF55',
  },
  hudClip: {
    width: HUD,
    height: HUD,
    borderRadius: HUD / 2,
    overflow: 'hidden',
    backgroundColor: '#000',
    transform: [{ scaleX: -1 }],
  },
  standby: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.surfaceDark,
  },
  scanLine: {
    position: 'absolute',
    left: 0,
    right: 0,
    height: 2,
    top: HUD / 2,
    backgroundColor: PURPLE_LIGHT,
    opacity: 0.7,
  },
  statusDot: {
    position: 'absolute',
    top: 4,
    right: 4,
    width: 18,
    height: 18,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
  },
  grid: { flex: 1, gap: spacing.sm },
  gridRow: { flexDirection: 'row', gap: spacing.sm },
  tile: {
    flex: 1,
    backgroundColor: '#ffffff0d',
    borderWidth: 1,
    borderColor: '#ffffff14',
    borderRadius: borderRadius.sm,
    paddingHorizontal: 10,
    paddingVertical: 8,
    gap: 2,
  },
  tileLabel: {
    color: Colors.textMuted,
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 1.5,
    textTransform: 'uppercase',
  },
  tileValue: { fontSize: 15, fontWeight: '800' },
  tileValueSmall: { fontSize: 13, fontWeight: '800' },
  tileSub: { color: PURPLE_LIGHT, fontSize: 10, fontWeight: '700' },
  barTrack: {
    height: 4,
    width: '100%',
    backgroundColor: '#ffffff14',
    borderRadius: 2,
    overflow: 'hidden',
    marginTop: 2,
    marginBottom: 1,
  },
  barFill: {
    height: '100%',
    backgroundColor: PURPLE,
    borderRadius: 2,
  },
  permission: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.xl,
    gap: spacing.sm,
  },
  permissionText: { color: Colors.textPrimary, ...typography.body },
  enableBtn: {
    backgroundColor: Colors.solana.purple,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.sm,
    marginTop: spacing.xs,
  },
  enableBtnText: { color: Colors.textPrimary, fontWeight: '700' },
});
