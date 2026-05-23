import React, { useState, useEffect } from 'react';
import {
  View, Text, TextInput, FlatList, TouchableOpacity,
  Image, StyleSheet, ActivityIndicator, Platform, useWindowDimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { COLORS } from '../constants/theme';
import { searchGames, fetchTopDeals, getMinCad } from '../services/gameData';
import i18n from '../services/i18n';
import AdBanner from '../components/AdBanner';

function SearchResult({ game, onPress }) {
  const minCad = getMinCad(game);
  return (
    <TouchableOpacity style={styles.result} onPress={() => onPress(game)} activeOpacity={0.75}>
      <View style={styles.resultImg}>
        {game.imageUrl
          ? <Image source={{ uri: game.imageUrl }} style={{ width: 58, height: 58 }} resizeMode="cover" />
          : <Text style={{ fontSize: 20 }}>🖥️</Text>}
      </View>
      <View style={styles.resultBody}>
        <Text style={styles.resultTitle} numberOfLines={1}>{game.title}</Text>
        <Text style={styles.resultSub}>PC · {game.prices?.length || '?'} {i18n('stores', game.prices?.length)}</Text>
      </View>
      <Text style={styles.resultPrice}>{minCad !== Infinity ? `$${minCad.toFixed(2)}` : '—'}</Text>
    </TouchableOpacity>
  );
}

export default function SearchScreen({ navigation }) {
  const { width } = useWindowDimensions();
  const isTablet = width >= 600;
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchTopDeals().then(data => { setResults(data || []); setLoading(false); });
  }, []);

  useEffect(() => {
    if (!query.trim()) {
      setLoading(true);
      fetchTopDeals().then(data => { setResults(data || []); setLoading(false); });
      return;
    }
    const timer = setTimeout(async () => {
      setLoading(true);
      const res = await searchGames(query);
      setResults(res || []);
      setLoading(false);
    }, 500);
    return () => clearTimeout(timer);
  }, [query]);

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.header}>
        <Text style={styles.title}>{i18n('searchTitle')}</Text>
        <View style={styles.searchWrap}>
          <Text style={styles.searchIcon}>🔍</Text>
          <TextInput
            style={styles.searchInput}
            placeholder={i18n('searchAll')}
            placeholderTextColor={COLORS.text4}
            value={query}
            onChangeText={setQuery}
            autoFocus
          />
          {loading && <ActivityIndicator size="small" color={COLORS.primary} />}
          {query.length > 0 && !loading && (
            <TouchableOpacity onPress={() => setQuery('')} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
              <Text style={{ color: COLORS.text3, fontSize: 16 }}>✕</Text>
            </TouchableOpacity>
          )}
        </View>
        <Text style={styles.filterLabel}>
          {query ? `${results.length} ${i18n('results', results.length)}` : i18n('popular')}
        </Text>
      </View>
      <FlatList
        key={isTablet ? 'tablet' : 'phone'}
        data={results}
        keyExtractor={item => String(item.id)}
        numColumns={isTablet ? 2 : 1}
        columnWrapperStyle={isTablet ? { gap: 12, paddingHorizontal: 24 } : undefined}
        contentContainerStyle={{ padding: isTablet ? 0 : 16, paddingTop: 8, paddingBottom: 80 }}
        renderItem={({ item }) => (
          <SearchResult game={item} onPress={game => navigation.navigate('Detail', { game })} />
        )}
        ItemSeparatorComponent={() => <View style={{ height: 8 }} />}
        ListEmptyComponent={
          !loading ? (
            <View style={styles.empty}>
              <Text style={{ fontSize: 40 }}>🔍</Text>
              <Text style={styles.emptyText}>{query ? `${i18n('noResults')} "${query}"` : i18n('noGamesFound')}</Text>
            </View>
          ) : null
        }
      />
      <AdBanner />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: COLORS.bg },
  header: { backgroundColor: COLORS.surface, borderBottomWidth: 1, borderBottomColor: COLORS.border, paddingHorizontal: 16, paddingTop: Platform.OS === 'android' ? 8 : 16, paddingBottom: 12 },
  title: { fontSize: 24, fontWeight: '800', color: COLORS.text, marginBottom: 12 },
  searchWrap: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: 12, borderWidth: 1.5, borderColor: COLORS.primary, paddingHorizontal: 12, paddingVertical: Platform.OS === 'android' ? 12 : 10, marginBottom: 14, gap: 8 },
  searchIcon: { fontSize: 14 },
  searchInput: { flex: 1, color: COLORS.text, fontSize: 14 },
  filterLabel: { fontSize: 9, fontWeight: '800', color: COLORS.text4, letterSpacing: 1, textTransform: 'uppercase', marginBottom: 8 },
  result: { flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.surface2, borderRadius: 12, borderWidth: 1, borderColor: COLORS.border, overflow: 'hidden', flex: 1 },
  resultImg: { width: 58, height: 58, backgroundColor: '#1a1a2e', alignItems: 'center', justifyContent: 'center' },
  resultBody: { flex: 1, paddingHorizontal: 12 },
  resultTitle: { fontSize: 13, fontWeight: '700', color: COLORS.text, marginBottom: 3 },
  resultSub: { fontSize: 10, color: COLORS.text3 },
  resultPrice: { fontSize: 14, fontWeight: '800', color: COLORS.green, paddingRight: 12 },
  empty: { alignItems: 'center', paddingTop: 50, gap: 12 },
  emptyText: { fontSize: 15, fontWeight: '700', color: COLORS.text3 },
});
