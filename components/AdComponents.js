import React, { useEffect, useState } from 'react';
import { View, StyleSheet, Text } from 'react-native';
import { AD_UNITS } from '../constants/adConfig';

// ── On importe conditionnellement pour éviter les crashs en dev ──
let BannerAd, BannerAdSize, InterstitialAd, AdEventType;
try {
  const admob = require('react-native-google-mobile-ads');
  BannerAd = admob.BannerAd;
  BannerAdSize = admob.BannerAdSize;
  InterstitialAd = admob.InterstitialAd;
  AdEventType = admob.AdEventType;
} catch (e) {
  console.log('AdMob non disponible en mode Expo Go — normal !');
}

// ── Composant Bannière publicitaire ──
export function AdBanner({ style }) {
  const [adError, setAdError] = useState(false);

  if (!BannerAd || adError) {
    // Placeholder visible pendant le dev avec Expo Go
    return (
      <View style={[styles.placeholder, style]}>
        <Text style={styles.placeholderText}>📢 PUBLICITÉ</Text>
      </View>
    );
  }

  return (
    <View style={[styles.bannerWrap, style]}>
      <BannerAd
        unitId={AD_UNITS.BANNER}
        size={BannerAdSize.BANNER}
        requestOptions={{ requestNonPersonalizedAdsOnly: false }}
        onAdFailedToLoad={() => setAdError(true)}
      />
    </View>
  );
}

// ── Hook pour les pubs interstitielles ──
export function useInterstitialAd() {
  const [interstitial, setInterstitial] = useState(null);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    if (!InterstitialAd || !AdEventType) return;

    const ad = InterstitialAd.createForAdRequest(AD_UNITS.INTERSTITIAL, {
      requestNonPersonalizedAdsOnly: false,
    });

    const unsubscribeLoaded = ad.addAdEventListener(AdEventType.LOADED, () => {
      setLoaded(true);
    });

    const unsubscribeClosed = ad.addAdEventListener(AdEventType.CLOSED, () => {
      setLoaded(false);
      ad.load(); // Précharge la prochaine pub
    });

    ad.load();
    setInterstitial(ad);

    return () => {
      unsubscribeLoaded();
      unsubscribeClosed();
    };
  }, []);

  const showAd = () => {
    if (loaded && interstitial) {
      interstitial.show();
    }
  };

  return { showAd, loaded };
}

const styles = StyleSheet.create({
  bannerWrap: {
    alignItems: 'center',
    backgroundColor: 'transparent',
  },
  placeholder: {
    height: 52,
    backgroundColor: 'rgba(255,255,255,0.03)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.07)',
    borderStyle: 'dashed',
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    marginHorizontal: 16,
    marginVertical: 8,
  },
  placeholderText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#334155',
    letterSpacing: 0.5,
  },
});
