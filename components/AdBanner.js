import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { isPremium } from '../services/premium';

const BANNER_ID = 'ca-app-pub-4339337123328082/1051721193';
const INTERSTITIAL_ID = 'ca-app-pub-4339337123328082/5426080473';
const INTERSTITIAL_EVERY_N_CLICKS = 8;

let clickCounter = 0;
let interstitialAd = null;
let interstitialLoaded = false;
let adMobModules = null;

function getAdMob() {
  if (adMobModules) return adMobModules;
  try {
    adMobModules = require('react-native-google-mobile-ads');
    return adMobModules;
  } catch (e) {
    return null;
  }
}

export function loadInterstitial() {
  const admob = getAdMob();
  if (!admob?.InterstitialAd) return;
  try {
    interstitialAd = admob.InterstitialAd.createForAdRequest(INTERSTITIAL_ID, {
      requestNonPersonalizedAdsOnly: false,
    });
    interstitialAd.addAdEventListener(admob.AdEventType.LOADED, () => {
      interstitialLoaded = true;
    });
    interstitialAd.addAdEventListener(admob.AdEventType.CLOSED, () => {
      interstitialLoaded = false;
      loadInterstitial();
    });
    interstitialAd.load();
  } catch (e) {}
}

export async function showInterstitialIfReady() {
  try {
    const premium = await isPremium();
    if (premium) return;
    clickCounter++;
    if (clickCounter < INTERSTITIAL_EVERY_N_CLICKS) return;
    clickCounter = 0;
    if (interstitialLoaded && interstitialAd) {
      interstitialAd.show();
    }
  } catch (e) {}
}

export default function AdBanner({ style }) {
  const [userIsPremium, setUserIsPremium] = useState(false);

  useEffect(() => {
    isPremium().then(setUserIsPremium);
  }, []);

  if (userIsPremium) return null;

  const admob = getAdMob();

  if (!admob?.BannerAd) {
    return (
      <View style={[styles.placeholder, style]}>
        <Text style={styles.placeholderText}>📢 Ad — Upgrade to Premium to remove</Text>
      </View>
    );
  }

  const { BannerAd, BannerAdSize } = admob;

  return (
    <View style={[styles.container, style]}>
      <BannerAd
        unitId={BANNER_ID}
        size={BannerAdSize.BANNER}
        requestOptions={{ requestNonPersonalizedAdsOnly: false }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { alignItems: 'center', width: '100%', backgroundColor: 'rgba(0,0,0,0.2)' },
  placeholder: { height: 52, backgroundColor: 'rgba(255,255,255,0.04)', borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.06)', alignItems: 'center', justifyContent: 'center', width: '100%' },
  placeholderText: { fontSize: 10, color: '#475569', fontWeight: '600' },
});
