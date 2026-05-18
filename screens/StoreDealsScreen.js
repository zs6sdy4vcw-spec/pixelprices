import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, FlatList, TouchableOpacity, Image,
  StyleSheet, ActivityIndicator, Modal, ScrollView,
  Platform, Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { COLORS } from '../constants/theme';
import i18n from '../services/i18n';
import AdBanner from '../components/AdBanner';
import { isPremium, FREE_LIMITS } from '../services/premium';
import { fetchDealsForStore, fetchAllDealsForStore } from '../services/gameData';

const DEALS_PER_STORE = 5;
const FREE_MAX_STORES = 3;
const ALL_DEALS_PAGE_SIZE = 25;

const ALL_STORES = [
  { id: '1',  name: 'Steam',          emoji: '🎮', color: '#1b2838', logo: 'https://store.steampowered.com/favicon.ico' },
  { id: '7',  name: 'GOG',            emoji: '🟣', color: '#86328a', logo: 'https://www.gog.com/favicon.ico' },
  { id: '25', name: 'Epic Games',     emoji: '⚡', color: '#313131', logo: 'https://store.epicgames.com/favicon.ico' },
  { id: '11', name: 'Humble Store',   emoji: '🎁', color: '#cc2929', logo: 'https://www.humblebundle.com/favicon.ico' },
  { id: '15', name: 'Fanatical',      emoji: '🔥', color: '#e4202a', logo: 'https://www.fanatical.com/favicon.ico' },
  { id: '3',  name: 'GreenManGaming', emoji: '🟢', color: '#00a651', logo: 'https://www.greenmangaming.com/favicon.ico' },
  { id: '23', name: 'GameBillet',     emoji: '🎫', color: '#e63946', logo: 'https://www.gamebillet.com/favicon.ico' },
  { id: '27', name: 'Gamesplanet',    emoji: '🌍', color: '#009e4f', logo: 'https://www.gamesplanet.com/favicon.ico' },
  { id: '13', name: 'Ubisoft',        emoji: '🔵', color: '#0070ff', logo: 'https://store.ubisoft.com/favicon.ico' },
  { id: '8',  name: 'EA App',         emoji: '🟠', color: '#f56c2d', logo: 'https://www.ea.com/favicon.ico' },
  { id: '21', name: 'WinGameStore',   emoji: '🎯', color: '#5c3d91', logo: 'https://www.wingamestore.com/favicon.ico' },
  { id: '24', name: 'Voidu',          emoji: '🟡', color: '#ff6b35', logo: 'https://www.voidu.com/favicon.ico' },
];

const FAVORITE_STORES_KEY = 'pixelprices_fav_stores';
// ── Logo du store avec fallback emoji ──
function StoreLogo({ store, size = 28 }) {
  const [error, setError] = useState(false);
  if (error || !store.logo) {
    return (
      <View style={[storeLogoStyles.fallback, { width: size, height: size, backgroundColor: store.color }]}>
        <Text style={{ fontSize: size * 0.55 }}>{store.emoji}</Text>
      </View>
    );
  }
  return (
    <Image
      source={{ uri: store.logo }}
      style={{ width: size, height: size, borderRadius: 6 }}
      onError={() => setError(true)}
    />
  );
}

const storeLogoStyles = StyleSheet.create({
  fallback: { borderRadius: 6, alignItems: 'center', justifyContent: 'center' },
});

// ── Carte de deal ──
function DealCard({ deal, onPress, currency = 'CAD' }) {
  const RATES = { CAD: 1.37, USD: 1.00, EUR: 0.92, GBP: 0.79, AUD: 1.53, MXN: 17.15, BRL: 5.05, JPY: 149.50 };
  const rate = RATES[currency] || 1.37;
  const saleConverted = (deal.salePrice * rate).toFixed(2);
  const normalConverted = (deal.normalPrice * rate).toFixed(2);
  const savings = Math.round(deal.savings);

  return (
    <TouchableOpacity style={styles.dealCard} onPress={() => onPress(deal)} activeOpacity={0.75}>
      <View style={styles.dealThumb}>
        {deal.imageUrl
          ? <Image source={{ uri: deal.imageUrl }} style={styles.dealThumbImg} resizeMode="cover" />
          : <View style={styles.dealThumbPlaceholder}><Text style={{ fontSize: 20 }}>🖥️</Text></View>
        }
        {savings >= 50 && (
          <View style={[styles.savingsBadge, { backgroundColor: savings >= 75 ? '#dc2626' : '#d97706' }]}>
            <Text style={styles.savingsBadgeText}>-{savings}%</Text>
          </View>
        )}
      </View>
      <View style={styles.dealBody}>
        <Text style={styles.dealTitle} numberOfLines={2}>{deal.title}</Text>
        {deal.metacritic ? (
          <View style={[styles.mcBadge, { backgroundColor: deal.metacritic >= 90 ? '#16a34a' : deal.metacritic >= 75 ? '#ca8a04' : '#dc2626' }]}>
            <Text style={styles.mcText}>MC {deal.metacritic}</Text>
          </View>
        ) : null}
      </View>
      <View style={styles.dealRight}>
        <Text style={styles.dealSalePrice}>{saleConverted}</Text>
        <Text style={styles.dealCurrency}>{currency}</Text>
        {deal.normalPrice > deal.salePrice && (
          <Text style={styles.dealNormalPrice}>{normalConverted}</Text>
        )}
      </View>
    </TouchableOpacity>
  );
}

