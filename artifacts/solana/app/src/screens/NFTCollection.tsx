import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  Image,
  TouchableOpacity,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/Ionicons';

/**
 * GenoSync NFT Collection Screen - Mobile
 * 
 * Features:
 * - Display compressed NFTs for S-grade sessions
 * - Mint history
 * - Rarity levels (S-grade only)
 */

interface NFTItem {
  id: string;
  name: string;
  image: string;
  grade: 'S' | 'A' | 'B' | 'C' | 'D';
  sessionId: string;
  timestamp: number;
  attributes: {
    focusScore: number;
    hrv: number;
    strain: number;
    duration: number;
  };
}

const MOCK_NFTS: NFTItem[] = [
  {
    id: '1',
    name: 'Wellness Legend #001',
    image: 'https://api.dicebear.com/7.x/avataaars/svg?seed=legend1',
    grade: 'S',
    sessionId: 'sess-001',
    timestamp: Date.now() - 86400000,
    attributes: {
      focusScore: 95,
      hrv: 72,
      strain: 15,
      duration: 3600,
    },
  },
  {
    id: '2',
    name: 'Wellness Legend #002',
    image: 'https://api.dicebear.com/7.x/avataaars/svg?seed=legend2',
    grade: 'S',
    sessionId: 'sess-002',
    timestamp: Date.now() - 172800000,
    attributes: {
      focusScore: 92,
      hrv: 68,
      strain: 22,
      duration: 2700,
    },
  },
  {
    id: '3',
    name: 'Wellness Legend #003',
    image: 'https://api.dicebear.com/7.x/avataaars/svg?seed=legend3',
    grade: 'S',
    sessionId: 'sess-003',
    timestamp: Date.now() - 259200000,
    attributes: {
      focusScore: 88,
      hrv: 65,
      strain: 28,
      duration: 4200,
    },
  },
];

export const NFTCollectionScreen: React.FC = () => {
  const [nfts, setNfts] = useState<NFTItem[]>(MOCK_NFTS);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedNFT, setSelectedNFT] = useState<NFTItem | null>(null);

  const onRefresh = () => {
    setRefreshing(true);
    // Simulate fetching from Shadow Drive
    setTimeout(() => {
      setRefreshing(false);
    }, 1500);
  };

  const formatDate = (timestamp: number): string => {
    return new Date(timestamp).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
    });
  };

  const getGradeColor = (grade: string): string => {
    switch (grade) {
      case 'S': return '#f59e0b';
      case 'A': return '#10b981';
      case 'B': return '#3b82f6';
      case 'C': return '#64748b';
      case 'D': return '#ef4444';
      default: return '#64748b';
    }
  };

  const renderNFT = ({ item }: { item: NFTItem }) => (
    <TouchableOpacity
      style={styles.nftCard}
      onPress={() => setSelectedNFT(item)}
    >
      <Image source={{ uri: item.image }} style={styles.nftImage} />
      <View style={styles.nftOverlay}>
        <View style={[styles.gradeBadge, { backgroundColor: getGradeColor(item.grade) }]}>
          <Text style={styles.gradeText}>{item.grade}</Text>
        </View>
      </View>
      <View style={styles.nftInfo}>
        <Text style={styles.nftName}>{item.name}</Text>
        <Text style={styles.nftDate}>{formatDate(item.timestamp)}</Text>
        <View style={styles.nftStats}>
          <Text style={styles.nftStat}>Focus: {item.attributes.focusScore}%</Text>
        </View>
      </View>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>NFT Collection</Text>
        <TouchableOpacity style={styles.filterButton}>
          <Icon name="filter" size={24} color="#94a3b8" />
        </TouchableOpacity>
      </View>

      {/* Stats */}
      <View style={styles.statsContainer}>
        <View style={styles.statCard}>
          <Text style={styles.statValue}>{nfts.length}</Text>
          <Text style={styles.statLabel}>Total NFTs</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={styles.statValue}>{nfts.filter(n => n.grade === 'S').length}</Text>
          <Text style={styles.statLabel}>S-Grade</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={styles.statValue}>{nfts.length > 0 ? Math.round(nfts.reduce((acc, n) => acc + n.attributes.focusScore, 0) / nfts.length) : 0}%</Text>
          <Text style={styles.statLabel}>Avg Focus</Text>
        </View>
      </View>

      {/* Collection Info */}
      <View style={styles.infoCard}>
        <Icon name="trophy" size={24} color="#f59e0b" />
        <View style={styles.infoText}>
          <Text style={styles.infoTitle}>Wellness Legends</Text>
          <Text style={styles.infoDescription}>
            Only S-grade sessions mint collectible NFTs. Keep pushing your wellness limits!
          </Text>
        </View>
      </View>

      {/* NFT Grid */}
      <FlatList
        data={nfts}
        renderItem={renderNFT}
        keyExtractor={(item) => item.id}
        numColumns={2}
        contentContainerStyle={styles.grid}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Icon name="image" size={64} color="#334155" />
            <Text style={styles.emptyText}>No NFTs yet</Text>
            <Text style={styles.emptySubtext}>
              Complete S-grade wellness sessions to earn NFTs
            </Text>
          </View>
        }
      />

      {/* NFT Detail Modal */}
      {selectedNFT && (
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <TouchableOpacity
              style={styles.closeButton}
              onPress={() => setSelectedNFT(null)}
            >
              <Icon name="close" size={28} color="#fff" />
            </TouchableOpacity>
            
            <Image source={{ uri: selectedNFT.image }} style={styles.modalImage} />
            
            <View style={styles.modalInfo}>
              <Text style={styles.modalName}>{selectedNFT.name}</Text>
              <View style={[styles.modalGrade, { backgroundColor: getGradeColor(selectedNFT.grade) }]}>
                <Text style={styles.modalGradeText}>Grade {selectedNFT.grade}</Text>
              </View>
              
              <Text style={styles.modalDate}>
                Minted on {new Date(selectedNFT.timestamp).toLocaleDateString()}
              </Text>
              
              <View style={styles.attributesContainer}>
                <Text style={styles.attributesTitle}>Session Attributes</Text>
                <View style={styles.attributeRow}>
                  <Attribute label="Focus Score" value={`${selectedNFT.attributes.focusScore}%`} />
                  <Attribute label="HRV" value={`${selectedNFT.attributes.hrv} ms`} />
                </View>
                <View style={styles.attributeRow}>
                  <Attribute label="Strain" value={`${selectedNFT.attributes.strain}%`} />
                  <Attribute 
                    label="Duration" 
                    value={`${Math.floor(selectedNFT.attributes.duration / 60)}m`} 
                  />
                </View>
              </View>
              
              <TouchableOpacity style={styles.viewOnChainButton}>
                <Icon name="link" size={18} color="#fff" />
                <Text style={styles.viewOnChainText}>View on Solana</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      )}
    </SafeAreaView>
  );
};

