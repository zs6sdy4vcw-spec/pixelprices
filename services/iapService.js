import AsyncStorage from '@react-native-async-storage/async-storage';

export const PREMIUM_SKU = 'pixelprices.premium';

let iap = null;

function getIAP() {
  if (iap) return iap;
  try {
    iap = require('expo-iap');
    return iap;
  } catch (e) {
    console.log('expo-iap non disponible:', e.message);
    return null;
  }
}

export async function initIAP() {
  const lib = getIAP();
  if (!lib) return false;
  try {
    await lib.initConnection();
    console.log('expo-iap connected');
    return true;
  } catch (e) {
    console.error('initIAP error:', e);
    return false;
  }
}

export async function endIAPConnection() {
  const lib = getIAP();
  if (!lib) return;
  try { await lib.endConnection(); } catch {}
}

export async function fetchPremiumProduct() {
  const lib = getIAP();
  if (!lib) return null;
  try {
    const products = await lib.getProducts([PREMIUM_SKU]);
    console.log('Products fetched:', products);
    return products?.[0] || null;
  } catch (e) {
    console.error('fetchPremiumProduct error:', e);
    return null;
  }
}

export async function purchasePremium() {
  const lib = getIAP();
  if (!lib) {
    return { success: false, error: 'IAP_UNAVAILABLE' };
  }
  try {
    console.log('Requesting purchase for SKU:', PREMIUM_SKU);
    await lib.requestPurchase({
      request: {
        google: { skus: [PREMIUM_SKU] },
      },
      type: 'in-app',
    });
    return { success: true };
  } catch (e) {
    console.error('purchasePremium error:', e.code, e.message);
    if (e.code === 'E_USER_CANCELLED') {
      return { success: false, error: 'CANCELLED' };
    }
    return { success: false, error: e.message || 'UNKNOWN' };
  }
}

export async function restoreIAPPurchases() {
  const lib = getIAP();
  if (!lib) return { restored: false };
  try {
    const purchases = await lib.getAvailablePurchases();
    console.log('Available purchases:', purchases);
    const premium = purchases?.find(p => p.productId === PREMIUM_SKU);
    if (premium) {
      await AsyncStorage.setItem('pixelprices_premium', 'true');
      return { restored: true };
    }
    return { restored: false };
  } catch (e) {
    console.error('restoreIAPPurchases error:', e);
    return { restored: false };
  }
}

export function addPurchaseListener(onSuccess, onError) {
  const lib = getIAP();
  if (!lib) return { remove: () => {} };

  const updateSub = lib.purchaseUpdatedListener(async (purchase) => {
    console.log('Purchase updated:', purchase);
    if (purchase?.productId === PREMIUM_SKU) {
      try {
        await lib.finishTransaction({ purchase, isConsumable: false });
        await AsyncStorage.setItem('pixelprices_premium', 'true');
        if (onSuccess) onSuccess(purchase);
      } catch (e) {
        console.error('finishTransaction error:', e);
      }
    }
  });

  const errorSub = lib.purchaseErrorListener((error) => {
    console.error('Purchase error listener:', error);
    if (onError) onError(error);
  });

  return {
    remove: () => {
      updateSub?.remove();
      errorSub?.remove();
    },
  };
}
