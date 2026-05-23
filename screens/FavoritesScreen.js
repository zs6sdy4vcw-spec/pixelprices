import React, { useState, useCallback } from 'react';
import {
  View, Text, FlatList, TouchableOpacity,
  Image, StyleSheet, Alert, Platform, useWindowDimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { COLORS } from '../constants/theme';
import i18n from '../services/i18n';
import AdBanner from '../components/AdBanner';
import { isPremium, FREE_LIMITS } from '../services/premium';

export default function FavoritesScreen({ navigation }) {
  const { width } = useWindowDimensions();
  const isTablet = width >= 600;
  const [favorites, setFavorites] = useState([]);
  const [userIsPremium, setUserIsPremium] = useState(false);

  useFocusEffect(
    useCallback(() => {
      isPremium().then(setUserIsPremium);
      AsyncStorage.getAllKeys().then(keys => {
        const favKeys = (keys || []).filter(k => k.startsWith('fav_'));
        if (!favKeys.length) { setFavorites([]); return; }
        AsyncStorage.multiGet(favKeys).then(pairs => {
          const games = pairs.map(([, val]) => { try { return JSON.parse(val); } catch { return null; } }).filter(Boolean);
          setFavorites(games);
        });
      });
    }, [])
  );

  const remove = async (id) => {
    await AsyncStorage.removeItem(`fav_${id}`);
    setFavorites(prev => prev.filter(f => f.id !== id));
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.header}>
        <View style={styles.headerTop}>
          <Text style={styles.title}>{i18n('favoritesTitle')}</Text>
          {!userIsPremium && (
            <TouchableOpacity style={styles.premiumBadge} onPress={() => navigation.navigate('Premium')} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
              <Text style={styles.premiumBadgeText}>⭐ Premium</Text>
            </TouchableOpacity>
          )}
        </View>
        <Text style={styles.subtitle}>
          {userIsPremium
            ? `${favorites.length} ${i18n('favoritesSubtitle', favorites.length)}`
            : `${favorites.length}/${FREE_LIMITS.maxFavorites} ${i18n('favoritesSubtitle', favorites.length)}`}
        </Text>
      </View>

      <FlatList
        key={isTablet ? 'tablet' : 'phone'}
        data={favorites}
        keyExtractor={item => String(item.id)}
        numColumns={isTablet ? 2 : 1}
        columnWrapperStyle={isTablet ? { gap: 12, paddingHorizontal: 24 } : undefined}
        contentContainerStyle={[styles.list, isTablet && { paddingHorizontal: 0, paddingBottom: 100 }]}
        renderItem={({ item }) => (
          <TouchableOpacity style={[styles.card, isTablet && { flex: 1 }]} onPress={() => navigation.navigate('Detail', { game: item })} activeOpacity={0.75}>
            <View style={styles.cardImg}>
              {item.imageUrl
                ? <Image source={{ uri: item.imageUrl }} style={{ width: '100%', height: '100%' }} resizeMode="cover" />
                : <Text style={{ fontSize: 28 }}>🖥️</Text>
              }
            </View>
            <View style={styles.cardBody}>
              <Text style={styles.cardTitle} numberOfLines={2}>{item.title}</Text>
              <Text style={styles.cardSub}>{i18n('pcDigital')}</Text>
            </View>
            <TouchableOpacity style={styles.heartBtn} onPress={() => remove(item.id)} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
              <Text style={{ fontSize: 20 }}>❤️</Text>
            </TouchableOpacity>
          </TouchableOpacity>
        )}
        ItemSeparatorComponent={() => <View style={{ height: 12 }} />}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text style={{ fontSize: 52, marginBottom: 16 }}>🤍</Text>
            <Text style={styles.emptyTitle}>{i18n('noFavorites')}</Text>
            <Text style={styles.emptyText}>{i18n('noFavoritesDesc')}</Text>
          </View>
        }
        ListFooterComponent={
          !userIsPremium ? (
            <TouchableOpacity style={styles.premiumCta} onPress={() => navigation.navigate('Premium')}>
              <Text style={styles.premiumCtaIcon}>⭐</Text>
              <View style={{ flex: 1 }}>
                <Text style={styles.premiumCtaTitle}>{i18n('upgradeToPremium')}</Text>
                <Text style={styles.premiumCtaSub}>{i18n('unlimitedFavorites')} · {i18n('noAds')}</Text>
              </View>
              <Text style={{ color: '#fbbf24', fontSize: 16 }}>→</Text>
            </TouchableOpacity>
          ) : null
        }
      />
      <AdBanner />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: COLORS.bg },
  header: { backgroundColor: COLORS.surface, borderBottomWidth: 1, borderBottomColor: COLORS.border, paddingHorizontal: 16, paddingTop: Platform.OS === 'android' ? 8 : 16, paddingBottom: 16 },
  headerTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 },
  title: { fontSize: 24, fontWeight: '800', color: COLORS.text },
  premiumBadge: { backgroundColor: 'rgba(251,191,36,0.15)', borderRadius: 20, paddingHorizontal: 12, paddingVertical: Platform.OS === 'android' ? 8 : 5, borderWidth: 1, borderColor: 'rgba(251,191,36,0.3)' },
  premiumBadgeText: { fontSize: 12, fontWeight: '700', color: '#fbbf24' },
  subtitle: { fontSize: 13, color: COLORS.text3 },
  list: { padding: 16 },
  card: { flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.surface2, borderRadius: 14, borderWidth: 1, borderColor: COLORS.border, overflow: 'hidden' },
  cardImg: { width: 90, height: 90, backgroundColor: '#1a1a2e', alignItems: 'center', justifyContent: 'center' },
  cardBody: { flex: 1, padding: 12 },
  cardTitle: { fontSize: 14, fontWeight: '800', color: COLORS.text, marginBottom: 6, lineHeight: 20 },
  cardSub: { fontSize: 12, color: COLORS.text3 },
  heartBtn: { paddingHorizontal: 16, paddingVertical: 12 },
  empty: { alignItems: 'center', paddingTop: 80, paddingHorizontal: 40 },
  emptyTitle: { fontSize: 20, fontWeight: '800', color: COLORS.text2, marginBottom: 10 },
  emptyText: { fontSize: 14, color: COLORS.text3, textAlign: 'center', lineHeight: 22 },
  premiumCta: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: 'rgba(251,191,36,0.1)', borderRadius: 14, borderWidth: 1, borderColor: 'rgba(251,191,36,0.25)', padding: 16, marginTop: 16 },
  premiumCtaIcon: { fontSize: 24 },
  premiumCtaTitle: { fontSize: 14, fontWeight: '800', color: '#fbbf24', marginBottom: 2 },
  premiumCtaSub: { fontSize: 11, color: COLORS.text3 },
});
