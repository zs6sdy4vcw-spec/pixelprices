import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, FlatList, TouchableOpacity, TextInput,
  Image, StyleSheet, ActivityIndicator,
  RefreshControl, Modal, Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { COLORS, RAWG_API_KEY } from '../constants/theme';
import i18n from '../services/i18n';
import AdBanner from '../components/AdBanner';
import { fetchNewReleases, fetchDealsPage } from '../services/gameData';

const LOGO = require('../assets/icons/icon.png');
const CURRENCIES = [
  { code: 'CAD', label: '🇨🇦 CAD', rate: 1.37 },
  { code: 'USD', label: '🇺🇸 USD', rate: 1.00 },
  { code: 'EUR', label: '🇪🇺 EUR', rate: 0.92 },
  { code: 'GBP', label: '🇬🇧 GBP', rate: 0.79 },
  { code: 'AUD', label: '🇦🇺 AUD', rate: 1.53 },
  { code: 'MXN', label: '🇲🇽 MXN', rate: 17.15 },
  { code: 'BRL', label: '🇧🇷 BRL', rate: 5.05 },
  { code: 'JPY', label: '🇯🇵 JPY', rate: 149.50 },
];

function convertPrice(usdPrice, currency) {
  const cur = CURRENCIES.find(c => c.code === currency) || CURRENCIES[0];
  return usdPrice * cur.rate;
}

function MetaBadge({ score }) {
  if (!score) return null;
  const bg = score >= 90 ? '#16a34a' : score >= 75 ? '#ca8a04' : '#dc2626';
  return (
    <View style={[styles.badge, { backgroundColor: bg, flexDirection: 'row', alignItems: 'center', gap: 4 }]}>
      <Text style={styles.badgeText}>MC</Text>
      <View style={styles.mcScorePill}>
        <Text style={styles.mcScoreText}>{score}</Text>
      </View>
    </View>
  );
}

function DaysAgoBadge({ releaseDate }) {
  if (!releaseDate) return null;
  const days = Math.round((new Date() - new Date(releaseDate)) / (1000 * 60 * 60 * 24));
  let label;
  if (days === 0) {
    label = i18n('today');
  } else if (days === 1) {
    label = i18n('yesterday');
  } else {
    const prefix = i18n('daysAgoPrefix');
    const suffix = i18n('days');
    label = prefix ? `${prefix} ${days} ${suffix}` : `${days} ${suffix}`;
  }
  return (
    <View style={[styles.badge, { backgroundColor: 'rgba(74,222,128,0.2)' }]}>
      <Text style={[styles.badgeText, { color: COLORS.green }]}>🆕 {label}</Text>
    </View>
  );
}

function GameCard({ game, onPress, currency }) {
  const validPrices = game.prices.filter(p => p.price > 0);
  const minUSD = validPrices.length ? Math.min(...validPrices.map(p => p.price)) : 0;
  const maxNormal = validPrices.length ? Math.max(...validPrices.map(p => p.normalPrice || p.price)) : 0;
  const converted = minUSD > 0 ? convertPrice(minUSD, currency) : null;
  const savedConverted = (maxNormal - minUSD) > 0.5 ? convertPrice(maxNormal - minUSD, currency) : 0;
  const maxDiscount = validPrices.length ? Math.max(...validPrices.map(p => parseFloat(p.savings) || 0)) : 0;

  return (
    <TouchableOpacity style={styles.card} onPress={() => onPress(game)} activeOpacity={0.75}>
      <View style={styles.cardImg}>
        {game.imageUrl
          ? <Image source={{ uri: game.imageUrl }} style={styles.cardImgInner} resizeMode="cover" />
          : <View style={styles.skeleton}><Text style={{ fontSize: 22 }}>🖥️</Text></View>
        }
        {maxDiscount >= 50 && (
          <View style={[styles.discountOverlay, { backgroundColor: maxDiscount >= 75 ? '#dc2626' : '#d97706' }]}>
            <Text style={styles.discountOverlayText}>-{Math.round(maxDiscount)}%</Text>
          </View>
        )}
      </View>
      <View style={styles.cardBody}>
        <Text style={styles.cardTitle} numberOfLines={2}>{game.title}</Text>
        <View style={styles.cardMeta}>
          <View style={[styles.badge, { backgroundColor: 'rgba(74,222,128,0.15)' }]}>
            <Text style={[styles.badgeText, { color: COLORS.green }]}>💻 PC</Text>
          </View>
          <MetaBadge score={game.metacritic} />
          {game.releaseDate && <DaysAgoBadge releaseDate={game.releaseDate} />}
        </View>
        <Text style={styles.cardStores}>
          {validPrices.length} {i18n('stores', validPrices.length)}
        </Text>
      </View>
      <View style={styles.cardRight}>
        {converted ? (
          <>
            <Text style={styles.bestPrice}>{converted.toFixed(2)}</Text>
            <Text style={styles.bestCurrency}>{currency}</Text>
            {savedConverted > 0.5 && <Text style={styles.savings}>-{savedConverted.toFixed(0)}</Text>}
          </>
        ) : <Text style={styles.noPrice}>—</Text>}
      </View>
    </TouchableOpacity>
  );
}

