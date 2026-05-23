import React, { useState, useEffect } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet,
  ScrollView, Alert, ActivityIndicator, Platform, useWindowDimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { COLORS } from '../constants/theme';
import i18n from '../services/i18n';
import { isPremium, setPremium, restorePurchase, FREE_LIMITS } from '../services/premium';

const FEATURES_FREE = [
  { icon: '🔔', label: `${FREE_LIMITS.maxAlerts} ${i18n('alertsMax')}` },
  { icon: '❤️', label: `${FREE_LIMITS.maxFavorites} ${i18n('favoritesMax')}` },
  { icon: '📢', label: i18n('adsIncluded') },
  { icon: '💱', label: i18n('currencyFeature') },
  { icon: '🔍', label: i18n('searchFeature') },
];

const FEATURES_PREMIUM = [
  { icon: '🔔', label: i18n('unlimitedAlerts') },
  { icon: '❤️', label: i18n('unlimitedFavorites') },
  { icon: '🚫', label: i18n('noAds') },
  { icon: '💱', label: i18n('currencyFeature') },
  { icon: '🔍', label: i18n('searchFeature') },
  { icon: '⭐', label: i18n('premiumBadge') },
];

export default function PremiumScreen({ navigation }) {
  const { width } = useWindowDimensions();
  const isTablet = width >= 600;
  const [userIsPremium, setUserIsPremium] = useState(false);
  const [loading, setLoading] = useState(false);
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    isPremium().then(val => { setUserIsPremium(val); setChecking(false); });
  }, []);

  const handlePurchase = async () => {
    setLoading(true);
    try {
      Alert.alert(i18n('premiumTitle'), i18n('purchaseSimulated'), [
        { text: i18n('cancel'), style: 'cancel' },
        { text: i18n('confirmPurchase'), onPress: async () => {
          await setPremium(true);
          setUserIsPremium(true);
          Alert.alert(i18n('welcomePremium'), i18n('welcomePremiumDesc'));
        }},
      ]);
    } catch { Alert.alert(i18n('error'), i18n('purchaseError')); }
    setLoading(false);
  };

  const handleRestore = async () => {
    setLoading(true);
    try {
      const result = await restorePurchase();
      if (result.restored) {
        setUserIsPremium(true);
        Alert.alert(i18n('restoreSuccess'), i18n('restoreSuccessDesc'));
      } else {
        const stored = await AsyncStorage.getItem('pixelprices_premium');
        if (stored === 'true') {
          setUserIsPremium(true);
          Alert.alert(i18n('restoreSuccess'), i18n('restoreSuccessDesc'));
        } else {
          Alert.alert(i18n('restoreNotFound'), i18n('restoreNotFoundDesc'));
        }
      }
    } catch { Alert.alert(i18n('error'), i18n('restoreError')); }
    setLoading(false);
  };

  if (checking) return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ActivityIndicator size="large" color={COLORS.primary} style={{ flex: 1 }} />
    </SafeAreaView>
  );

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScrollView contentContainerStyle={styles.scroll}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
          <Text style={styles.backText}>{i18n('back')}</Text>
        </TouchableOpacity>
        <View style={styles.hero}>
          <Text style={styles.heroIcon}>⭐</Text>
          <Text style={styles.heroTitle}>Pixel<Text style={{ color: '#4ade80' }}>Prices</Text> Premium</Text>
          <Text style={styles.heroSub}>{i18n('premiumSubtitle')}</Text>
          {userIsPremium && (
            <View style={styles.activeBadge}>
              <Text style={styles.activeBadgeText}>✓ {i18n('premiumActive')}</Text>
            </View>
          )}
        </View>
        <View style={styles.comparisonWrap}>
          <View style={[styles.column, styles.columnFree]}>
            <Text style={styles.columnTitle}>{i18n('freeVersion')}</Text>
            {FEATURES_FREE.map((f, i) => (
              <View key={i} style={styles.featureRow}>
                <Text style={styles.featureIcon}>{f.icon}</Text>
                <Text style={styles.featureLabel}>{f.label}</Text>
              </View>
            ))}
          </View>
          <View style={[styles.column, styles.columnPremium]}>
            <Text style={styles.columnTitlePremium}>⭐ Premium</Text>
            {FEATURES_PREMIUM.map((f, i) => (
              <View key={i} style={styles.featureRow}>
                <Text style={styles.featureIcon}>{f.icon}</Text>
                <Text style={[styles.featureLabel, { color: COLORS.text }]}>{f.label}</Text>
              </View>
            ))}
          </View>
        </View>
        {!userIsPremium && (
          <>
            <View style={styles.priceWrap}>
              <Text style={styles.priceAmount}>$2.99</Text>
              <Text style={styles.priceLabel}>{i18n('oneTimePurchase')}</Text>
              <Text style={styles.priceNote}>{i18n('noSubscription')}</Text>
            </View>
            <TouchableOpacity style={[styles.buyBtn, loading && { opacity: 0.7 }]} onPress={handlePurchase} disabled={loading}>
              {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.buyBtnText}>{i18n('getPremium')} — $2.99</Text>}
            </TouchableOpacity>
            <TouchableOpacity style={styles.restoreBtn} onPress={handleRestore} disabled={loading}>
              <Text style={styles.restoreBtnText}>{i18n('restorePurchase')}</Text>
            </TouchableOpacity>
          </>
        )}
        {userIsPremium && (
          <View style={styles.premiumActiveWrap}>
            <Text style={styles.premiumActiveIcon}>🎉</Text>
            <Text style={styles.premiumActiveTitle}>{i18n('youArePremium')}</Text>
            <Text style={styles.premiumActiveSub}>{i18n('youArePremiumDesc')}</Text>
          </View>
        )}
        <Text style={styles.legal}>{i18n('premiumLegal')}</Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: COLORS.bg },
  scroll: { paddingBottom: 40, maxWidth: 700, alignSelf: 'center', width: '100%' },
  backBtn: { padding: 16, paddingTop: Platform.OS === 'android' ? 8 : 16 },
  backText: { fontSize: 14, color: COLORS.text2, fontWeight: '700' },
  hero: { alignItems: 'center', paddingVertical: 24, paddingHorizontal: 20 },
  heroIcon: { fontSize: 52, marginBottom: 12 },
  heroTitle: { fontSize: 28, fontWeight: '800', color: '#fff', marginBottom: 8 },
  heroSub: { fontSize: 14, color: COLORS.text3, textAlign: 'center', lineHeight: 20 },
  activeBadge: { marginTop: 12, backgroundColor: 'rgba(74,222,128,0.2)', borderRadius: 20, paddingHorizontal: 16, paddingVertical: 6, borderWidth: 1, borderColor: 'rgba(74,222,128,0.4)' },
  activeBadgeText: { fontSize: 13, fontWeight: '800', color: COLORS.green },
  comparisonWrap: { flexDirection: 'row', marginHorizontal: 16, gap: 12, marginBottom: 24 },
  column: { flex: 1, borderRadius: 16, padding: 16, borderWidth: 1 },
  columnFree: { backgroundColor: COLORS.surface2, borderColor: COLORS.border },
  columnPremium: { backgroundColor: 'rgba(99,102,241,0.12)', borderColor: 'rgba(99,102,241,0.4)' },
  columnTitle: { fontSize: 13, fontWeight: '800', color: COLORS.text3, marginBottom: 14, textAlign: 'center' },
  columnTitlePremium: { fontSize: 13, fontWeight: '800', color: '#a5b4fc', marginBottom: 14, textAlign: 'center' },
  featureRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 10 },
  featureIcon: { fontSize: 14 },
  featureLabel: { fontSize: 11, color: COLORS.text3, flex: 1, lineHeight: 16 },
  priceWrap: { alignItems: 'center', marginBottom: 20 },
  priceAmount: { fontSize: 48, fontWeight: '800', color: '#fff', letterSpacing: -1 },
  priceLabel: { fontSize: 14, color: COLORS.text3, marginTop: 4 },
  priceNote: { fontSize: 12, color: COLORS.text4, marginTop: 4 },
  buyBtn: { marginHorizontal: 16, padding: 18, borderRadius: 16, backgroundColor: COLORS.primary, alignItems: 'center' },
  buyBtnText: { fontSize: 16, fontWeight: '800', color: '#fff' },
  restoreBtn: { alignItems: 'center', paddingVertical: 16 },
  restoreBtnText: { fontSize: 13, color: COLORS.text3, fontWeight: '600' },
  premiumActiveWrap: { alignItems: 'center', padding: 32 },
  premiumActiveIcon: { fontSize: 52, marginBottom: 16 },
  premiumActiveTitle: { fontSize: 22, fontWeight: '800', color: COLORS.green, marginBottom: 8 },
  premiumActiveSub: { fontSize: 14, color: COLORS.text3, textAlign: 'center', lineHeight: 20 },
  legal: { fontSize: 10, color: COLORS.text4, textAlign: 'center', marginHorizontal: 32, marginTop: 16, lineHeight: 16 },
});
