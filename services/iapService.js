import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

// ── ID du produit — DOIT correspondre exactement à celui créé dans Play Console ──
export const PREMIUM_SKU = 'pixelprices_premium_lifetime';

let RNIap = null;
function getIAP() {
  if (RNIap) return RNIap;
  try {
    RNIap = require('react-native-iap');
    return RNIap;
  } catch (e) {
    console.log('react-native-iap non disponible (Expo Go) — normal en dev');
    return null;
  }
}

// ── Initialise la connexion IAP — à appeler une fois au démarrage de l'app ──
export async function initIAP() {
  const iap = getIAP();
  if (!iap) return false;
  try {
    await iap.initConnection();
    if (Platform.OS === 'android') {
      // Vide les achats en attente non consommés (sécurité)
      await iap.flushFailedPurchasesCachedAsPendingAndroid().catch(() => {});
    }
    return true;
  } catch (e) {
    console.error('initIAP error:', e);
    return false;
  }
}

export async function endIAPConnection() {
  const iap = getIAP();
  if (!iap) return;
  try { await iap.endConnection(); } catch {}
}

// ── Récupère les infos du produit (prix localisé, etc.) ──
export async function fetchPremiumProduct() {
  const iap = getIAP();
  if (!iap) return null;
  try {
    const products = await iap.getProducts({ skus: [PREMIUM_SKU] });
    return products?.[0] || null;
  } catch (e) {
    console.error('fetchPremiumProduct error:', e);
    return null;
  }
}

// ── Lance l'achat réel via Google Play Billing ──
export async function purchasePremium() {
  const iap = getIAP();
  if (!iap) {
    return { success: false, error: 'IAP_UNAVAILABLE' };
  }
  try {
    const purchase = await iap.requestPurchase({ skus: [PREMIUM_SKU] });
    return { success: true, purchase };
  } catch (e) {
    if (e.code === 'E_USER_CANCELLED') {
      return { success: false, error: 'CANCELLED' };
    }
    console.error('purchasePremium error:', e);
    return { success: false, error: e.message || 'UNKNOWN' };
  }
}

// ── Confirme/consomme l'achat après validation (produit non-consommable = achat à vie) ──
export async function finalizePurchase(purchase) {
  const iap = getIAP();
  if (!iap || !purchase) return false;
  try {
    // acknowledgePurchaseAndroid pour les produits non-consommables (achat à vie)
    await iap.finishTransaction({ purchase, isConsumable: false });
    await AsyncStorage.setItem('pixelprices_premium', 'true');
    await AsyncStorage.setItem('pixelprices_purchase_token', purchase.purchaseToken || '');
    return true;
  } catch (e) {
    console.error('finalizePurchase error:', e);
    return false;
  }
}

// ── Restaure les achats existants (réinstallation, nouvel appareil) ──
export async function restoreIAPPurchases() {
  const iap = getIAP();
  if (!iap) return { restored: false };
  try {
    const purchases = await iap.getAvailablePurchases();
    const premiumPurchase = purchases?.find(p => p.productId === PREMIUM_SKU);
    if (premiumPurchase) {
      await AsyncStorage.setItem('pixelprices_premium', 'true');
      return { restored: true, purchase: premiumPurchase };
    }
    return { restored: false };
  } catch (e) {
    console.error('restoreIAPPurchases error:', e);
    return { restored: false };
  }
}

// ── Listener pour les achats (à utiliser dans useEffect au niveau App) ──
export function addPurchaseListener(onPurchaseUpdate, onPurchaseError) {
  const iap = getIAP();
  if (!iap) return { remove: () => {} };

  const updateSub = iap.purchaseUpdatedListener(async (purchase) => {
    const ok = await finalizePurchase(purchase);
    if (ok && onPurchaseUpdate) onPurchaseUpdate(purchase);
  });

  const errorSub = iap.purchaseErrorListener((error) => {
    console.error('Purchase error listener:', error);
    if (onPurchaseError) onPurchaseError(error);
  });

  return {
    remove: () => {
      updateSub?.remove();
      errorSub?.remove();
    },
  };
}
