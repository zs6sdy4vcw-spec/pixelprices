import { Platform } from 'react-native';

export const AD_UNIT_IDS = {
  banner: Platform.select({
    android: 'ca-app-pub-4339337123328082/4946581248',
    ios: 'ca-app-pub-4339337123328082/4946581248',
  }),
  interstitial: Platform.select({
    android: 'ca-app-pub-4339337123328082/1413318891',
    ios: 'ca-app-pub-4339337123328082/1413318891',
  }),
};
