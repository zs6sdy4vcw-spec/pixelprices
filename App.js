import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { StatusBar } from 'expo-status-bar';
import { Text, View, Image, StyleSheet, Animated, Platform, Easing } from 'react-native';
import { SafeAreaProvider, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useState, useEffect, useRef } from 'react';

import HomeScreen from './screens/HomeScreen';
import SearchScreen from './screens/SearchScreen';
import AlertsScreen from './screens/AlertsScreen';
import FavoritesScreen from './screens/FavoritesScreen';
import DetailScreen from './screens/DetailScreen';
import PremiumScreen from './screens/PremiumScreen';
import StoreDealsScreen from './screens/StoreDealsScreen';
import { COLORS } from './constants/theme';
import i18n from './services/i18n';
import { loadInterstitial } from './components/AdBanner';

const Tab = createBottomTabNavigator();
const Stack = createNativeStackNavigator();
export const LOGO = require('./assets/icons/icon.png');

function SplashScreen({ onDone }) {
  // Valeurs d'animation
  const bgGlow       = useRef(new Animated.Value(0)).current; // fond qui s'illumine
  const outerGlow    = useRef(new Animated.Value(0)).current; // glow extérieur large
  const innerGlow    = useRef(new Animated.Value(0)).current; // glow intérieur
  const logoOpacity  = useRef(new Animated.Value(0)).current; // logo fade in
  const logoScale    = useRef(new Animated.Value(0.6)).current; // logo scale
  const textOpacity  = useRef(new Animated.Value(0)).current; // texte fade in
  const tagOpacity   = useRef(new Animated.Value(0)).current; // tagline fade in
  const glowPulse    = useRef(new Animated.Value(1)).current; // pulse continu
  const exitOpacity  = useRef(new Animated.Value(1)).current; // fade out final

  useEffect(() => {
    // Pulse infini sur le glow
    const pulse = Animated.loop(
      Animated.sequence([
        Animated.timing(glowPulse, { toValue: 1.15, duration: 1200, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
        Animated.timing(glowPulse, { toValue: 1.0,  duration: 1200, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
      ])
    );

    Animated.sequence([
      // Phase 1 — fond qui s'illumine progressivement
      Animated.timing(bgGlow, { toValue: 1, duration: 800, easing: Easing.out(Easing.quad), useNativeDriver: false }),

      // Phase 2 — glow extérieur apparaît + logo pop
      Animated.parallel([
        Animated.timing(outerGlow, { toValue: 1, duration: 600, easing: Easing.out(Easing.quad), useNativeDriver: true }),
        Animated.spring(logoScale,  { toValue: 1, friction: 4, tension: 50, useNativeDriver: true }),
        Animated.timing(logoOpacity, { toValue: 1, duration: 500, useNativeDriver: true }),
      ]),

      // Phase 3 — glow intérieur + texte apparaît
      Animated.parallel([
        Animated.timing(innerGlow, { toValue: 1, duration: 400, useNativeDriver: true }),
        Animated.timing(textOpacity, { toValue: 1, duration: 500, useNativeDriver: true }),
      ]),

      // Phase 4 — tagline apparaît
      Animated.timing(tagOpacity, { toValue: 1, duration: 400, useNativeDriver: true }),

      // Phase 5 — reste visible + pulse
      Animated.delay(1200),

      // Phase 6 — fade out
      Animated.timing(exitOpacity, { toValue: 0, duration: 500, easing: Easing.in(Easing.quad), useNativeDriver: true }),
    ]).start(() => onDone());

    // Lance le pulse après 1.5s
    const t = setTimeout(() => pulse.start(), 1500);
    return () => clearTimeout(t);
  }, []);

  // Couleur de fond animée
  const bgColor = bgGlow.interpolate({
    inputRange: [0, 1],
    outputRange: ['#000000', '#0a0a0f'],
  });

  // Couleur du halo de fond
  const bgHaloOpacity = bgGlow.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 0.25],
  });

  return (
    <Animated.View style={[splash.container, { backgroundColor: bgColor }]}>
      <StatusBar style="light" />

      {/* Halo de fond large qui s'illumine */}
      <Animated.View style={[splash.bgHalo, { opacity: bgHaloOpacity, transform: [{ scale: glowPulse }] }]} />
      <Animated.View style={[splash.bgHaloInner, { opacity: bgHaloOpacity, transform: [{ scale: glowPulse }] }]} />

      {/* Glow extérieur */}
      <Animated.View style={[
        splash.outerGlowRing,
        { opacity: outerGlow, transform: [{ scale: glowPulse }] }
      ]} />

      {/* Glow intérieur */}
      <Animated.View style={[
        splash.innerGlowRing,
        { opacity: innerGlow, transform: [{ scale: glowPulse }] }
      ]} />

      {/* Logo centré et grand */}
      <Animated.Image
        source={LOGO}
        style={[splash.logo, {
          opacity: logoOpacity,
          transform: [{ scale: logoScale }],
        }]}
        resizeMode="contain"
      />

      {/* Nom de l'app */}
      <Animated.Text style={[splash.appName, { opacity: textOpacity }]}>
        Pixel<Text style={{ color: '#4ade80' }}>Prices</Text>
      </Animated.Text>

      {/* Tagline */}
      <Animated.Text style={[splash.tagline, { opacity: tagOpacity }]}>
        {i18n('tagline')}
      </Animated.Text>

      {/* Fade out global */}
      <Animated.View style={[StyleSheet.absoluteFill, { backgroundColor: '#0a0a0f', opacity: exitOpacity.interpolate({ inputRange: [0, 1], outputRange: [1, 0] }) }]} pointerEvents="none" />
    </Animated.View>
  );
}

function TabNavigator() {
  const insets = useSafeAreaInsets();
  const tabBarHeight = Platform.OS === 'android' ? 60 + insets.bottom : 64;

  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          backgroundColor: '#0d0d1a',
          borderTopColor: 'rgba(255,255,255,0.06)',
          borderTopWidth: 1,
          paddingBottom: Platform.OS === 'android' ? insets.bottom + 6 : 10,
          paddingTop: 8,
          height: tabBarHeight,
        },
        tabBarActiveTintColor: COLORS.primary,
        tabBarInactiveTintColor: '#334155',
        tabBarLabelStyle: { fontSize: 10, fontWeight: '700' },
      }}
    >
      <Tab.Screen name="Home" component={HomeScreen} options={{ tabBarLabel: i18n('tabHome'), tabBarIcon: ({ focused }) => <Text style={{ fontSize: focused ? 20 : 18 }}>🏠</Text> }} />
      <Tab.Screen name="Search" component={SearchScreen} options={{ tabBarLabel: i18n('tabSearch'), tabBarIcon: ({ focused }) => <Text style={{ fontSize: focused ? 20 : 18 }}>🔍</Text> }} />
      <Tab.Screen name="Stores" component={StoreDealsScreen} options={{ tabBarLabel: '🏪 Stores', tabBarIcon: ({ focused }) => <Text style={{ fontSize: focused ? 20 : 18 }}>🏪</Text> }} />
      <Tab.Screen name="Alerts" component={AlertsScreen} options={{ tabBarLabel: i18n('tabAlerts'), tabBarIcon: ({ focused }) => <Text style={{ fontSize: focused ? 20 : 18 }}>🔔</Text> }} />
      <Tab.Screen name="Favorites" component={FavoritesScreen} options={{ tabBarLabel: i18n('tabFavorites'), tabBarIcon: ({ focused }) => <Text style={{ fontSize: focused ? 20 : 18 }}>❤️</Text> }} />
    </Tab.Navigator>
  );
}