function CurrencyPicker({ visible, current, onSelect, onClose }) {
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={onClose}>
        <View style={styles.modalSheet}>
          <View style={styles.modalHandle} />
          <Text style={styles.modalTitle}>{i18n('chooseCurrency')}</Text>
          {CURRENCIES.map(cur => (
            <TouchableOpacity
              key={cur.code}
              style={[styles.currencyRow, current === cur.code && styles.currencyRowActive]}
              onPress={() => { onSelect(cur.code); onClose(); }}
            >
              <Text style={styles.currencyLabel}>{cur.label}</Text>
              <Text style={styles.currencyRate}>1 USD = {cur.rate} {cur.code}</Text>
              {current === cur.code && <Text style={styles.currencyCheck}>✓</Text>}
            </TouchableOpacity>
          ))}
        </View>
      </TouchableOpacity>
    </Modal>
  );
}

export default function HomeScreen({ navigation }) {
  const TABS = [
    { id: 'new',     label: i18n('tabNew')     },
    { id: 'hot',     label: i18n('tabHot')     },
    { id: 'savings', label: i18n('tabSavings') },
  ];

  const [activeTab, setActiveTab] = useState('new');
  const [tabData, setTabData]       = useState({ new: [], hot: [], savings: [] });
  const [tabPage, setTabPage]       = useState({ new: 1,  hot: 1,  savings: 1  });
  const [tabHasMore, setTabHasMore] = useState({ new: false, hot: true, savings: true });
  const [tabLoading, setTabLoading] = useState({ new: true, hot: false, savings: false });
  const [loadingMore, setLoadingMore] = useState(false);
  const [search, setSearch] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [searching, setSearching] = useState(false);
  const [currency, setCurrency] = useState('CAD');
  const [showPicker, setShowPicker] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const curInfo = CURRENCIES.find(c => c.code === currency);

  const loadTab = useCallback(async (tabId, force = false) => {
    if (!force && tabData[tabId].length > 0) return;
    setTabLoading(prev => ({ ...prev, [tabId]: true }));
    let result = { data: [], hasMore: false };
    if (tabId === 'new')     result = await fetchNewReleases();
    if (tabId === 'hot')     result = await fetchDealsPage('Trending', 1);
    if (tabId === 'savings') result = await fetchDealsPage('Savings', 1, '&minSavings=50');
    setTabData(prev => ({ ...prev, [tabId]: result.data }));
    setTabPage(prev => ({ ...prev, [tabId]: 1 }));
    setTabHasMore(prev => ({ ...prev, [tabId]: result.hasMore }));
    setTabLoading(prev => ({ ...prev, [tabId]: false }));
  }, [tabData]);

  const loadMore = useCallback(async () => {
    if (loadingMore || !tabHasMore[activeTab] || activeTab === 'new') return;
    setLoadingMore(true);
    const nextPage = tabPage[activeTab] + 1;
    let result = { data: [], hasMore: false };
    if (activeTab === 'hot')     result = await fetchDealsPage('Trending', nextPage);
    if (activeTab === 'savings') result = await fetchDealsPage('Savings', nextPage, '&minSavings=50');
    const existingIds = new Set(tabData[activeTab].map(g => g.id));
    const newItems = result.data.filter(g => !existingIds.has(g.id));
    setTabData(prev => ({ ...prev, [activeTab]: [...prev[activeTab], ...newItems] }));
    setTabPage(prev => ({ ...prev, [activeTab]: nextPage }));
    setTabHasMore(prev => ({ ...prev, [activeTab]: result.hasMore && newItems.length > 0 }));
    setLoadingMore(false);
  }, [activeTab, tabPage, tabHasMore, tabData, loadingMore]);

  useEffect(() => { loadTab('new'); }, []);
  useEffect(() => { loadTab(activeTab); }, [activeTab]);

  useEffect(() => {
    if (!search.trim()) { setSearchResults([]); return; }
    const timer = setTimeout(async () => {
      setSearching(true);
      try {
        const res = await fetch(`https://www.cheapshark.com/api/1.0/games?title=${encodeURIComponent(search)}&limit=20`, { headers: { 'User-Agent': 'PixelPrices/1.0 (pixelpricesapp@gmail.com)', 'Accept': 'application/json' } });
        if (!res.ok) { setSearching(false); return; }
        const games = await res.json();
        if (!Array.isArray(games)) { setSearching(false); return; }
        setSearchResults(games.map(g => ({
          id: g.gameID, cheapsharkId: g.gameID,
          title: g.external, platform: 'PC', type: 'Digital',
          metacritic: null, imageUrl: g.thumb || null,
          prices: [{ price: parseFloat(g.cheapest) || 0, normalPrice: 0, savings: 0 }],
        })));
      } catch {}
      setSearching(false);
    }, 500);
    return () => clearTimeout(timer);
  }, [search]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    setTabData(prev => ({ ...prev, [activeTab]: [] }));
    await loadTab(activeTab, true);
    setRefreshing(false);
  }, [activeTab]);

  const displayData = search.trim() ? searchResults : tabData[activeTab];
  const isLoading = search.trim() ? searching : tabLoading[activeTab];

  const getSectionLabel = () => {
    if (search.trim()) return `🔍 ${displayData.length} ${i18n('results', displayData.length)}`;
    if (activeTab === 'new')     return `🆕 ${displayData.length} ${i18n('newGames')}`;
    if (activeTab === 'hot')     return `🔥 ${displayData.length} ${i18n('hotGames')}`;
    return `💸 ${displayData.length} ${i18n('savingsGames')}`;
  };

  const getLoadingText = () => {
    if (activeTab === 'new')     return i18n('loadingNew');
    if (activeTab === 'hot')     return i18n('loadingHot');
    return i18n('loadingSavings');
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.header}>
        <View style={styles.headerTop}>
          <View style={styles.logoRow}>
            <Image source={LOGO} style={styles.logoImg} resizeMode="contain" />
            <Text style={styles.logoText}>Pixel<Text style={{ color: '#4ade80' }}>Prices</Text></Text>
          </View>
          <TouchableOpacity style={styles.currencyBtn} onPress={() => setShowPicker(true)} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
            <Text style={styles.currencyBtnFlag}>{curInfo?.label.split(' ')[0]}</Text>
            <Text style={styles.currencyBtnCode}>{currency}</Text>
            <Text style={styles.currencyBtnArrow}>▾</Text>
          </TouchableOpacity>
        </View>
        <View style={styles.rateBar}>
          <Text style={styles.rateBarText}>💱 1 USD = {curInfo?.rate} {currency}</Text>
        </View>
        <View style={styles.searchWrap}>
          <Text style={styles.searchIcon}>🔍</Text>
          <TextInput
            style={styles.searchInput}
            placeholder={i18n('searchPlaceholder')}
            placeholderTextColor={COLORS.text4}
            value={search}
            onChangeText={setSearch}
          />
          {searching && <ActivityIndicator size="small" color={COLORS.primary} />}
          {search.length > 0 && !searching && (
            <TouchableOpacity onPress={() => setSearch('')} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
              <Text style={{ color: COLORS.text3, fontSize: 16 }}>✕</Text>
            </TouchableOpacity>
          )}
        </View>
        {!search.trim() && (
          <View style={styles.tabs}>
            {TABS.map(tab => (
              <TouchableOpacity
                key={tab.id}
                style={[styles.tab, activeTab === tab.id && styles.tabActive]}
                onPress={() => setActiveTab(tab.id)}
                hitSlop={{ top: 4, bottom: 4 }}
              >
                <Text style={[styles.tabText, activeTab === tab.id && styles.tabTextActive]}>{tab.label}</Text>
                {activeTab === tab.id && <View style={styles.tabIndicator} />}
              </TouchableOpacity>
            ))}
          </View>
        )}
      </View>

      {isLoading ? (
        <View style={styles.loadingWrap}>
          <ActivityIndicator size="large" color={COLORS.primary} />
          <Text style={styles.loadingText}>{getLoadingText()}</Text>
          <Text style={styles.loadingSubtext}>{i18n('loadingSub')}</Text>
        </View>
      ) : (
        <FlatList
          data={displayData}
          keyExtractor={item => String(item.id)}
          contentContainerStyle={styles.list}
          refreshControl={
            !search.trim()
              ? <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={COLORS.primary} />
              : undefined
          }
          ListHeaderComponent={<Text style={styles.sectionLabel}>{getSectionLabel()}</Text>}
          ListFooterComponent={loadingMore ? (
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, padding: 20 }}>
              <ActivityIndicator size="small" color={COLORS.primary} />
              <Text style={{ fontSize: 13, color: COLORS.text3, fontWeight: '600' }}>Loading more...</Text>
            </View>
          ) : null}
          onEndReached={() => { if (!search.trim()) loadMore(); }}
          onEndReachedThreshold={0.3}
          ListEmptyComponent={
            <View style={styles.empty}>
              <Text style={{ fontSize: 44, marginBottom: 12 }}>
                {activeTab === 'new' ? '🆕' : activeTab === 'hot' ? '🔥' : '💸'}
              </Text>
              <Text style={styles.emptyTitle}>{i18n('noResults')}</Text>
              <Text style={styles.emptyText}>{i18n('pullRefresh')}</Text>
            </View>
          }
          renderItem={({ item }) => (
            <GameCard game={item} currency={currency} onPress={game => navigation.navigate('Detail', { game, currency })} />
          )}
          ItemSeparatorComponent={() => <View style={{ height: 10 }} />}
        />
      )}

      <AdBanner />
      <CurrencyPicker visible={showPicker} current={currency} onSelect={setCurrency} onClose={() => setShowPicker(false)} />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: COLORS.bg },
  header: { backgroundColor: COLORS.surface, borderBottomWidth: 1, borderBottomColor: COLORS.border, paddingHorizontal: 16, paddingTop: Platform.OS === 'android' ? 8 : 12, paddingBottom: 0 },
  headerTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 },
  logoRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  logoImg: { width: 32, height: 32, borderRadius: 8 },
  logoText: { fontSize: 20, fontWeight: '800', color: '#fff', letterSpacing: -0.5 },
  currencyBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: 'rgba(99,102,241,0.15)', borderRadius: 20, paddingHorizontal: 12, paddingVertical: Platform.OS === 'android' ? 9 : 7, borderWidth: 1, borderColor: 'rgba(99,102,241,0.3)' },
  currencyBtnFlag: { fontSize: 16 },
  currencyBtnCode: { fontSize: 13, fontWeight: '800', color: '#a5b4fc' },
  currencyBtnArrow: { fontSize: 10, color: '#a5b4fc' },
  rateBar: { backgroundColor: 'rgba(255,255,255,0.04)', borderRadius: 8, paddingHorizontal: 10, paddingVertical: 5, marginBottom: 10, alignSelf: 'flex-start' },
  rateBarText: { fontSize: 11, color: COLORS.text4, fontWeight: '600' },
  searchWrap: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: 12, borderWidth: 1, borderColor: COLORS.border, paddingHorizontal: 12, paddingVertical: Platform.OS === 'android' ? 12 : 10, marginBottom: 12, gap: 8 },
  searchIcon: { fontSize: 14 },
  searchInput: { flex: 1, color: COLORS.text, fontSize: 14 },
  tabs: { flexDirection: 'row', borderTopWidth: 1, borderTopColor: COLORS.border, marginHorizontal: -16 },
  tab: { flex: 1, alignItems: 'center', paddingVertical: Platform.OS === 'android' ? 14 : 12, position: 'relative' },
  tabText: { fontSize: 11, fontWeight: '700', color: COLORS.text3 },
  tabTextActive: { color: COLORS.primary },
  tabIndicator: { position: 'absolute', bottom: 0, left: 16, right: 16, height: 2, backgroundColor: COLORS.primary, borderRadius: 2 },
  list: { padding: 16, paddingBottom: 80 },
  sectionLabel: { fontSize: 10, fontWeight: '800', color: COLORS.text4, letterSpacing: 1, textTransform: 'uppercase', marginBottom: 12 },
  loadingWrap: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12 },
  loadingText: { fontSize: 14, color: COLORS.text3, fontWeight: '700', textAlign: 'center', paddingHorizontal: 32 },
  loadingSubtext: { fontSize: 11, color: COLORS.text4 },
  card: { flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.surface2, borderRadius: 14, borderWidth: 1, borderColor: COLORS.border, overflow: 'hidden' },
  cardImg: { width: 80, height: 80, backgroundColor: '#1a1a2e', position: 'relative' },
  cardImgInner: { width: 80, height: 80 },
  skeleton: { width: 80, height: 80, alignItems: 'center', justifyContent: 'center' },
  discountOverlay: { position: 'absolute', bottom: 0, left: 0, right: 0, paddingVertical: 3, alignItems: 'center' },
  discountOverlayText: { fontSize: 9, fontWeight: '800', color: '#fff' },
  cardBody: { flex: 1, padding: 10 },
  cardTitle: { fontSize: 13, fontWeight: '700', color: COLORS.text, marginBottom: 5, lineHeight: 18 },
  cardMeta: { flexDirection: 'row', gap: 4, flexWrap: 'wrap', marginBottom: 4 },
  badge: { paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6 },
  badgeText: { fontSize: 9, fontWeight: '800', color: '#fff' },
  mcScorePill: { backgroundColor: 'rgba(255,255,255,0.25)', borderRadius: 4, paddingHorizontal: 5, paddingVertical: 1 },
  mcScoreText: { fontSize: 10, fontWeight: '900', color: '#fff' },
  cardStores: { fontSize: 10, color: COLORS.text4, fontWeight: '600' },
  cardRight: { alignItems: 'flex-end', paddingRight: 12, minWidth: 72 },
  bestPrice: { fontSize: 16, fontWeight: '800', color: COLORS.green },
  bestCurrency: { fontSize: 9, color: COLORS.text3, fontWeight: '600' },
  savings: { fontSize: 11, fontWeight: '700', color: COLORS.red, marginTop: 2 },
  noPrice: { fontSize: 12, color: COLORS.text3 },
  empty: { alignItems: 'center', paddingTop: 60, paddingHorizontal: 32, gap: 8 },
  emptyTitle: { fontSize: 18, fontWeight: '800', color: COLORS.text2 },
  emptyText: { fontSize: 13, color: COLORS.text3, textAlign: 'center', lineHeight: 20 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'flex-end' },
  modalSheet: { backgroundColor: COLORS.surface, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24, paddingBottom: Platform.OS === 'android' ? 40 : 40 },
  modalHandle: { width: 40, height: 4, backgroundColor: COLORS.border, borderRadius: 4, alignSelf: 'center', marginBottom: 20 },
  modalTitle: { fontSize: 18, fontWeight: '800', color: COLORS.text, marginBottom: 16 },
  currencyRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: COLORS.border },
  currencyRowActive: { backgroundColor: 'rgba(99,102,241,0.08)', borderRadius: 10, paddingHorizontal: 10, marginHorizontal: -10 },
  currencyLabel: { fontSize: 15, fontWeight: '700', color: COLORS.text, flex: 1 },
  currencyRate: { fontSize: 11, color: COLORS.text3, marginRight: 8 },
  currencyCheck: { fontSize: 16, color: COLORS.primary, fontWeight: '800' },
});
