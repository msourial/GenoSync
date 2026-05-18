import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Animated } from 'react-native';
import { CameraView } from 'expo-camera';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { Colors } from '../theme/colors';
import { borderRadius, shadows, spacing, typography } from '../theme/tokens';

interface CameraLensProps {
  active: boolean;
  onRequestPermission: () => void;
  permissionGranted: boolean;
  status: string;
  compact?: boolean;
}

export const CameraLens: React.FC<CameraLensProps> = ({
  active,
  onRequestPermission,
  permissionGranted,
  status,
  compact = false
}) => {
  const scanLineAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    let cancelled = false;
    const animateScanLine = () => {
      if (cancelled) return;
      scanLineAnim.setValue(0);
      Animated.timing(scanLineAnim, {
        toValue: 1,
        duration: 2200,
        useNativeDriver: true,
      }).start(({ finished }) => {
        if (finished && !cancelled) {
          setTimeout(animateScanLine, 500);
        }
      });
    };

    if (active && permissionGranted) {
      animateScanLine();
    }

    return () => {
      cancelled = true;
    };
  }, [active, permissionGranted, scanLineAnim]);
  
  if (!permissionGranted) {
    return (
      <View style={[styles.container, styles.permissionDeniedContainer]}>
        <Ionicons name="videocam-off-outline" size={48} color={Colors.textSecondary} />
        <Text style={styles.permissionDeniedText}>Camera access needed</Text>
        <TouchableOpacity style={styles.enableButton} onPress={onRequestPermission}>
          <Text style={styles.enableButtonText}>Enable Camera</Text>
        </TouchableOpacity>
      </View>
    );
  }
  
  return (
    <View style={styles.container}>
      {/* Front (selfie/presence) camera — the production wellness use case.
          On the emulator this needs AVD hw.camera.front=webcam0 AND macOS
          camera permission granted to the emulator process. */}
      {active ? <CameraView style={StyleSheet.absoluteFill} facing="front" /> : (
        <View style={styles.standbyOverlay}>
          <Ionicons name="qr-code-outline" size={48} color={Colors.textSecondary} />
          <Text style={styles.standbyText}>STANDBY</Text>
        </View>
      )}
      
      {/* Overlay elements */}
      <View pointerEvents="none" style={styles.overlayContainer}>
        {/* Corner brackets */}
        <View style={[styles.cornerBracket, styles.topLeftBracket]} />
        <View style={[styles.cornerBracket, styles.topRightBracket]} />
        <View style={[styles.cornerBracket, styles.bottomLeftBracket]} />
        <View style={[styles.cornerBracket, styles.bottomRightBracket]} />
        
        {/* Status indicator */}
        <View style={styles.statusIndicatorContainer}>
          <View style={styles.statusPill}>
            <View style={[styles.statusDot, status === 'ANALYZING' ? styles.analyzingDot : styles.standbyDot]} />
            <Text style={styles.statusText}>{status}</Text>
          </View>
        </View>
        
        {/* Scan line */}
        {active && (
          <Animated.View 
            style={[
              styles.scanLine, 
              {
                transform: [{
                  translateY: scanLineAnim.interpolate({
                    inputRange: [0, 1],
                    outputRange: [0, 300] // Adjust based on container height
                  })
                }]
              }
            ]}
          />
        )}
        
        {/* Grid overlay */}
        <View style={styles.gridOverlay} />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    width: '100%',
    aspectRatio: 16/11,
    backgroundColor: Colors.surface,
    borderRadius: borderRadius.xl,
    overflow: 'hidden',
    ...shadows.glow,
  },
  permissionDeniedContainer: {
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.lg,
  },
  permissionDeniedText: {
    color: Colors.textPrimary,
    fontSize: typography.body.fontSize,
    marginBottom: spacing.md,
    textAlign: 'center',
  },
  enableButton: {
    backgroundColor: Colors.solana.purple,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderRadius: borderRadius.sm,
  },
  enableButtonText: {
    color: Colors.textPrimary,
    fontWeight: 'bold',
  },
  standbyOverlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: Colors.background,
  },
  standbyText: {
    color: Colors.textSecondary,
    marginTop: spacing.sm,
    fontSize: typography.caption.fontSize,
  },
  overlayContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  cornerBracket: {
    position: 'absolute',
    borderColor: Colors.solana.green,
    borderWidth: 2,
    width: 20,
    height: 20,
  },
  topLeftBracket: {
    top: spacing.md,
    left: spacing.md,
    borderRightWidth: 0,
    borderBottomWidth: 0,
  },
  topRightBracket: {
    top: spacing.md,
    right: spacing.md,
    borderLeftWidth: 0,
    borderBottomWidth: 0,
  },
  bottomLeftBracket: {
    bottom: spacing.md,
    left: spacing.md,
    borderRightWidth: 0,
    borderTopWidth: 0,
  },
  bottomRightBracket: {
    bottom: spacing.md,
    right: spacing.md,
    borderLeftWidth: 0,
    borderTopWidth: 0,
  },
  statusIndicatorContainer: {
    position: 'absolute',
    top: spacing.md,
    left: spacing.md,
  },
  statusPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: 20,
    minWidth: 80,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: spacing.xs,
  },
  analyzingDot: {
    backgroundColor: Colors.solana.green,
  },
  standbyDot: {
    backgroundColor: Colors.textSecondary,
  },
  statusText: {
    color: Colors.textPrimary,
    fontSize: typography.caption.fontSize,
  },
  scanLine: {
    position: 'absolute',
    left: 0,
    right: 0,
    height: 2,
    backgroundColor: `${Colors.solana.green}80`, // 50% opacity
    zIndex: 1,
  },
  gridOverlay: {
    ...StyleSheet.absoluteFillObject,
    // Add subtle grid pattern if needed
    backgroundColor: 'transparent',
  },
});