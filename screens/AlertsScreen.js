import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, TouchableOpacity, TextInput,
  FlatList, StyleSheet, Alert, Platform, Modal, ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { COLORS } from '../constants/theme';
import i18n from '../services/i18n';
import AdBanner from '../components/AdBanner';
import { isPremium, FREE_LIMITS } from '../services/premium';

const ALERTS_KEY = 'pixelprices_alerts';

// Stores disponibles sur CheapShark
const STORES = [
  { id: 'all',  name: '🌐 All Stores',       color: '#6366f1' },
  { id: '1',    name: '🎮 Steam',             color: '#1b2838' },
  { id: '7',    name: '🟣 GOG',               color: '#86328a' },
  { id: '25',   name: '⚡ Epic Games',        color: '#2d2d2d' },
  { id: '11',   name: '🎁 Humble Store',      color: '#cc2929' },
  { id: '15',   name: '🔥 Fanatical',         color: '#e4202a' },
  { id: '3',    name: '🟢 GreenManGaming',    color: '#00a651' },
  { id: '23',   name: '🎫 GameBillet',        color: '#e63946' },
  { id: '27',   name: '🌍 Gamesplanet',       color: '#009e4f' },
  { id: '13',   name: '🔵 Ubisoft Connect',   color: '#0070ff' },
  { id: '8',    name: '🟠 EA App',            color: '#f56c2d' },
  { id: '21',   name: '🎯 WinGameStore',      color: '#5c3d91' },
  { id: '24',   name: '🟡 Voidu',             color: '#ff6b35' },
];

// Sélecteur de store — Premium uniquement
function StorePicker({ visible, selected, onSelect, onClose, userIsPremium, navigation }) {
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={onClose}>
        <View style={styles.modalSheet}>
          <View style={styles.modalHandle} />
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>🏪 Select Store</Text>
            {!userIsPremium && (
              <View style={styles.premiumOnlyBadge}>
                <Text style={styles.premiumOnlyText}>⭐ Premium</Text>
              </View>
            )}
          </View>
          {!userIsPremium ? (
            <View style={styles.premiumLockWrap}>
              <Text style={styles.premiumLockIcon}>🔒</Text>
              <Text style={styles.premiumLockTitle}>Store-specific alerts</Text>
              <Text style={styles.premiumLockDesc}>
                Upgrade to Premium to set alerts on specific stores like Steam, GOG, Epic Games and more.
              </Text>
              <TouchableOpacity
                style={styles.premiumLockBtn}
                onPress={() => { onClose(); navigation.navigate('Premium'); }}
              >
                <Text style={styles.premiumLockBtnText}>⭐ Upgrade to Premium — $2.99</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <ScrollView>
              {STORES.map(store => (
                <TouchableOpacity
                  key={store.id}
                  style={[styles.storeRow, selected === store.id && styles.storeRowActive]}
                  onPress={() => { onSelect(store.id); onClose(); }}
                >
                  <View style={[styles.storeDot, { backgroundColor: store.color }]} />
                  <Text style={styles.storeName}>{store.name}</Text>
                  {selected === store.id && <Text style={styles.storeCheck}>✓</Text>}
                </TouchableOpacity>
              ))}
            </ScrollView>
          )}
        </View>
      </TouchableOpacity>
    </Modal>
  );
}

