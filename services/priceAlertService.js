/**
 * priceAlertService.js
 * Vérifie les alertes de prix et envoie des notifications push.
 * Utilisé au lancement de l'app ET en tâche de fond.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Notifications from 'expo-notifications';
import * as TaskManager from 'expo-task-manager';
import * as BackgroundFetch from 'expo-background-fetch';

const ALERTS_KEY = 'pixelprices_alerts';
const LAST_PRICES_KEY = 'pixelprices_last_prices';
const BACKGROUND_TASK = 'PRICE_CHECK_TASK';

const CS_HEADERS = {
  'User-Agent': 'PixelPrices/1.0 (pixelpricesapp@gmail.com)',
  'Accept': 'application/json',
};

// ── Configure comment les notifs s'affichent ──
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

// ── Demande la permission de notifications ──
export async function requestNotificationPermission() {
  const { status: existing } = await Notifications.getPermissionsAsync();
  if (existing === 'granted') return true;
  const { status } = await Notifications.requestPermissionsAsync();
  return status === 'granted';
}

// ── Envoie une notification locale ──
async function sendPriceAlert(gameTitle, currentPrice, targetPrice, storeName) {
  await Notifications.scheduleNotificationAsync({
    content: {
      title: `💰 Price drop! ${gameTitle}`,
      body: `Now $${currentPrice.toFixed(2)} on ${storeName} — your target was $${targetPrice.toFixed(2)}!`,
      sound: true,
      data: { gameTitle, currentPrice, targetPrice },
    },
    trigger: null, // Immédiat
  });
}

// ── Fetch le prix actuel d'un jeu sur CheapShark ──
async function fetchCurrentPrice(gameTitle, storeId) {
  try {
    const searchRes = await fetch(
      `https://www.cheapshark.com/api/1.0/games?title=${encodeURIComponent(gameTitle)}&limit=1`,
      { headers: CS_HEADERS }
    );
    if (!searchRes.ok) return null;
    const games = await searchRes.json();
    if (!Array.isArray(games) || !games[0]?.gameID) return null;

    const gameId = games[0].gameID;
    const dealsUrl = storeId && storeId !== 'all'
      ? `https://www.cheapshark.com/api/1.0/deals?gameID=${gameId}&storeID=${storeId}&sortBy=Price&pageSize=1&onSale=1`
      : `https://www.cheapshark.com/api/1.0/games?id=${gameId}`;

    const dealsRes = await fetch(dealsUrl, { headers: CS_HEADERS });
    if (!dealsRes.ok) return null;
    const data = await dealsRes.json();

    // Si on fetch par gameID
    if (data.deals) {
      const deals = data.deals;
      if (!deals.length) return null;
      const filtered = storeId && storeId !== 'all'
        ? deals.filter(d => d.storeID === storeId)
        : deals;
      if (!filtered.length) return null;
      const best = filtered.reduce((a, b) =>
        parseFloat(a.price) < parseFloat(b.price) ? a : b
      );
      return {
        price: parseFloat(best.price),
        storeName: storeId !== 'all' ? storeId : 'best store',
      };
    }

    // Si on fetch par deals array
    if (Array.isArray(data) && data[0]) {
      return {
        price: parseFloat(data[0].salePrice),
        storeName: data[0].storeID,
      };
    }

    return null;
  } catch (e) {
    console.error('fetchCurrentPrice error:', e);
    return null;
  }
}

// ── Vérifie toutes les alertes et notifie si prix atteint ──
export async function checkPriceAlerts() {
  try {
    const raw = await AsyncStorage.getItem(ALERTS_KEY);
    if (!raw) return;
    const alerts = JSON.parse(raw);
    if (!alerts?.length) return;

    const lastPricesRaw = await AsyncStorage.getItem(LAST_PRICES_KEY);
    const lastPrices = lastPricesRaw ? JSON.parse(lastPricesRaw) : {};
    const updatedPrices = { ...lastPrices };

    for (const alert of alerts) {
      try {
        const result = await fetchCurrentPrice(alert.gameTitle, alert.storeId);
        if (!result) continue;

        const { price, storeName } = result;
        const lastPrice = lastPrices[alert.id];

        // Notifie si:
        // 1. Le prix est sous le prix cible
        // 2. ET c'est la première vérification OU le prix a baissé depuis la dernière fois
        const belowTarget = price <= alert.targetPrice;
        const priceDrop = !lastPrice || price < lastPrice;

        if (belowTarget && priceDrop) {
          await sendPriceAlert(
            alert.gameTitle,
            price,
            alert.targetPrice,
            alert.storeName || storeName || 'a store'
          );
        }

        updatedPrices[alert.id] = price;
      } catch {}
    }

    await AsyncStorage.setItem(LAST_PRICES_KEY, JSON.stringify(updatedPrices));
  } catch (e) {
    console.error('checkPriceAlerts error:', e);
  }
}

// ── Enregistre la tâche de fond ──
TaskManager.defineTask(BACKGROUND_TASK, async () => {
  try {
    await checkPriceAlerts();
    return BackgroundFetch.BackgroundFetchResult.NewData;
  } catch {
    return BackgroundFetch.BackgroundFetchResult.Failed;
  }
});

export async function registerBackgroundPriceCheck() {
  try {
    await BackgroundFetch.registerTaskAsync(BACKGROUND_TASK, {
      minimumInterval: 60 * 60, // Toutes les heures
      stopOnTerminate: false,   // Continue même app fermée
      startOnBoot: true,        // Repart au redémarrage
    });
    console.log('Background price check registered');
  } catch (e) {
    console.error('registerBackgroundPriceCheck error:', e);
  }
}

export async function unregisterBackgroundPriceCheck() {
  try {
    await BackgroundFetch.unregisterTaskAsync(BACKGROUND_TASK);
  } catch {}
}
