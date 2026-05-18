import React, { useMemo } from 'react';
import {
  Linking,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { useConnection } from '../solana/ConnectionProvider';
import { Colors } from '../theme/colors';
import { borderRadius, shadows, spacing, typography } from '../theme/tokens';

interface MetricPayload {
  key: string;
  label: string;
  value: string | number;
  signature?: string;
  cluster?: string;
  timestamp?: number;
}

export interface ProvenanceModalProps {
  visible: boolean;
  onClose: () => void;
  metric: MetricPayload;
}

const truncate = (value: string, start = 6, end = 6): string => {
  if (value.length <= start + end + 3) {
    return value;
  }
  return `${value.slice(0, start)}...${value.slice(-end)}`;
};

const getSolscanTxUrl = (signature: string, cluster: string): string => {
  const base = `https://solscan.io/tx/${signature}`;
  if (cluster === 'mainnet-beta') {
    return base;
  }

  const mappedCluster =
    cluster === 'devnet' || cluster === 'testnet' ? cluster : 'devnet';
  return `${base}?cluster=${mappedCluster}`;
};

export const ProvenanceModal: React.FC<ProvenanceModalProps> = ({
  visible,
  onClose,
  metric,
}) => {
  const { cluster: currentCluster } = useConnection();
  const effectiveCluster = metric.cluster ?? currentCluster;

  const txUrl = useMemo(() => {
    if (!metric.signature) {
      return undefined;
    }
    return getSolscanTxUrl(metric.signature, effectiveCluster);
  }, [effectiveCluster, metric.signature]);

  const formattedDate = metric.timestamp
    ? new Date(metric.timestamp * 1000).toLocaleString()
    : undefined;

  const openTx = async () => {
    if (!txUrl) {
      return;
    }
    await Linking.openURL(txUrl);
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose}>
        <Pressable style={styles.card} onPress={() => undefined}>
          <View style={styles.headerRow}>
            <Text style={styles.title}>On-chain Provenance</Text>
            <TouchableOpacity onPress={onClose} hitSlop={{ top: 10, left: 10, right: 10, bottom: 10 }}>
              <Ionicons name="close" size={20} color={Colors.textSecondary} />
            </TouchableOpacity>
          </View>

          <View style={styles.metricBlock}>
            <Text style={styles.metricLabel}>{metric.label}</Text>
            <Text style={styles.metricValue}>{String(metric.value)}</Text>
          </View>

          <View style={styles.row}>
            <Text style={styles.rowKey}>Metric Key</Text>
            <Text style={styles.rowValue}>{metric.key}</Text>
          </View>

          <View style={styles.row}>
            <Text style={styles.rowKey}>Cluster</Text>
            <Text style={styles.rowValue}>{effectiveCluster}</Text>
          </View>

          {formattedDate ? (
            <View style={styles.row}>
              <Text style={styles.rowKey}>Timestamp</Text>
              <Text style={styles.rowValue}>{formattedDate}</Text>
            </View>
          ) : null}

          {metric.signature ? (
            <View style={styles.row}>
              <Text style={styles.rowKey}>Signature</Text>
              <Text style={styles.rowValue}>{truncate(metric.signature)}</Text>
            </View>
          ) : null}

          <TouchableOpacity
            style={[styles.linkButton, !txUrl && styles.linkButtonDisabled]}
            onPress={openTx}
            disabled={!txUrl}
            activeOpacity={0.85}
          >
            <Ionicons name="open-outline" size={16} color={Colors.textPrimary} />
            <Text style={styles.linkText}>View on Solscan</Text>
          </TouchableOpacity>
        </Pressable>
      </Pressable>
    </Modal>
  );
};

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.65)',
    justifyContent: 'center',
    padding: spacing.lg,
  },
  card: {
    backgroundColor: Colors.surface,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: '#25334D',
    padding: spacing.lg,
    ...(shadows.glow as object),
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  title: {
    color: Colors.textPrimary,
    ...(typography.h3 as object),
  },
  metricBlock: {
    marginTop: spacing.md,
    marginBottom: spacing.md,
    padding: spacing.md,
    borderRadius: borderRadius.md,
    backgroundColor: '#121A2A',
    borderWidth: 1,
    borderColor: '#26364F',
  },
  metricLabel: {
    color: Colors.textSecondary,
    ...(typography.caption as object),
  },
  metricValue: {
    marginTop: spacing.xs,
    color: Colors.textPrimary,
    ...(typography.h2 as object),
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing.sm,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#2A3A54',
  },
  rowKey: {
    color: Colors.textSecondary,
    ...(typography.caption as object),
  },
  rowValue: {
    color: Colors.textPrimary,
    ...(typography.caption as object),
    maxWidth: '62%',
    textAlign: 'right',
  },
  linkButton: {
    marginTop: spacing.lg,
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.solana.purple,
    borderRadius: borderRadius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  linkButtonDisabled: {
    opacity: 0.5,
  },
  linkText: {
    color: Colors.textPrimary,
    marginLeft: spacing.xs,
    ...(typography.caption as object),
  },
});
