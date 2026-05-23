import { useWindowDimensions } from 'react-native';

// Tablette = largeur > 600px
export function useTablet() {
  const { width } = useWindowDimensions();
  return width >= 600;
}

// Valeur responsive selon phone/tablet
export function useRS(phoneVal, tabletVal) {
  const isTablet = useTablet();
  return isTablet ? tabletVal : phoneVal;
}