// ── Section store avec "See all deals" ──
function StoreSection({ store, deals, loading, onDealPress, onSeeAll, currency }) {
  return (
    <View style={styles.storeSection}>
      <View style={[styles.storeHeader, { borderLeftColor: store.color }]}>
        <StoreLogo store={store} size={28} />
        <Text style={styles.storeHeaderName}>{store.name}</Text>
        {loading && <ActivityIndicator size="small" color={COLORS.primary} style={{ marginLeft: 8 }} />}
        <Text style={styles.storeDealsCount}>{deals.length} deals</Text>
      </View>
      {deals.length > 0 ? (
        <>
          {deals.map((deal, i) => (
            <DealCard key={deal.id || i} deal={deal} onPress={onDealPress} currency={currency} />
          ))}
          <TouchableOpacity style={styles.seeAllBtn} onPress={() => onSeeAll(store)}>
            <Text style={styles.seeAllText}>See all deals from {store.name}</Text>
            <Text style={styles.seeAllArrow}>→</Text>
          </TouchableOpacity>
        </>
      ) : !loading ? (
        <View style={styles.noDeals}>
          <Text style={styles.noDealsText}>No deals available right now</Text>
        </View>
      ) : null}
    </View>
  );
}

// ── Vue détail d'un store — tous les deals paginés ──
function StoreDetailView({ store, onBack, onDealPress, currency }) {
  const [deals, setDeals] = useState([]);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);

  useEffect(() => {
    loadPage(1);
  }, []);

  const loadPage = async (p) => {
    if (p === 1) setLoading(true);
    else setLoadingMore(true);
    const result = await fetchAllDealsForStore(store.id, p);
    if (p === 1) {
      setDeals(result.data);
    } else {
      setDeals(prev => [...prev, ...result.data]);
    }
    setHasMore(result.hasMore);
    setPage(p);
    if (p === 1) setLoading(false);
    else setLoadingMore(false);
  };

  const loadMore = () => {
    if (loadingMore || !hasMore) return;
    loadPage(page + 1);
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      {/* Header avec bouton retour */}
      <View style={styles.detailHeader}>
        <TouchableOpacity style={styles.backBtn} onPress={onBack} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
          <Text style={styles.backArrow}>←</Text>
          <Text style={styles.backText}>Store Deals</Text>
        </TouchableOpacity>
        <View style={styles.detailStoreInfo}>
          <StoreLogo store={store} size={24} />
          <Text style={styles.detailStoreName}>{store.name}</Text>
        </View>
      </View>

      {loading ? (
        <View style={styles.loadingWrap}>
          <ActivityIndicator size="large" color={COLORS.primary} />
          <Text style={styles.loadingText}>Loading {store.name} deals...</Text>
        </View>
      ) : (
        <FlatList
          data={deals}
          keyExtractor={(item, i) => item.id || String(i)}
          contentContainerStyle={styles.list}
          ListHeaderComponent={
            <Text style={styles.detailCount}>{deals.length}+ deals from {store.name}</Text>
          }
          renderItem={({ item }) => (
            <DealCard deal={item} onPress={onDealPress} currency={currency} />
          )}
          ItemSeparatorComponent={() => <View style={{ height: 6 }} />}
          onEndReached={loadMore}
          onEndReachedThreshold={0.3}
          ListFooterComponent={loadingMore ? (
            <View style={{ padding: 20, alignItems: 'center' }}>
              <ActivityIndicator size="small" color={COLORS.primary} />
            </View>
          ) : null}
          ListEmptyComponent={
            <View style={styles.noDeals}>
              <Text style={{ fontSize: 40, marginBottom: 12 }}>🎮</Text>
              <Text style={styles.noDealsText}>No deals available right now</Text>
            </View>
          }
        />
      )}
      <AdBanner />
    </SafeAreaView>
  );
}