const Attribute: React.FC<{ label: string; value: string }> = ({ label, value }) => (
  <View style={styles.attribute}>
    <Text style={styles.attributeLabel}>{label}</Text>
    <Text style={styles.attributeValue}>{value}</Text>
  </View>
);

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0f172a',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 16,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#fff',
  },
  filterButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#1e293b',
    justifyContent: 'center',
    alignItems: 'center',
  },
  statsContainer: {
    flexDirection: 'row',
    gap: 12,
    marginHorizontal: 20,
    marginBottom: 20,
  },
  statCard: {
    flex: 1,
    backgroundColor: '#1e293b',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
  },
  statValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
  },
  statLabel: {
    fontSize: 12,
    color: '#94a3b8',
    marginTop: 4,
  },
  infoCard: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 20,
    marginBottom: 20,
    padding: 16,
    backgroundColor: 'rgba(245, 158, 11, 0.1)',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(245, 158, 11, 0.3)',
  },
  infoText: {
    flex: 1,
    marginLeft: 12,
  },
  infoTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#f59e0b',
    marginBottom: 4,
  },
  infoDescription: {
    fontSize: 13,
    color: '#94a3b8',
  },
  grid: {
    paddingHorizontal: 14,
    paddingBottom: 100,
  },
  nftCard: {
    flex: 1,
    margin: 6,
    backgroundColor: '#1e293b',
    borderRadius: 16,
    overflow: 'hidden',
  },
  nftImage: {
    width: '100%',
    height: 150,
    backgroundColor: '#334155',
  },
  nftOverlay: {
    position: 'absolute',
    top: 8,
    right: 8,
  },
  gradeBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  gradeText: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#fff',
  },
  nftInfo: {
    padding: 12,
  },
  nftName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#fff',
    marginBottom: 4,
  },
  nftDate: {
    fontSize: 12,
    color: '#64748b',
    marginBottom: 8,
  },
  nftStats: {
    flexDirection: 'row',
    gap: 8,
  },
  nftStat: {
    fontSize: 11,
    color: '#94a3b8',
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 100,
  },
  emptyText: {
    fontSize: 20,
    fontWeight: '600',
    color: '#64748b',
    marginTop: 16,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#475569',
    marginTop: 8,
    textAlign: 'center',
  },
  modalOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.9)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContent: {
    width: '100%',
    backgroundColor: '#1e293b',
    borderRadius: 20,
    overflow: 'hidden',
  },
  closeButton: {
    position: 'absolute',
    top: 16,
    right: 16,
    zIndex: 10,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalImage: {
    width: '100%',
    height: 300,
    backgroundColor: '#334155',
  },
  modalInfo: {
    padding: 24,
  },
  modalName: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 12,
  },
  modalGrade: {
    alignSelf: 'flex-start',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    marginBottom: 12,
  },
  modalGradeText: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#fff',
  },
  modalDate: {
    fontSize: 14,
    color: '#94a3b8',
    marginBottom: 24,
  },
  attributesContainer: {
    backgroundColor: '#0f172a',
    borderRadius: 12,
    padding: 16,
    marginBottom: 24,
  },
  attributesTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
    marginBottom: 16,
  },
  attributeRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  attribute: {
    flex: 1,
  },
  attributeLabel: {
    fontSize: 12,
    color: '#64748b',
    marginBottom: 4,
  },
  attributeValue: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
  viewOnChainButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#9945ff',
    paddingVertical: 16,
    borderRadius: 12,
    gap: 8,
  },
  viewOnChainText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
});
