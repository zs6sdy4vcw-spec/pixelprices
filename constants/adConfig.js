import { Platform } from 'react-native';

// ── IDs de production ──
const IOS_BANNER      = 'ca-app-pub-4339337123328082/4946581248';
const IOS_INTERSTITIAL = 'ca-app-pub-4339337123328082/1413318891';

// ── IDs de test (utiliser pendant le développement) ──
const TEST_BANNER      = 'ca-app-pub-3940256099942544/2934735716';
const TEST_INTERSTITIAL = 'ca-app-pub-3940256099942544/4411468910';

// ⚠️ Mets IS_PRODUCTION à true seulement quand tu soumets aux stores
const IS_PRODUCTION = false;

export const AD_UNITS = {
  BANNER:       IS_PRODUCTION ? IOS_BANNER       : TEST_BANNER,
  INTERSTITIAL: IS_PRODUCTION ? IOS_INTERSTITIAL : TEST_INTERSTITIAL,
};
