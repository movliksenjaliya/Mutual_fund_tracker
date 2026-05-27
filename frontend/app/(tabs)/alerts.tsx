import React, { useCallback, useMemo, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
} from "react-native";
import { useFocusEffect, useRouter } from "expo-router";
import { Feather } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { api } from "@/src/api";
import { useColors, useTypography, radius, spacing } from "@/src/theme";
import ChangePill from "@/src/components/ChangePill";

export default function Alerts() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const colors = useColors();
  const typography = useTypography();
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const styles = useMemo(
    () =>
      StyleSheet.create({
        container: { flex: 1, backgroundColor: colors.bg },
        header: {
          paddingHorizontal: spacing.p6,
          paddingTop: spacing.p4,
          paddingBottom: spacing.p3,
          flexDirection: "row",
          alignItems: "flex-end",
          justifyContent: "space-between",
        },
        markAllBtn: {
          flexDirection: "row",
          alignItems: "center",
          paddingHorizontal: spacing.p3,
          paddingVertical: spacing.p2,
          borderRadius: radius.pill,
          borderWidth: 1,
          borderColor: colors.borderLight,
          backgroundColor: colors.surface,
        },
        card: {
          flexDirection: "row",
          alignItems: "center",
          gap: spacing.p3,
          backgroundColor: colors.surface,
          borderWidth: 1,
          borderColor: colors.borderLight,
          borderRadius: radius.md,
          padding: spacing.p4,
          marginBottom: spacing.p3,
        },
        alertIcon: {
          width: 36,
          height: 36,
          borderRadius: radius.pill,
          backgroundColor: colors.negativeBg,
          alignItems: "center",
          justifyContent: "center",
        },
        empty: { alignItems: "center", paddingTop: 60, paddingHorizontal: spacing.p6 },
        checkBtn: {
          marginTop: spacing.p6,
          paddingHorizontal: spacing.p4,
          paddingVertical: spacing.p3,
          borderRadius: radius.pill,
          backgroundColor: colors.brand,
          flexDirection: "row",
          alignItems: "center",
        },
      }),
    [colors],
  );

  const load = useCallback(async () => {
    try {
      const r = await api.alerts();
      setItems(r.items);
    } catch (e) {
      console.warn(e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const refresh = async () => {
    setRefreshing(true);
    try { await api.runCheck(); } catch {}
    load();
  };

  const markAll = async () => {
    await api.markAllRead();
    load();
  };

  const onAlertPress = async (alert: any) => {
    if (!alert.read) await api.markAlertRead(alert.id);
    router.push(`/fund/${alert.scheme_code}`);
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <View>
          <Text style={typography.overline}>NOTIFICATIONS</Text>
          <Text style={typography.h1}>Alerts</Text>
        </View>
        {items.length > 0 && (
          <TouchableOpacity testID="mark-all-read-btn" onPress={markAll} style={styles.markAllBtn}>
            <Feather name="check" size={14} color={colors.brand} />
            <Text style={[typography.bodySmall, { color: colors.brand, marginLeft: 4, fontWeight: "600" }]}>Mark all read</Text>
          </TouchableOpacity>
        )}
      </View>

      {loading ? (
        <ActivityIndicator color={colors.brand} style={{ marginTop: 40 }} />
      ) : (
        <FlatList
          data={items}
          keyExtractor={(a) => a.id}
          contentContainerStyle={{ padding: spacing.p6, paddingBottom: 80 }}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} tintColor={colors.brand} />}
          ListEmptyComponent={
            <View style={styles.empty} testID="alerts-empty">
              <Feather name="bell-off" size={32} color={colors.textTertiary} />
              <Text style={[typography.h4, { marginTop: spacing.p3 }]}>No alerts yet</Text>
              <Text style={[typography.bodySmall, { textAlign: "center", marginTop: 6 }]}>
                You will be notified here when Nifty or your tracked funds drop more than your threshold.
              </Text>
              <TouchableOpacity testID="run-check-btn" style={styles.checkBtn} onPress={refresh}>
                <Feather name="refresh-cw" size={14} color={colors.textInverse} />
                <Text style={[typography.bodySmall, { color: colors.textInverse, marginLeft: 6, fontWeight: "600" }]}>Check now</Text>
              </TouchableOpacity>
            </View>
          }
          renderItem={({ item }) => (
            <TouchableOpacity
              testID={`alert-item-${item.id}`}
              activeOpacity={0.9}
              onPress={() => onAlertPress(item)}
              style={[styles.card, item.read ? { opacity: 0.6 } : null]}
            >
              <View style={styles.alertIcon}>
                <Feather name="trending-down" size={18} color={colors.negative} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[typography.bodyMedium, { fontWeight: "600" }]} numberOfLines={2}>{item.scheme_name}</Text>
                <Text style={[typography.bodySmall, { marginTop: 2 }]}>
                  ₹{item.prev_nav.toFixed(2)} → ₹{item.curr_nav.toFixed(2)} · {item.nav_date}
                </Text>
              </View>
              <ChangePill changePct={item.change_pct} />
            </TouchableOpacity>
          )}
        />
      )}
    </View>
  );
}