// ── Modal sélection stores ──
function StoreSelectorModal({ visible, selected, onToggle, onClose, userIsPremium, navigation }) {
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={onClose}>
        <View style={styles.modalSheet}>
          <View style={styles.modalHandle} />
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>🏪 My Stores</Text>
            <TouchableOpacity onPress={onClose} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
              <Text style={{ color: COLORS.text3, fontSize: 16 }}>✕</Text>
            </TouchableOpacity>
          </View>
          {!userIsPremium && (
            <View style={styles.limitBanner}>
              <Text style={styles.limitBannerText}>🔒 Free: {selected.length}/{FREE_MAX_STORES} stores — </Text>
              <TouchableOpacity onPress={() => { onClose(); navigation.navigate('Premium'); }}>
                <Text style={styles.limitBannerLink}> ⭐ Upgrade</Text>
              </TouchableOpacity>
            </View>
          )}
          <ScrollView>
            {ALL_STORES.map(store => {
              const isSelected = selected.includes(store.id);
              const isDisabled = !userIsPremium && !isSelected && selected.length >= FREE_MAX_STORES;
              return (
                <TouchableOpacity
                  key={store.id}
                  style={[styles.storeRow, isSelected && styles.storeRowActive, isDisabled && styles.storeRowDisabled]}
                  onPress={() => {
                    if (isDisabled) {
                      Alert.alert('Limit reached', `Free version: ${FREE_MAX_STORES} stores max.`, [
                        { text: 'Cancel', style: 'cancel' },
                        { text: '⭐ Upgrade', onPress: () => { onClose(); navigation.navigate('Premium'); } },
                      ]);
                      return;
                    }
                    onToggle(store.id);
                  }}
                >
                  <StoreLogo store={store} size={22} />
                  <Text style={[styles.storeRowName, isDisabled && { color: COLORS.text4 }]}>
                    {store.name}
                  </Text>
                  {isDisabled && <Text style={styles.lockIcon}>🔒</Text>}
                  {isSelected && <View style={styles.checkBox}><Text style={styles.checkMark}>✓</Text></View>}
                  {!isSelected && !isDisabled && <View style={styles.emptyBox} />}
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </View>
      </TouchableOpacity>
    </Modal>
  );
}

// ── Écran principal ──
export default function StoreDealsScreen({ navigation }) {
  const [favoriteStores, setFavoriteStores] = useState(['1', '7', '25']);
  const [storeDeals, setStoreDeals] = useState({});
  const [loadingStores, setLoadingStores] = useState({});
  const [showSelector, setShowSelector] = useState(false);
  const [userIsPremium, setUserIsPremium] = useState(false);
  const [currency] = useState('CAD');
  // Vue détail store
  const [selectedStore, setSelectedStore] = useState(null);

  useFocusEffect(
    useCallback(() => {
      isPremium().then(setUserIsPremium);
      loadFavoriteStores();
    }, [])
  );

  const loadFavoriteStores = async () => {
    try {
      const stored = await AsyncStorage.getItem(FAVORITE_STORES_KEY);
      const stores = stored ? JSON.parse(stored) : ['1', '7', '25'];
      setFavoriteStores(stores);
      stores.forEach(id => loadDealsForStore(id));
    } catch {
      ['1', '7', '25'].forEach(id => loadDealsForStore(id));
    }
  };

  const saveFavoriteStores = async (stores) => {
    try {
      await AsyncStorage.setItem(FAVORITE_STORES_KEY, JSON.stringify(stores));
    } catch {}
  };

  const toggleStore = (storeId) => {
    setFavoriteStores(prev => {
      const newList = prev.includes(storeId)
        ? prev.filter(id => id !== storeId)
        : [...prev, storeId];
      saveFavoriteStores(newList);
      if (!prev.includes(storeId)) loadDealsForStore(storeId);
      return newList;
    });
  };

  const loadDealsForStore = async (storeId) => {
    setLoadingStores(prev => ({ ...prev, [storeId]: true }));
    const deals = await fetchDealsForStore(storeId);
    setStoreDeals(prev => ({ ...prev, [storeId]: deals }));
    setLoadingStores(prev => ({ ...prev, [storeId]: false }));
  };

  const handleDealPress = (deal) => {
    navigation.navigate('Detail', {
      game: {
        id: deal.gameID,
        cheapsharkId: deal.gameID,
        title: deal.title,
        imageUrl: deal.imageUrl,
        metacritic: deal.metacritic,
        platform: 'PC',
        type: 'Digital',
        prices: [{ price: deal.salePrice, normalPrice: deal.normalPrice, savings: deal.savings, store: deal.storeId }],
      },
      currency,
    });
  };

  const selectedStoreObjects = ALL_STORES.filter(s => favoriteStores.includes(s.id));

  // ── Affiche la vue détail si un store est sélectionné ──
  if (selectedStore) {
    return (
      <StoreDetailView
        store={selectedStore}
        onBack={() => setSelectedStore(null)}
        onDealPress={handleDealPress}
        currency={currency}
      />
    );
  }

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.header}>
        <View style={styles.headerTop}>
          <Text style={styles.title}>🏪 Store Deals</Text>
          <TouchableOpacity style={styles.editBtn} onPress={() => setShowSelector(true)} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
            <Text style={styles.editBtnText}>✏️ Edit</Text>
          </TouchableOpacity>
        </View>
        <Text style={styles.subtitle}>
          {userIsPremium
            ? `${favoriteStores.length} stores · Top ${DEALS_PER_STORE} deals each`
            : `${favoriteStores.length}/${FREE_MAX_STORES} stores · Top ${DEALS_PER_STORE} deals each`}
        </Text>
      </View>

      {favoriteStores.length === 0 ? (
        <View style={styles.empty}>
          <Text style={{ fontSize: 52, marginBottom: 16 }}>🏪</Text>
          <Text style={styles.emptyTitle}>No stores selected</Text>
          <Text style={styles.emptyText}>Tap Edit to choose your favorite stores</Text>
          <TouchableOpacity style={styles.emptyBtn} onPress={() => setShowSelector(true)}>
            <Text style={styles.emptyBtnText}>✏️ Choose Stores</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={selectedStoreObjects}
          keyExtractor={item => item.id}
          contentContainerStyle={styles.list}
          renderItem={({ item: store }) => (
            <StoreSection
              store={store}
              deals={storeDeals[store.id] || []}
              loading={loadingStores[store.id] || false}
              onDealPress={handleDealPress}
              onSeeAll={(s) => setSelectedStore(s)}
              currency={currency}
            />
          )}
          ItemSeparatorComponent={() => <View style={{ height: 8 }} />}
        />
      )}

      <AdBanner />

      <StoreSelectorModal
        visible={showSelector}
        selected={favoriteStores}
        onToggle={toggleStore}
        onClose={() => setShowSelector(false)}
        userIsPremium={userIsPremium}
        navigation={navigation}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: COLORS.bg },
  header: { backgroundColor: COLORS.surface, borderBottomWidth: 1, borderBottomColor: COLORS.border, paddingHorizontal: 16, paddingTop: Platform.OS === 'android' ? 8 : 16, paddingBottom: 16 },
  headerTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 },
  title: { fontSize: 24, fontWeight: '800', color: COLORS.text },
  editBtn: { backgroundColor: 'rgba(99,102,241,0.15)', borderRadius: 20, paddingHorizontal: 14, paddingVertical: 7, borderWidth: 1, borderColor: 'rgba(99,102,241,0.3)' },
  editBtnText: { fontSize: 13, fontWeight: '700', color: '#a5b4fc' },
  subtitle: { fontSize: 13, color: COLORS.text3 },
  list: { padding: 16, paddingBottom: 16 },

  // Store section
  storeSection: { backgroundColor: COLORS.surface2, borderRadius: 16, borderWidth: 1, borderColor: COLORS.border, overflow: 'hidden', marginBottom: 12 },
  storeHeader: { flexDirection: 'row', alignItems: 'center', padding: 14, borderBottomWidth: 1, borderBottomColor: COLORS.border, borderLeftWidth: 4, gap: 10 },
  storeHeaderName: { fontSize: 15, fontWeight: '800', color: COLORS.text, flex: 1 },
  storeDealsCount: { fontSize: 11, color: COLORS.text4, fontWeight: '600' },

  // See all button
  seeAllBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 14, borderTopWidth: 1, borderTopColor: COLORS.border, gap: 6 },
  seeAllText: { fontSize: 13, fontWeight: '700', color: COLORS.primary },
  seeAllArrow: { fontSize: 14, color: COLORS.primary, fontWeight: '800' },

  // Detail header
  detailHeader: { backgroundColor: COLORS.surface, borderBottomWidth: 1, borderBottomColor: COLORS.border, paddingHorizontal: 16, paddingTop: Platform.OS === 'android' ? 8 : 12, paddingBottom: 14 },
  backBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 10 },
  backArrow: { fontSize: 18, color: COLORS.primary, fontWeight: '800' },
  backText: { fontSize: 14, color: COLORS.primary, fontWeight: '700' },
  detailStoreInfo: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  detailStoreName: { fontSize: 20, fontWeight: '800', color: COLORS.text },
  detailCount: { fontSize: 10, fontWeight: '800', color: COLORS.text4, letterSpacing: 1, textTransform: 'uppercase', marginBottom: 12 },

  // Loading
  loadingWrap: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12 },
  loadingText: { fontSize: 14, color: COLORS.text3, fontWeight: '600' },

  // Deal card
  dealCard: { flexDirection: 'row', alignItems: 'center', padding: 10, borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.04)', backgroundColor: COLORS.surface2, borderRadius: 10 },
  dealThumb: { width: 64, height: 48, borderRadius: 8, backgroundColor: '#1a1a2e', overflow: 'hidden', position: 'relative' },
  dealThumbImg: { width: '100%', height: '100%' },
  dealThumbPlaceholder: { width: '100%', height: '100%', alignItems: 'center', justifyContent: 'center' },
  savingsBadge: { position: 'absolute', bottom: 0, left: 0, right: 0, alignItems: 'center', paddingVertical: 2 },
  savingsBadgeText: { fontSize: 8, fontWeight: '800', color: '#fff' },
  dealBody: { flex: 1, paddingHorizontal: 10 },
  dealTitle: { fontSize: 12, fontWeight: '700', color: COLORS.text, marginBottom: 4, lineHeight: 16 },
  mcBadge: { alignSelf: 'flex-start', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 },
  mcText: { fontSize: 9, fontWeight: '800', color: '#fff' },
  dealRight: { alignItems: 'flex-end', minWidth: 64 },
  dealSalePrice: { fontSize: 14, fontWeight: '800', color: COLORS.green },
  dealCurrency: { fontSize: 8, color: COLORS.text3 },
  dealNormalPrice: { fontSize: 10, color: COLORS.text4, textDecorationLine: 'line-through' },
  noDeals: { padding: 20, alignItems: 'center' },
  noDealsText: { fontSize: 12, color: COLORS.text4 },

  // Empty state
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 40 },
  emptyTitle: { fontSize: 20, fontWeight: '800', color: COLORS.text2, marginBottom: 8 },
  emptyText: { fontSize: 14, color: COLORS.text3, textAlign: 'center', marginBottom: 24 },
  emptyBtn: { backgroundColor: COLORS.primary, borderRadius: 14, paddingHorizontal: 24, paddingVertical: 14 },
  emptyBtnText: { fontSize: 14, fontWeight: '800', color: '#fff' },

  // Modal
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'flex-end' },
  modalSheet: { backgroundColor: COLORS.surface, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24, paddingBottom: Platform.OS === 'android' ? 40 : 40, maxHeight: '85%' },
  modalHandle: { width: 40, height: 4, backgroundColor: COLORS.border, borderRadius: 4, alignSelf: 'center', marginBottom: 16 },
  modalHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 },
  modalTitle: { fontSize: 18, fontWeight: '800', color: COLORS.text },
  limitBanner: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(251,191,36,0.1)', borderRadius: 10, padding: 10, marginBottom: 12, borderWidth: 1, borderColor: 'rgba(251,191,36,0.25)' },
  limitBannerText: { fontSize: 13, color: '#fbbf24', fontWeight: '600' },
  limitBannerLink: { fontSize: 13, color: '#fbbf24', fontWeight: '800', textDecorationLine: 'underline' },
  storeRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: COLORS.border, gap: 12 },
  storeRowActive: { backgroundColor: 'rgba(99,102,241,0.08)', borderRadius: 10, paddingHorizontal: 10, marginHorizontal: -10 },
  storeRowDisabled: { opacity: 0.5 },
  storeRowName: { flex: 1, fontSize: 15, fontWeight: '600', color: COLORS.text },
  lockIcon: { fontSize: 14, marginRight: 4 },
  checkBox: { width: 22, height: 22, borderRadius: 6, backgroundColor: COLORS.primary, alignItems: 'center', justifyContent: 'center' },
  checkMark: { fontSize: 13, fontWeight: '800', color: '#fff' },
  emptyBox: { width: 22, height: 22, borderRadius: 6, borderWidth: 1.5, borderColor: COLORS.border },
});
