import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { StatusBar } from 'expo-status-bar';
import { Text, View, Image, StyleSheet, Animated, Platform } from 'react-native';
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
  const scale = useRef(new Animated.Value(0.7)).current;
  const opacity = useRef(new Animated.Value(0)).current;
  const glow = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.sequence([
      Animated.parallel([
        Animated.timing(opacity, { toValue: 1, duration: 600, useNativeDriver: true }),
        Animated.spring(scale, { toValue: 1, friction: 5, tension: 60, useNativeDriver: true }),
      ]),
      Animated.timing(glow, { toValue: 1, duration: 400, useNativeDriver: true }),
      Animated.delay(900),
      Animated.parallel([
        Animated.timing(opacity, { toValue: 0, duration: 400, useNativeDriver: true }),
        Animated.timing(scale, { toValue: 1.08, duration: 400, useNativeDriver: true }),
      ]),
    ]).start(() => onDone());
  }, []);

  return (
    <View style={splash.container}>
      <StatusBar style="light" />
      <Animated.View style={[splash.glowRing, { opacity: glow, transform: [{ scale }] }]} />
      <Animated.Image source={LOGO} style={[splash.logo, { opacity, transform: [{ scale }] }]} resizeMode="contain" />
      <Animated.Text style={[splash.appName, { opacity }]}>
        Pixel<Text style={{ color: '#4ade80' }}>Prices</Text>
      </Animated.Text>
      <Animated.Text style={[splash.tagline, { opacity }]}>{i18n('tagline')}</Animated.Text>
    </View>
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
  container: { flex: 1, backgroundColor: '#0a0a0f', alignItems: 'center', justifyContent: 'center' },
  glowRing: { position: 'absolute', width: 260, height: 260, borderRadius: 130, backgroundColor: 'rgba(99,102,241,0.15)', shadowColor: '#6366f1', shadowOpacity: 0.8, shadowRadius: 60, shadowOffset: { width: 0, height: 0 } },
  logo: { width: 160, height: 160, marginBottom: 20 },
  appName: { fontSize: 36, fontWeight: '800', color: '#fff', letterSpacing: -0.5, marginBottom: 8 },
  tagline: { fontSize: 13, color: '#475569', fontWeight: '600' },
});

import { registerRootComponent } from 'expo';
registerRootComponent(App);