export default function App() {
  const [showSplash, setShowSplash] = useState(true);

  useEffect(() => {
    loadInterstitial();
  }, []);

  if (showSplash) return (
    <SafeAreaProvider>
      <SplashScreen onDone={() => setShowSplash(false)} />
    </SafeAreaProvider>
  );

  return (
    <SafeAreaProvider>
      <NavigationContainer>
        <StatusBar style="light" />
        <Stack.Navigator screenOptions={{ headerShown: false }}>
          <Stack.Screen name="Main" component={TabNavigator} />
          <Stack.Screen name="Detail" component={DetailScreen} options={{ animation: 'slide_from_right' }} />
          <Stack.Screen name="Premium" component={PremiumScreen} options={{ animation: 'slide_from_bottom' }} />
        </Stack.Navigator>
      </NavigationContainer>
    </SafeAreaProvider>
  );
}

const splash = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  // Halo de fond large violet/indigo
  bgHalo: {
    position: 'absolute',
    width: 600,
    height: 600,
    borderRadius: 300,
    backgroundColor: 'rgba(99,102,241,0.12)',
    shadowColor: '#6366f1',
    shadowOpacity: 1,
    shadowRadius: 120,
    shadowOffset: { width: 0, height: 0 },
  },
  bgHaloInner: {
    position: 'absolute',
    width: 350,
    height: 350,
    borderRadius: 175,
    backgroundColor: 'rgba(139,92,246,0.1)',
    shadowColor: '#8b5cf6',
    shadowOpacity: 1,
    shadowRadius: 80,
    shadowOffset: { width: 0, height: 0 },
  },
  // Glow extérieur
  outerGlowRing: {
    position: 'absolute',
    width: 320,
    height: 320,
    borderRadius: 160,
    backgroundColor: 'rgba(99,102,241,0.08)',
    borderWidth: 1,
    borderColor: 'rgba(99,102,241,0.2)',
    shadowColor: '#6366f1',
    shadowOpacity: 0.9,
    shadowRadius: 50,
    shadowOffset: { width: 0, height: 0 },
  },
  // Glow intérieur
  innerGlowRing: {
    position: 'absolute',
    width: 220,
    height: 220,
    borderRadius: 110,
    backgroundColor: 'rgba(99,102,241,0.12)',
    shadowColor: '#818cf8',
    shadowOpacity: 1,
    shadowRadius: 30,
    shadowOffset: { width: 0, height: 0 },
  },
  // Logo grand et centré
  logo: {
    width: 200,
    height: 200,
    marginBottom: 28,
    shadowColor: '#6366f1',
    shadowOpacity: 0.8,
    shadowRadius: 30,
    shadowOffset: { width: 0, height: 0 },
  },
  appName: {
    fontSize: 42,
    fontWeight: '800',
    color: '#ffffff',
    letterSpacing: -1,
    marginBottom: 10,
    textShadowColor: 'rgba(99,102,241,0.8)',
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 20,
  },
  tagline: {
    fontSize: 14,
    color: '#64748b',
    fontWeight: '600',
    letterSpacing: 0.5,
  },
});

import { registerRootComponent } from 'expo';
registerRootComponent(App);
