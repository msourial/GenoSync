import React, { useMemo } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Image,
  RefreshControl,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';

import { useNFTs } from '../hooks/useNFTs';
import { Colors } from '../theme/colors';
import { borderRadius, shadows, spacing, typography } from '../theme/tokens';

type Grade = 'S' | 'A' | 'B' | 'C' | 'D';

type NFTItem = {
  mint: string;
  name: string;
  image?: string;
  grade?: Grade;
};

function gradeColor(grade: Grade): string {
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

const NFTCollection: React.FC = () => {
  const { nfts, loading, refetch } = useNFTs();

  const data = useMemo(() => nfts ?? [], [nfts]);

  const renderItem = ({ item }: { item: NFTItem }) => {
    const grade = item.grade ?? 'C';
    const gradeTint = gradeColor(grade);

    return (
      <TouchableOpacity activeOpacity={0.88} style={styles.card}>
        <View style={styles.mediaWrap}>
          {item.image ? (
            <Image source={{ uri: item.image }} style={styles.image} resizeMode="cover" />
          ) : (
            <View style={styles.imageFallback}>
              <Ionicons name="image-outline" size={28} color={Colors.textSecondary} />
            </View>
          )}
          <View style={[styles.gradeBadge, { backgroundColor: `${gradeTint}22`, borderColor: gradeTint }]}>
            <Text style={[styles.gradeText, { color: gradeTint }]}>{grade}</Text>
          </View>
        </View>

        <View style={styles.meta}>
          <Text numberOfLines={1} style={styles.name}>{item.name}</Text>
          <Text numberOfLines={1} style={styles.mint}>{`${item.mint.slice(0, 6)}...${item.mint.slice(-6)}`}</Text>
        </View>
      </TouchableOpacity>
    );
  };

  const EmptyState = (
    <View style={styles.emptyWrap}>
      <Ionicons name="sparkles-outline" size={34} color={Colors.solana.green} />
      <Text style={styles.emptyTitle}>No NFTs yet</Text>
      <Text style={styles.emptyText}>earn S-grade sessions to mint compressed NFTs</Text>
    </View>
  );

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>NFT Collection</Text>
        <TouchableOpacity style={styles.refreshButton} onPress={refetch}>
          <Ionicons name="refresh-outline" size={18} color={Colors.textPrimary} />
          <Text style={styles.refreshText}>Refresh</Text>
        </TouchableOpacity>
      </View>

      <FlatList
        data={data}
        keyExtractor={(item) => item.mint}
        renderItem={renderItem}
        numColumns={2}
        columnWrapperStyle={styles.columnWrap}
        contentContainerStyle={styles.listContent}
        refreshControl={<RefreshControl tintColor={Colors.solana.green} refreshing={loading} onRefresh={refetch} />}
        ListEmptyComponent={!loading ? EmptyState : null}
        ListFooterComponent={loading ? <ActivityIndicator color={Colors.solana.green} style={styles.loader} /> : null}
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
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  title: {
    color: Colors.textPrimary,
    ...typography.h1,
  },
  refreshButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    backgroundColor: Colors.surface,
    borderRadius: borderRadius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  refreshText: {
    color: Colors.textPrimary,
    ...typography.caption,
  },
  listContent: {
    paddingBottom: spacing.xxxl,
    gap: spacing.md,
  },
  columnWrap: {
    justifyContent: 'space-between',
  },
  card: {
    width: '48.5%',
    backgroundColor: Colors.surface,
    borderRadius: borderRadius.lg,
    overflow: 'hidden',
    marginBottom: spacing.md,
    ...shadows.sm,
  },
  mediaWrap: {
    position: 'relative',
    width: '100%',
    aspectRatio: 1,
    backgroundColor: '#111827',
  },
  image: {
    width: '100%',
    height: '100%',
  },
  imageFallback: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  gradeBadge: {
    position: 'absolute',
    top: spacing.sm,
    right: spacing.sm,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
  },
  gradeText: {
    fontSize: 12,
    fontWeight: '800',
  },
  meta: {
    padding: spacing.md,
    gap: spacing.xs,
  },
  name: {
    color: Colors.textPrimary,
    ...typography.body,
    fontWeight: '700',
  },
  mint: {
    color: Colors.textSecondary,
    ...typography.caption,
  },
  emptyWrap: {
    marginTop: spacing.xxxl,
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.xl,
  },
  emptyTitle: {
    color: Colors.textPrimary,
    ...typography.h2,
  },
  emptyText: {
    color: Colors.textSecondary,
    ...typography.body,
    textAlign: 'center',
  },
  loader: {
    marginTop: spacing.lg,
  },
});

export default NFTCollection;
