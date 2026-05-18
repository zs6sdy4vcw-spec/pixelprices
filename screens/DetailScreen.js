import React, { useState, useEffect } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, Image,
  StyleSheet, SafeAreaView, Linking, Alert, ActivityIndicator, Platform,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { COLORS } from '../constants/theme';
import i18n from '../services/i18n';
import { isPremium, FREE_LIMITS } from '../services/premium';
import { showInterstitialIfReady } from '../components/AdBanner';

const CURRENCIES = {
  CAD: 1.37, USD: 1.00, EUR: 0.92,
  GBP: 0.79, AUD: 1.53, MXN: 17.15, BRL: 5.05, JPY: 149.50,
};

const STORE_LOGOS = {
  '1':  { name: 'Steam',          logo: 'https://store.steampowered.com/favicon.ico',  color: '#1b2838' },
  '2':  { name: 'GamersGate',     logo: 'https://www.gamersgate.com/favicon.ico',      color: '#e4202a' },
  '3':  { name: 'GreenManGaming', logo: 'https://www.greenmangaming.com/favicon.ico',  color: '#00a651' },
  '7':  { name: 'GOG',            logo: 'https://www.gog.com/favicon.ico',             color: '#86328a' },
  '8':  { name: 'EA App',         logo: 'https://www.ea.com/favicon.ico',              color: '#f56c2d' },
  '11': { name: 'Humble Store',   logo: 'https://www.humblebundle.com/favicon.ico',    color: '#cc2929' },
  '13': { name: 'Ubisoft',        logo: 'https://store.ubisoft.com/favicon.ico',       color: '#0070ff' },
  '15': { name: 'Fanatical',      logo: 'https://www.fanatical.com/favicon.ico',       color: '#e4202a' },
  '21': { name: 'WinGameStore',   logo: 'https://www.wingamestore.com/favicon.ico',    color: '#5c3d91' },
  '23': { name: 'GameBillet',     logo: 'https://www.gamebillet.com/favicon.ico',      color: '#e63946' },
  '24': { name: 'Voidu',          logo: 'https://www.voidu.com/favicon.ico',           color: '#ff6b35' },
  '25': { name: 'Epic Games',     logo: 'https://store.epicgames.com/favicon.ico',     color: '#2d2d2d' },
  '27': { name: 'Gamesplanet',    logo: 'https://www.gamesplanet.com/favicon.ico',     color: '#009e4f' },
  '28': { name: 'Games Load',     logo: 'https://www.gamesload.com/favicon.ico',       color: '#0078d4' },
  '29': { name: 'AllYouPlay',     logo: 'https://allyouplay.com/favicon.ico',          color: '#ff4500' },
};

function StoreLogo({ storeId, size = 26 }) {
  const [error, setError] = useState(false);
  const store = STORE_LOGOS[String(storeId)];
  if (!store || error) {
    return (
      <View style={[styles.logoFallback, { width: size, height: size, backgroundColor: store?.color || '#333' }]}>
        <Text style={{ fontSize: size * 0.5, color: '#fff' }}>{store?.name?.[0] || '?'}</Text>
      </View>
    );
  }
  return (
    <Image source={{ uri: store.logo }} style={{ width: size, height: size, borderRadius: 4 }} onError={() => setError(true)} />
  );
}

function PriceRow({ p, isFirst, currency }) {
  const rate = CURRENCIES[currency] || 1.37;
  const price = parseFloat(p.price) || 0;
  const normalPrice = parseFloat(p.normalPrice) || 0;
  const converted = (price * rate).toFixed(2);
  const normalConverted = normalPrice > price ? (normalPrice * rate).toFixed(2) : null;
  const discountPct = parseFloat(p.savings) || 0;

  return (
    <View style={[styles.priceRow, isFirst && styles.priceRowBest]}>
      <StoreLogo storeId={p.store} size={26} />
      <View style={{ flex: 1, marginLeft: 8 }}>
        <Text style={styles.storeName}>{p.storeName}</Text>
        {normalConverted && (
          <Text style={styles.normalPrice}>{i18n('normalPrice')}: {normalConverted} {currency}</Text>
        )}
      </View>
      {discountPct > 0 && (
        <View style={styles.discountBadge}>
          <Text style={styles.discountText}>-{Math.round(discountPct)}%</Text>
        </View>
      )}
      <View style={{ alignItems: 'flex-end', marginRight: 8 }}>
        <Text style={styles.priceIn}>{converted} {currency}</Text>
        <Text style={styles.priceUSD}>{price.toFixed(2)} USD</Text>
      </View>
      <TouchableOpacity style={styles.buyBtn} onPress={async () => {
        try { if (p.url) await Linking.openURL(p.url); }
        catch { Alert.alert(i18n('error'), i18n('errorLink')); }
      }}>
        <Text style={styles.buyBtnText}>{i18n('buyBtn')}</Text>
      </TouchableOpacity>
    </View>
  );
}

