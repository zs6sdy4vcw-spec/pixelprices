/**
 * currencyService.js
 * Récupère les taux de change en temps réel via l'API gratuite exchangerate-api.com
 * Cache 6 heures dans AsyncStorage pour éviter trop d'appels
 */
import AsyncStorage from '@react-native-async-storage/async-storage';

const CACHE_KEY = 'pixelprices_exchange_rates';
const CACHE_TTL = 6 * 60 * 60 * 1000; // 6 heures

// Taux de fallback si l'API est indisponible
const FALLBACK_RATES = {
  CAD: 1.41,
  USD: 1.00,
  EUR: 0.92,
  GBP: 0.79,
  AUD: 1.53,
  MXN: 17.15,
  BRL: 5.05,
  JPY: 149.50,
};

export const SUPPORTED_CURRENCIES = [
  { code: 'CAD', label: '🇨🇦 CAD' },
  { code: 'USD', label: '🇺🇸 USD' },
  { code: 'EUR', label: '🇪🇺 EUR' },
  { code: 'GBP', label: '🇬🇧 GBP' },
  { code: 'AUD', label: '🇦🇺 AUD' },
  { code: 'MXN', label: '🇲🇽 MXN' },
  { code: 'BRL', label: '🇧🇷 BRL' },
  { code: 'JPY', label: '🇯🇵 JPY' },
];

// Récupère les taux — cache 6h
export async function getExchangeRates() {
  try {
    // Vérifie le cache d'abord
    const raw = await AsyncStorage.getItem(CACHE_KEY);
    if (raw) {
      const cached = JSON.parse(raw);
      if (Date.now() - cached.time < CACHE_TTL) {
        return cached.rates;
      }
    }

    // Appel API gratuite — pas de clé requise, basée sur USD
    const res = await fetch('https://open.er-api.com/v6/latest/USD');
    if (!res.ok) throw new Error('API error');
    const data = await res.json();

    if (data.result !== 'success' || !data.rates) throw new Error('Invalid response');

    const rates = {};
    for (const cur of SUPPORTED_CURRENCIES) {
      rates[cur.code] = data.rates[cur.code] || FALLBACK_RATES[cur.code];
    }

    // Sauvegarde en cache
    await AsyncStorage.setItem(CACHE_KEY, JSON.stringify({ rates, time: Date.now() }));
    console.log('Exchange rates updated:', rates);
    return rates;
  } catch (e) {
    console.error('getExchangeRates error:', e.message);
    // Essaie le cache même expiré
    try {
      const raw = await AsyncStorage.getItem(CACHE_KEY);
      if (raw) return JSON.parse(raw).rates;
    } catch {}
    // Fallback hardcodé
    return FALLBACK_RATES;
  }
}

// Convertit un prix USD vers la devise choisie
export function convertUSD(usdPrice, rates, currency) {
  const rate = rates?.[currency] || FALLBACK_RATES[currency] || 1;
  return usdPrice * rate;
}
