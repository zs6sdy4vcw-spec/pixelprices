import AsyncStorage from '@react-native-async-storage/async-storage';

const PREMIUM_KEY = 'pixelprices_premium';
export const PRODUCT_ID = 'pixelprices_premium_lifetime';

export const FREE_LIMITS = {
  maxAlerts: 5,
  maxFavorites: 5,
};

export async function isPremium() {
  try {
    const val = await AsyncStorage.getItem(PREMIUM_KEY);
    return val === 'true';
  } catch { return false; }
}

export async function setPremium(value) {
  try {
    await AsyncStorage.setItem(PREMIUM_KEY, value ? 'true' : 'false');
  } catch {}
}

// Stub — sera remplacé par react-native-iap en production
export async function purchasePremium() {
  return { success: false, error: 'Use in-app purchase flow' };
}

export async function restorePurchase() {
  try {
    const val = await AsyncStorage.getItem(PREMIUM_KEY);
    return { restored: val === 'true' };
  } catch { return { restored: false }; }
}