export default function DetailScreen({ route, navigation }) {
  const { game: initialGame, currency = 'CAD' } = route.params;
  const [prices, setPrices] = useState([]);
  const [imgUrl, setImgUrl] = useState(initialGame.imageUrl || null);
  const [metacritic, setMetacritic] = useState(initialGame.metacritic || null);
  const [loading, setLoading] = useState(true);
  const [isFavorite, setIsFavorite] = useState(false);
  const rate = CURRENCIES[currency] || 1.37;
  const FAV_KEY = `fav_${initialGame.id}`;

  useEffect(() => {
    AsyncStorage.getItem(FAV_KEY).then(val => { if (val) setIsFavorite(true); });
    // Affiche un interstitiel à l'ouverture du détail
    showInterstitialIfReady();
  }, []);

  const toggleFavorite = async () => {
    try {
      if (isFavorite) {
        await AsyncStorage.removeItem(FAV_KEY);
        setIsFavorite(false);
        Alert.alert(i18n('removedFav'), `"${initialGame.title}" ${i18n('removedFavDesc')}`);
      } else {
        // Vérifie la limite favoris avant d'ajouter
        const currentPremium = await isPremium();
        if (!currentPremium) {
          const keys = await AsyncStorage.getAllKeys();
          const favCount = keys.filter(k => k.startsWith('fav_')).length;
          if (favCount >= FREE_LIMITS.maxFavorites) {
            Alert.alert(
              i18n('premiumLimitReached'),
              i18n('favoriteLimitDesc'),
              [
                { text: i18n('cancel'), style: 'cancel' },
                { text: i18n('upgradeToPremium'), onPress: () => navigation.navigate('Premium') },
              ]
            );
            return;
          }
        }
        await AsyncStorage.setItem(FAV_KEY, JSON.stringify({ ...initialGame, imageUrl: imgUrl, metacritic }));
        setIsFavorite(true);
        Alert.alert(i18n('addedFav'), `"${initialGame.title}" ${i18n('addedFavDesc')}`);
      }
    } catch { Alert.alert(i18n('error'), i18n('errorSave')); }
  };

  useEffect(() => {
    const id = initialGame.cheapsharkId || initialGame.id;
    if (!id) { setLoading(false); return; }
    const load = async () => {
      try {
        const [gameRes, storeRes] = await Promise.all([
          fetch(`https://www.cheapshark.com/api/1.0/games?id=${id}`),
          fetch('https://www.cheapshark.com/api/1.0/stores'),
        ]);
        const gameData = await gameRes.json();
        const storeList = await storeRes.json();
        const storeMap = {};
        if (Array.isArray(storeList)) storeList.forEach(s => { storeMap[s.storeID] = s.storeName; });
        const mapped = (Array.isArray(gameData.deals) ? gameData.deals : [])
          .map(deal => ({
            store: deal.storeID,
            storeName: storeMap[deal.storeID] || STORE_LOGOS[deal.storeID]?.name || `Store ${deal.storeID}`,
            price: parseFloat(deal.price) || 0,
            normalPrice: parseFloat(deal.retailPrice) || 0,
            savings: parseFloat(deal.savings) || 0,
            url: `https://www.cheapshark.com/redirect?dealID=${deal.dealID}`,
          }))
          .filter(p => p.price > 0)
          .sort((a, b) => a.price - b.price);
        setPrices(mapped);
        try {
          const { RAWG_API_KEY } = require('../constants/theme');
          const r = await fetch(`https://api.rawg.io/api/games?key=${RAWG_API_KEY}&search=${encodeURIComponent(initialGame.title)}&page_size=1`);
          const d = await r.json();
          const result = d.results?.[0];
          if (result?.background_image && !imgUrl) setImgUrl(result.background_image);
          if (result?.metacritic) setMetacritic(result.metacritic);
        } catch {}
      } catch (e) { console.error(e); }
      setLoading(false);
    };
    load();
  }, []);

  const minUSD = prices.length ? Math.min(...prices.map(p => p.price)) : 0;
  const maxNormal = prices.length ? Math.max(...prices.map(p => p.normalPrice || p.price)) : 0;
  const minConverted = (minUSD * rate).toFixed(2);
  const savingsAmt = ((maxNormal - minUSD) * rate).toFixed(2);

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <Text style={styles.backText}>{i18n('back')}</Text>
        </TouchableOpacity>

        <View style={styles.heroContainer}>
          <View style={styles.hero}>
            {imgUrl
              ? <Image source={{ uri: imgUrl }} style={styles.heroImg} resizeMode="cover" />
              : <View style={styles.heroPlaceholder}><Text style={{ fontSize: 60 }}>🖥️</Text></View>
            }
            <View style={styles.heroOverlay}>
              <Text style={styles.heroTitle}>{initialGame.title}</Text>
              <View style={styles.heroBadges}>
                <View style={[styles.badge, { backgroundColor: 'rgba(99,102,241,0.5)' }]}>
                  <Text style={[styles.badgeText, { color: '#a5b4fc' }]}>{i18n('pcDigital')}</Text>
                </View>
                {metacritic && (
                  <View style={[styles.badge, {
                    backgroundColor: metacritic >= 90 ? '#16a34a' : metacritic >= 75 ? '#ca8a04' : '#dc2626',
                    flexDirection: 'row', gap: 4, alignItems: 'center',
                  }]}>
                    <Text style={styles.badgeText}>MC</Text>
                    <View style={styles.mcScore}>
                      <Text style={styles.mcScoreText}>{metacritic}</Text>
                    </View>
                  </View>
                )}
              </View>
            </View>
          </View>
          <TouchableOpacity style={styles.favBtn} onPress={toggleFavorite}>
            <Text style={styles.favBtnIcon}>{isFavorite ? '❤️' : '🤍'}</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.summary}>
          <View style={styles.summaryItem}>
            <Text style={styles.summaryLabel}>{i18n('bestPrice')}</Text>
            <Text style={styles.summaryValue}>{minUSD > 0 ? `${minConverted} ${currency}` : '—'}</Text>
          </View>
          <View style={styles.summaryDivider} />
          <View style={styles.summaryItem}>
            <Text style={styles.summaryLabel}>{i18n('savings')}</Text>
            <Text style={[styles.summaryValue, { color: COLORS.red }]}>
              {parseFloat(savingsAmt) > 0.5 ? `-${savingsAmt} ${currency}` : '—'}
            </Text>
          </View>
          <View style={styles.summaryDivider} />
          <View style={styles.summaryItem}>
            <Text style={styles.summaryLabel}>{i18n('storesLabel')}</Text>
            <Text style={styles.summaryValue}>{prices.length}</Text>
          </View>
        </View>

        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>{i18n('livePrices')}</Text>
            <View style={styles.liveBadge}><Text style={styles.liveText}>● LIVE</Text></View>
          </View>
          {loading ? (
            <View style={styles.loadingWrap}>
              <ActivityIndicator color={COLORS.primary} />
              <Text style={styles.loadingText}>{i18n('loadingPrices')}</Text>
            </View>
          ) : prices.length > 0 ? (
            prices.map((p, i) => <PriceRow key={`${p.store}-${i}`} p={p} isFirst={i === 0} currency={currency} />)
          ) : (
            <Text style={styles.noPrices}>{i18n('noDeals')}</Text>
          )}
        </View>

        <TouchableOpacity
          style={styles.alertCta}
          onPress={() => navigation.navigate('Main', {
            screen: 'Alerts',
            params: { gameTitle: initialGame.title, gamePrice: minUSD > 0 ? (minUSD * 0.8).toFixed(2) : '' }
          })}
        >
          <Text style={{ fontSize: 24 }}>🔔</Text>
          <View style={{ flex: 1 }}>
            <Text style={styles.alertCtaTitle}>{i18n('alertTitle')}</Text>
            <Text style={styles.alertCtaSub}>{i18n('alertSub')}</Text>
          </View>
          <Text style={{ fontSize: 18, color: COLORS.primary }}>→</Text>
        </TouchableOpacity>

        <View style={{ height: 40 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: COLORS.bg },
  backBtn: { padding: 16, paddingTop: Platform.OS === 'android' ? 8 : 16 },
  backText: { fontSize: 14, color: COLORS.text2, fontWeight: '700' },
  heroContainer: { marginHorizontal: 16, position: 'relative' },
  hero: { height: 220, borderRadius: 16, overflow: 'hidden', backgroundColor: '#1a1a2e' },
  heroImg: { position: 'absolute', width: '100%', height: '100%' },
  heroPlaceholder: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  heroOverlay: { position: 'absolute', bottom: 0, left: 0, right: 0, backgroundColor: 'rgba(0,0,0,0.65)', padding: 14 },
  heroTitle: { fontSize: 18, fontWeight: '800', color: '#fff', marginBottom: 6, lineHeight: 24 },
  heroBadges: { flexDirection: 'row', gap: 6, flexWrap: 'wrap', alignItems: 'center' },
  badge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
  badgeText: { fontSize: 10, fontWeight: '800', color: '#fff' },
  mcScore: { backgroundColor: 'rgba(255,255,255,0.25)', borderRadius: 4, paddingHorizontal: 5, paddingVertical: 1 },
  mcScoreText: { fontSize: 11, fontWeight: '900', color: '#fff' },
  favBtn: { position: 'absolute', top: 10, right: 10, zIndex: 10, backgroundColor: 'rgba(0,0,0,0.6)', borderRadius: 22, width: 44, height: 44, alignItems: 'center', justifyContent: 'center', borderWidth: 1.5, borderColor: 'rgba(255,255,255,0.2)' },
  favBtnIcon: { fontSize: 22 },
  summary: { flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.surface2, marginHorizontal: 16, marginTop: 12, borderRadius: 14, borderWidth: 1, borderColor: COLORS.border, padding: 16 },
  summaryItem: { flex: 1, alignItems: 'center' },
  summaryLabel: { fontSize: 10, color: COLORS.text3, fontWeight: '700', marginBottom: 4 },
  summaryValue: { fontSize: 14, fontWeight: '800', color: COLORS.green },
  summaryDivider: { width: 1, height: 30, backgroundColor: COLORS.border },
  section: { marginHorizontal: 16, marginTop: 20 },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 },
  sectionTitle: { fontSize: 10, fontWeight: '800', color: COLORS.text4, letterSpacing: 1, textTransform: 'uppercase' },
  liveBadge: { backgroundColor: 'rgba(74,222,128,0.15)', borderRadius: 20, paddingHorizontal: 8, paddingVertical: 3 },
  liveText: { fontSize: 9, fontWeight: '800', color: COLORS.green },
  loadingWrap: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 20, justifyContent: 'center' },
  loadingText: { fontSize: 13, color: COLORS.text3 },
  noPrices: { fontSize: 13, color: COLORS.text3, textAlign: 'center', padding: 20 },
  priceRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.surface2, borderRadius: 12, borderWidth: 1, borderColor: COLORS.border, padding: 12, marginBottom: 8 },
  priceRowBest: { borderColor: 'rgba(74,222,128,0.4)', backgroundColor: 'rgba(74,222,128,0.06)' },
  logoFallback: { borderRadius: 4, alignItems: 'center', justifyContent: 'center' },
  storeName: { fontSize: 13, fontWeight: '700', color: COLORS.text },
  normalPrice: { fontSize: 9, color: COLORS.text3, textDecorationLine: 'line-through' },
  discountBadge: { backgroundColor: 'rgba(248,113,113,0.2)', borderRadius: 6, paddingHorizontal: 6, paddingVertical: 2, marginRight: 4 },
  discountText: { fontSize: 10, fontWeight: '800', color: COLORS.red },
  priceIn: { fontSize: 14, fontWeight: '800', color: COLORS.green },
  priceUSD: { fontSize: 9, color: COLORS.text3 },
  buyBtn: { backgroundColor: COLORS.primary, borderRadius: 8, paddingHorizontal: 10, paddingVertical: 7 },
  buyBtnText: { fontSize: 11, fontWeight: '800', color: '#fff' },
  alertCta: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: 'rgba(99,102,241,0.12)', borderRadius: 14, borderWidth: 1, borderColor: 'rgba(99,102,241,0.3)', marginHorizontal: 16, marginTop: 16, padding: 16 },
  alertCtaTitle: { fontSize: 14, fontWeight: '800', color: COLORS.text, marginBottom: 2 },
  alertCtaSub: { fontSize: 11, color: COLORS.text3 },
});