export default function AlertsScreen({ navigation, route }) {
  const [alerts, setAlerts] = useState([]);
  const [showAdd, setShowAdd] = useState(false);
  const [gameTitle, setGameTitle] = useState('');
  const [targetPrice, setTargetPrice] = useState('');
  const [selectedStore, setSelectedStore] = useState('all');
  const [showStorePicker, setShowStorePicker] = useState(false);
  const [userIsPremium, setUserIsPremium] = useState(false);

  const loadAlerts = async () => {
    try {
      const stored = await AsyncStorage.getItem(ALERTS_KEY);
      if (stored) setAlerts(JSON.parse(stored));
    } catch {}
  };

  const saveAlerts = async (newAlerts) => {
    try {
      await AsyncStorage.setItem(ALERTS_KEY, JSON.stringify(newAlerts));
    } catch {}
  };

  useFocusEffect(
    useCallback(() => {
      isPremium().then(setUserIsPremium);
      loadAlerts();

      if (route?.params?.gameTitle) {
        setGameTitle(route.params.gameTitle);
        setTargetPrice(route.params.gamePrice || '');
        setSelectedStore('all');
        setShowAdd(true);
        navigation.setParams({ gameTitle: undefined, gamePrice: undefined });
      }
    }, [route?.params?.gameTitle])
  );

  const getStoreName = (storeId) => {
    const store = STORES.find(s => s.id === storeId);
    return store ? store.name : '🌐 All Stores';
  };

  const addAlert = async () => {
    const currentPremium = await isPremium();
    // Relit depuis AsyncStorage pour avoir le vrai compte à jour
    const storedRaw = await AsyncStorage.getItem(ALERTS_KEY);
    const storedAlerts = storedRaw ? JSON.parse(storedRaw) : [];
    if (!currentPremium && storedAlerts.length >= FREE_LIMITS.maxAlerts) {
      Alert.alert(i18n('premiumLimitReached'), i18n('alertLimitDesc'), [
        { text: i18n('cancel'), style: 'cancel' },
        { text: i18n('upgradeToPremium'), onPress: () => navigation.navigate('Premium') },
      ]);
      return;
    }
    if (!gameTitle.trim() || !targetPrice.trim()) {
      Alert.alert(i18n('missingFields'), i18n('missingFieldsDesc'));
      return;
    }
    const newAlert = {
      id: Date.now(),
      gameTitle: gameTitle.trim(),
      targetPrice: parseFloat(targetPrice),
      storeId: selectedStore,
      storeName: getStoreName(selectedStore),
      createdAt: new Date().toLocaleDateString(),
    };
    const newAlerts = [...alerts, newAlert];
    setAlerts(newAlerts);
    await saveAlerts(newAlerts);
    setShowAdd(false);
    setGameTitle('');
    setTargetPrice('');
    setSelectedStore('all');
    const storeLabel = selectedStore === 'all' ? 'any store' : getStoreName(selectedStore);
    Alert.alert(
      i18n('alertCreated'),
      `"${newAlert.gameTitle}" on ${storeLabel} below $${targetPrice}.`
    );
  };

  const removeAlert = (id) => {
    Alert.alert(i18n('deleteAlert'), '', [
      { text: i18n('cancel'), style: 'cancel' },
      { text: i18n('delete'), style: 'destructive', onPress: async () => {
        const newAlerts = alerts.filter(a => a.id !== id);
        setAlerts(newAlerts);
        await saveAlerts(newAlerts);
      }},
    ]);
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.header}>
        <View style={styles.headerTop}>
          <Text style={styles.title}>{i18n('alertsTitle')}</Text>
          {!userIsPremium && (
            <TouchableOpacity style={styles.premiumBadge} onPress={() => navigation.navigate('Premium')} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
              <Text style={styles.premiumBadgeText}>⭐ Premium</Text>
            </TouchableOpacity>
          )}
        </View>
        <Text style={styles.subtitle}>
          {userIsPremium
            ? i18n('alertsSubtitle')
            : `${alerts.length}/${FREE_LIMITS.maxAlerts} · ${i18n('alertsSubtitle')}`}
        </Text>
      </View>

      <FlatList
        data={alerts}
        keyExtractor={item => String(item.id)}
        contentContainerStyle={styles.list}
        ListHeaderComponent={showAdd ? (
          <View style={styles.addCard}>
            <Text style={styles.addTitle}>{i18n('newAlert')}</Text>

            {/* Nom du jeu */}
            <Text style={styles.addLabel}>{i18n('gameNameLabel')}</Text>
            <TextInput
              style={styles.input}
              placeholder={i18n('gameNamePlaceholder')}
              placeholderTextColor={COLORS.text4}
              value={gameTitle}
              onChangeText={setGameTitle}
            />

            {/* Sélecteur de store */}
            <Text style={styles.addLabel}>STORE</Text>
            <TouchableOpacity
              style={styles.storeSelectorBtn}
              onPress={() => setShowStorePicker(true)}
            >
              <Text style={styles.storeSelectorText}>{getStoreName(selectedStore)}</Text>
              {!userIsPremium && (
                <View style={styles.lockBadge}>
                  <Text style={styles.lockBadgeText}>🔒 Premium</Text>
                </View>
              )}
              <Text style={styles.storeSelectorArrow}>▾</Text>
            </TouchableOpacity>

            {/* Prix cible */}
            <Text style={styles.addLabel}>{i18n('targetPriceLabel')}</Text>
            <TextInput
              style={styles.input}
              placeholder={i18n('targetPricePlaceholder')}
              placeholderTextColor={COLORS.text4}
              keyboardType="decimal-pad"
              value={targetPrice}
              onChangeText={setTargetPrice}
            />

            <View style={styles.addBtns}>
              <TouchableOpacity style={styles.cancelBtn} onPress={() => {
                setShowAdd(false);
                setGameTitle('');
                setTargetPrice('');
                setSelectedStore('all');
              }}>
                <Text style={styles.cancelBtnText}>{i18n('cancel')}</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.confirmBtn} onPress={addAlert}>
                <Text style={styles.confirmBtnText}>{i18n('createAlert')}</Text>
              </TouchableOpacity>
            </View>
          </View>
        ) : null}
        renderItem={({ item }) => (
          <View style={styles.alertCard}>
            <View style={{ flex: 1 }}>
              <Text style={styles.alertGame}>{item.gameTitle}</Text>
              <View style={styles.alertRow}>
                <View style={styles.alertInfo}>
                  <Text style={styles.alertLabel}>{i18n('targetPrice')}</Text>
                  <Text style={styles.alertTarget}>${item.targetPrice.toFixed(2)}</Text>
                </View>
                <View style={styles.alertInfo}>
                  <Text style={styles.alertLabel}>STORE</Text>
                  <Text style={styles.alertStore}>
                    {item.storeName || '🌐 All Stores'}
                  </Text>
                </View>
                <View style={styles.alertInfo}>
                  <Text style={styles.alertLabel}>{i18n('createdOn')}</Text>
                  <Text style={styles.alertDate}>{item.createdAt}</Text>
                </View>
              </View>
            </View>
            <TouchableOpacity style={styles.deleteBtn} onPress={() => removeAlert(item.id)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
              <Text style={styles.deleteBtnText}>✕</Text>
            </TouchableOpacity>
          </View>
        )}
        ItemSeparatorComponent={() => <View style={{ height: 10 }} />}
        ListEmptyComponent={!showAdd ? (
          <View style={styles.empty}>
            <Text style={{ fontSize: 52, marginBottom: 16 }}>🔔</Text>
            <Text style={styles.emptyTitle}>{i18n('noAlerts')}</Text>
            <Text style={styles.emptyText}>{i18n('noAlertsDesc')}</Text>
          </View>
        ) : null}
      />

      <View style={styles.bottomArea}>
        <AdBanner />
        {!showAdd && (
          <TouchableOpacity style={styles.fab} onPress={() => {
            setGameTitle('');
            setTargetPrice('');
            setSelectedStore('all');
            setShowAdd(true);
          }}>
            <Text style={styles.fabText}>{i18n('newAlertBtn')}</Text>
          </TouchableOpacity>
        )}
      </View>

      <StorePicker
        visible={showStorePicker}
        selected={selectedStore}
        onSelect={setSelectedStore}
        onClose={() => setShowStorePicker(false)}
        userIsPremium={userIsPremium}
        navigation={navigation}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: COLORS.bg },
  header: { backgroundColor: COLORS.surface, borderBottomWidth: 1, borderBottomColor: COLORS.border, paddingHorizontal: 16, paddingTop: Platform.OS === 'android' ? 8 : 16, paddingBottom: 16 },
  headerTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 },
  title: { fontSize: 24, fontWeight: '800', color: COLORS.text },
  premiumBadge: { backgroundColor: 'rgba(251,191,36,0.15)', borderRadius: 20, paddingHorizontal: 12, paddingVertical: Platform.OS === 'android' ? 8 : 5, borderWidth: 1, borderColor: 'rgba(251,191,36,0.3)' },
  premiumBadgeText: { fontSize: 12, fontWeight: '700', color: '#fbbf24' },
  subtitle: { fontSize: 13, color: COLORS.text3 },
  list: { padding: 16, paddingBottom: 16 },

  // Form
  addCard: { backgroundColor: COLORS.surface2, borderRadius: 16, borderWidth: 1, borderColor: 'rgba(99,102,241,0.3)', padding: 16, marginBottom: 16 },
  addTitle: { fontSize: 16, fontWeight: '800', color: COLORS.text, marginBottom: 14 },
  addLabel: { fontSize: 9, fontWeight: '800', color: COLORS.text4, letterSpacing: 1, textTransform: 'uppercase', marginBottom: 8 },
  input: { backgroundColor: 'rgba(255,255,255,0.06)', borderRadius: 10, borderWidth: 1, borderColor: COLORS.border, padding: 12, color: COLORS.text, fontSize: 14, marginBottom: 14 },

  // Store selector
  storeSelectorBtn: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.06)', borderRadius: 10, borderWidth: 1, borderColor: COLORS.border, padding: 12, marginBottom: 14 },
  storeSelectorText: { flex: 1, color: COLORS.text, fontSize: 14, fontWeight: '600' },
  storeSelectorArrow: { fontSize: 12, color: COLORS.text3 },
  lockBadge: { backgroundColor: 'rgba(251,191,36,0.15)', borderRadius: 10, paddingHorizontal: 8, paddingVertical: 3, marginRight: 8, borderWidth: 1, borderColor: 'rgba(251,191,36,0.3)' },
  lockBadgeText: { fontSize: 10, fontWeight: '700', color: '#fbbf24' },

  // Buttons
  addBtns: { flexDirection: 'row', gap: 10 },
  cancelBtn: { flex: 1, padding: 12, borderRadius: 10, backgroundColor: 'rgba(255,255,255,0.05)', alignItems: 'center' },
  cancelBtnText: { fontSize: 14, fontWeight: '700', color: COLORS.text3 },
  confirmBtn: { flex: 2, padding: 12, borderRadius: 10, backgroundColor: COLORS.primary, alignItems: 'center' },
  confirmBtnText: { fontSize: 14, fontWeight: '700', color: '#fff' },

  // Alert card
  alertCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.surface2, borderRadius: 14, borderWidth: 1, borderColor: COLORS.border, padding: 16 },
  alertGame: { fontSize: 14, fontWeight: '800', color: COLORS.text, marginBottom: 10 },
  alertRow: { flexDirection: 'row', gap: 16, flexWrap: 'wrap' },
  alertInfo: {},
  alertLabel: { fontSize: 9, fontWeight: '700', color: COLORS.text4, textTransform: 'uppercase', marginBottom: 3 },
  alertTarget: { fontSize: 15, fontWeight: '800', color: COLORS.primary },
  alertStore: { fontSize: 12, fontWeight: '600', color: COLORS.text2 },
  alertDate: { fontSize: 12, color: COLORS.text3 },
  deleteBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: 'rgba(255,255,255,0.06)', alignItems: 'center', justifyContent: 'center' },
  deleteBtnText: { fontSize: 12, color: COLORS.text3 },

  // Bottom
  bottomArea: { width: '100%' },
  fab: { marginHorizontal: 24, marginTop: 10, marginBottom: Platform.OS === 'android' ? 12 : 20, backgroundColor: COLORS.primary, borderRadius: 16, padding: 16, alignItems: 'center', shadowColor: COLORS.primary, shadowOpacity: 0.5, shadowRadius: 16, shadowOffset: { width: 0, height: 6 } },
  fabText: { fontSize: 15, fontWeight: '800', color: '#fff' },
  empty: { alignItems: 'center', paddingTop: 80, paddingHorizontal: 40 },
  emptyTitle: { fontSize: 20, fontWeight: '800', color: COLORS.text2, marginBottom: 10 },
  emptyText: { fontSize: 14, color: COLORS.text3, textAlign: 'center', lineHeight: 22 },

  // Store picker modal
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'flex-end' },
  modalSheet: { backgroundColor: COLORS.surface, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24, paddingBottom: Platform.OS === 'android' ? 40 : 40, maxHeight: '80%' },
  modalHandle: { width: 40, height: 4, backgroundColor: COLORS.border, borderRadius: 4, alignSelf: 'center', marginBottom: 16 },
  modalHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 },
  modalTitle: { fontSize: 18, fontWeight: '800', color: COLORS.text },
  premiumOnlyBadge: { backgroundColor: 'rgba(251,191,36,0.15)', borderRadius: 20, paddingHorizontal: 12, paddingVertical: 5, borderWidth: 1, borderColor: 'rgba(251,191,36,0.3)' },
  premiumOnlyText: { fontSize: 12, fontWeight: '700', color: '#fbbf24' },
  storeRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: COLORS.border, gap: 12 },
  storeRowActive: { backgroundColor: 'rgba(99,102,241,0.08)', borderRadius: 10, paddingHorizontal: 10, marginHorizontal: -10 },
  storeDot: { width: 10, height: 10, borderRadius: 5 },
  storeName: { flex: 1, fontSize: 15, fontWeight: '600', color: COLORS.text },
  storeCheck: { fontSize: 16, color: COLORS.primary, fontWeight: '800' },

  // Premium lock
  premiumLockWrap: { alignItems: 'center', paddingVertical: 24, paddingHorizontal: 16 },
  premiumLockIcon: { fontSize: 48, marginBottom: 16 },
  premiumLockTitle: { fontSize: 18, fontWeight: '800', color: COLORS.text, marginBottom: 8 },
  premiumLockDesc: { fontSize: 14, color: COLORS.text3, textAlign: 'center', lineHeight: 22, marginBottom: 24 },
  premiumLockBtn: { backgroundColor: COLORS.primary, borderRadius: 14, paddingHorizontal: 24, paddingVertical: 14, width: '100%', alignItems: 'center' },
  premiumLockBtnText: { fontSize: 15, fontWeight: '800', color: '#fff' },
});
