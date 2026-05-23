import AsyncStorage from '@react-native-async-storage/async-storage';
import { RAWG_API_KEY } from '../constants/theme';

const USD_TO_CAD = 1.37;
const CACHE_TTL = 2 * 60 * 60 * 1000; // 2 heures

// ── User-Agent obligatoire CheapShark ──
const CS_HEADERS = {
  'User-Agent': 'PixelPrices/1.0 (pixelpricesapp@gmail.com)',
  'Accept': 'application/json',
};

// ── Cache mémoire + AsyncStorage ──
const memCache = {};

async function getCached(key) {
  if (memCache[key] && Date.now() - memCache[key].time < CACHE_TTL) {
    return memCache[key].data;
  }
  try {
    const raw = await AsyncStorage.getItem(`cache_${key}`);
    if (!raw) return null;
    const entry = JSON.parse(raw);
    if (Date.now() - entry.time > CACHE_TTL) return null;
    memCache[key] = entry;
    return entry.data;
  } catch { return null; }
}

async function setCached(key, data) {
  const entry = { data, time: Date.now() };
  memCache[key] = entry;
  try {
    await AsyncStorage.setItem(`cache_${key}`, JSON.stringify(entry));
  } catch {}
}

// ── Helper fetch CheapShark avec User-Agent ──
async function csFetch(url) {
  const res = await fetch(url, { headers: CS_HEADERS });
  if (res.status === 429) throw new Error('RATE_LIMITED');
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const text = await res.text();
  if (text.includes('"error"')) throw new Error('RATE_LIMITED');
  return JSON.parse(text);
}

// Retourne le cache même expiré en cas de blocage
async function getStaleCache(key) {
  try {
    const raw = await AsyncStorage.getItem(`cache_${key}`);
    if (!raw) return null;
    const entry = JSON.parse(raw);
    return entry.data || null;
  } catch { return null; }
}

// ── Recherche ──
export async function searchGames(query) {
  if (!query || query.length < 2) return [];
  const key = `search_${query.toLowerCase().trim()}`;
  const cached = await getCached(key);
  if (cached) return cached;

  try {
    const games = await csFetch(
      `https://www.cheapshark.com/api/1.0/games?title=${encodeURIComponent(query)}&limit=20`
    );
    if (!Array.isArray(games)) return [];
    const result = games.map(g => ({
      id: g.gameID, cheapsharkId: g.gameID,
      title: g.external, platform: 'PC', type: 'Digital',
      metacritic: null, imageUrl: g.thumb || null,
      cheapestPrice: parseFloat(g.cheapest) || 0,
      prices: [{ price: parseFloat(g.cheapest) || 0, normalPrice: 0, savings: 0 }],
    }));
    await setCached(key, result);
    return result;
  } catch (e) {
    console.error('searchGames:', e.message);
    return [];
  }
}

// ── Top deals (SearchScreen) ──
export async function fetchTopDeals() {
  const key = 'topDeals';
  const cached = await getCached(key);
  if (cached) return cached;

  try {
    const deals = await csFetch(
      'https://www.cheapshark.com/api/1.0/deals?sortBy=Recent&pageSize=25&onSale=1&metacritic=60'
    );
    if (!Array.isArray(deals)) return [];
    const gameMap = {};
    for (const deal of deals) {
      const gid = deal.gameID;
      if (!gameMap[gid]) {
        gameMap[gid] = {
          id: gid, cheapsharkId: gid,
          title: deal.title, platform: 'PC', type: 'Digital',
          metacritic: parseInt(deal.metacriticScore) || null,
          imageUrl: deal.thumb || null, prices: [],
        };
      }
      gameMap[gid].prices.push({
        store: deal.storeID,
        price: parseFloat(deal.salePrice) || 0,
        normalPrice: parseFloat(deal.normalPrice) || 0,
        savings: parseFloat(deal.savings) || 0,
        dealID: deal.dealID,
      });
    }
    const result = Object.values(gameMap);
    await setCached(key, result);
    return result;
  } catch (e) {
    console.error('fetchTopDeals:', e.message);
    return [];
  }
}

// ── Deals paginés (HomeScreen — Tendances/Rabais) ──
export async function fetchDealsPage(sortBy, page = 1, extra = '') {
  const key = `deals_${sortBy}_p${page}_${extra}`;
  const cached = await getCached(key);
  if (cached) return cached;

  try {
    const deals = await csFetch(
      `https://www.cheapshark.com/api/1.0/deals?sortBy=${sortBy}&pageSize=25&pageNumber=${page - 1}&onSale=1${extra}`
    );
    if (!Array.isArray(deals)) return { data: [], hasMore: false };
    const gameMap = {};
    for (const deal of deals) {
      const gid = deal.gameID;
      if (!gameMap[gid]) {
        gameMap[gid] = {
          id: gid, cheapsharkId: gid,
          title: deal.title, platform: 'PC', type: 'Digital',
          metacritic: parseInt(deal.metacriticScore) || null,
          imageUrl: deal.thumb || null, prices: [],
        };
      }
      gameMap[gid].prices.push({
        store: deal.storeID,
        price: parseFloat(deal.salePrice) || 0,
        normalPrice: parseFloat(deal.normalPrice) || 0,
        savings: parseFloat(deal.savings) || 0,
        dealID: deal.dealID,
      });
    }
    const result = { data: Object.values(gameMap), hasMore: deals.length >= 25 };
    await setCached(key, result);
    return result;
  } catch (e) {
    console.error('fetchDealsPage:', e.message);
    if (e.message === 'RATE_LIMITED') {
      const stale = await getStaleCache(key);
      if (stale) return stale;
    }
    return { data: [], hasMore: false };
  }
}

// ── Nouveautés (HomeScreen) — réduit à 8 appels max ──
export async function fetchNewReleases(page = 1) {
  // CheapShark Recent — plus fiable et plus de résultats que RAWG
  return fetchDealsPage('Recent', page);
}


export async function fetchGameDeals(cheapsharkId) {
  if (!cheapsharkId) return { prices: [], imgUrl: null, metacritic: null };
  const key = `gamedeals_${cheapsharkId}`;
  const cached = await getCached(key);
  if (cached) return cached;

  try {
    const [gameData, storeList] = await Promise.all([
      csFetch(`https://www.cheapshark.com/api/1.0/games?id=${cheapsharkId}`),
      csFetch('https://www.cheapshark.com/api/1.0/stores'),
    ]);
    const storeMap = {};
    if (Array.isArray(storeList)) storeList.forEach(s => { storeMap[s.storeID] = s.storeName; });
    const prices = (Array.isArray(gameData.deals) ? gameData.deals : [])
      .map(deal => ({
        store: deal.storeID,
        storeName: storeMap[deal.storeID] || `Store ${deal.storeID}`,
        price: parseFloat(deal.price) || 0,
        normalPrice: parseFloat(deal.retailPrice) || 0,
        savings: parseFloat(deal.savings) || 0,
        url: `https://www.cheapshark.com/redirect?dealID=${deal.dealID}`,
      }))
      .filter(p => p.price > 0)
      .sort((a, b) => a.price - b.price);

    const result = { prices, imgUrl: null, metacritic: null };
    await setCached(key, result);
    return result;
  } catch (e) {
    console.error('fetchGameDeals:', e.message);
    return { prices: [], imgUrl: null, metacritic: null };
  }
}

// ── Deals par store (StoreDealsScreen) ──
export async function fetchDealsForStore(storeId, pageSize = 5) {
  const key = `store_${storeId}_${pageSize}`;
  const cached = await getCached(key);
  if (cached) return cached;

  try {
    const deals = await csFetch(
      `https://www.cheapshark.com/api/1.0/deals?storeID=${storeId}&pageSize=${pageSize}&sortBy=Savings&onSale=1`
    );
    if (!Array.isArray(deals)) return [];
    const result = deals.slice(0, pageSize).map(d => ({
      id: d.dealID, gameID: d.gameID, cheapsharkId: d.gameID,
      title: d.title, imageUrl: d.thumb || null,
      salePrice: parseFloat(d.salePrice) || 0,
      normalPrice: parseFloat(d.normalPrice) || 0,
      savings: parseFloat(d.savings) || 0,
      metacritic: parseInt(d.metacriticScore) || null,
      storeId,
    }));
    await setCached(key, result);
    return result;
  } catch (e) {
    console.error('fetchDealsForStore:', e.message);
    return [];
  }
}

// ── All deals paginés par store ──
export async function fetchAllDealsForStore(storeId, page = 1) {
  const key = `store_all_${storeId}_p${page}`;
  const cached = await getCached(key);
  if (cached) return cached;

  try {
    const deals = await csFetch(
      `https://www.cheapshark.com/api/1.0/deals?storeID=${storeId}&pageSize=25&pageNumber=${page - 1}&sortBy=Savings&onSale=1`
    );
    if (!Array.isArray(deals)) return { data: [], hasMore: false };
    const result = {
      data: deals.map(d => ({
        id: d.dealID, gameID: d.gameID, cheapsharkId: d.gameID,
        title: d.title, imageUrl: d.thumb || null,
        salePrice: parseFloat(d.salePrice) || 0,
        normalPrice: parseFloat(d.normalPrice) || 0,
        savings: parseFloat(d.savings) || 0,
        metacritic: parseInt(d.metacriticScore) || null,
        storeId,
      })),
      hasMore: deals.length >= 25,
    };
    await setCached(key, result);
    return result;
  } catch (e) {
    console.error('fetchAllDealsForStore:', e.message);
    return { data: [], hasMore: false };
  }
}

// ── Helpers ──
export function toCad(price) { return price * USD_TO_CAD; }

export function getMinCad(game) {
  const prices = (game.prices || []).map(p => parseFloat(p.price)).filter(p => p > 0);
  return prices.length ? Math.min(...prices) * USD_TO_CAD : Infinity;
}

export function getMaxCad(game) {
  const prices = (game.prices || []).map(p => parseFloat(p.price)).filter(p => p > 0);
  return prices.length ? Math.max(...prices) * USD_TO_CAD : 0;
}

export function getBestPrice(game) {
  const valid = (game.prices || []).filter(p => p.price > 0);
  return valid.length ? valid.reduce((a, b) => a.price < b.price ? a : b) : null;
}

export function getSavings(game) { return getMaxCad(game) - getMinCad(game); }

export function getSortedPrices(game) {
  return [...(game.prices || [])].sort((a, b) => (a.price || 0) - (b.price || 0));
}

export const CS_FETCH_HEADERS = CS_HEADERS;
export const GAMES = [];
