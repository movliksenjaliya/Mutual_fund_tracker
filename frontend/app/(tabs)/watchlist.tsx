import React, { useCallback, useMemo, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  TextInput,
  Modal,
} from "react-native";
import { useFocusEffect, useRouter } from "expo-router";
import { Feather } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { api, formatINR } from "@/src/api";
import { useColors, useTypography, radius, spacing } from "@/src/theme";
import ChangePill from "@/src/components/ChangePill";
import { confirm } from "@/src/utils/dialog";

export default function Watchlist() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const colors = useColors();
  const typography = useTypography();
  const [items, setItems] = useState<any[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [targetModal, setTargetModal] = useState<{ id: string; current?: number | null } | null>(null);
  const [targetInput, setTargetInput] = useState("");

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
        addBtn: {
          width: 44,
          height: 44,
          borderRadius: radius.pill,
          backgroundColor: colors.brand,
          alignItems: "center",
          justifyContent: "center",
        },
        card: {
          backgroundColor: colors.surface,
          borderWidth: 1,
          borderColor: colors.borderLight,
          borderRadius: radius.md,
          padding: spacing.p4,
          marginBottom: spacing.p3,
        },
        row: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-end", marginTop: spacing.p4 },
        targetRow: {
          marginTop: spacing.p3,
          flexDirection: "row",
          alignItems: "center",
          paddingVertical: spacing.p2,
          paddingHorizontal: spacing.p3,
          borderRadius: radius.sm,
          backgroundColor: colors.bgSecondary,
          alignSelf: "flex-start",
        },
        empty: { alignItems: "center", paddingTop: 80, paddingHorizontal: spacing.p6 },
        modalOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.55)", justifyContent: "center", padding: spacing.p6 },
        modalCard: { backgroundColor: colors.surface, borderRadius: radius.lg, padding: spacing.p6 },
        input: {
          marginTop: spacing.p4,
          borderWidth: 1,
          borderColor: colors.borderMedium,
          borderRadius: radius.md,
          padding: spacing.p4,
          fontSize: 16,
          color: colors.textPrimary,
          backgroundColor: colors.bg,
        },
        btn: { flex: 1, paddingVertical: spacing.p3, borderRadius: radius.pill, alignItems: "center" },
        btnPrimary: { backgroundColor: colors.brand },
        btnSecondary: { borderWidth: 1, borderColor: colors.borderMedium },
      }),
    [colors],
  );

  const load = useCallback(async () => {
    try {
      const r = await api.watchlist();
      setItems(r.items);
    } catch (e) {
      console.warn(e);
    } finally {
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const remove = async (id: string, name: string) => {
    const ok = await confirm("Remove from watchlist?", name);
    if (!ok) return;
    await api.deleteWatchlist(id);
    load();
  };

  const openTarget = (id: string, current?: number | null) => {
    setTargetModal({ id, current });
    setTargetInput(current ? String(current) : "");
  };

  const saveTarget = async () => {
    if (!targetModal) return;
    const v = parseFloat(targetInput);
    await api.updateWatchlist(targetModal.id, { target_buy_price: isNaN(v) ? null : v });
    setTargetModal(null);
    setTargetInput("");
    load();
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <View>
          <Text style={typography.overline}>YOUR LIST</Text>
          <Text style={typography.h1}>Watchlist</Text>
        </View>
        <TouchableOpacity testID="open-search-btn" style={styles.addBtn} onPress={() => router.push("/search?mode=watchlist")}>
          <Feather name="plus" size={20} color={colors.textInverse} />
        </TouchableOpacity>
      </View>

      <FlatList
        data={items}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{ padding: spacing.p6, paddingBottom: 80 }}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }} tintColor={colors.brand} />
        }
        ListEmptyComponent={
          <View style={styles.empty} testID="watchlist-empty">
            <Feather name="bookmark" size={32} color={colors.textTertiary} />
            <Text style={[typography.h4, { marginTop: spacing.p3 }]}>Empty watchlist</Text>
            <Text style={[typography.bodySmall, { textAlign: "center", marginTop: 6 }]}>
              Tap + to search and add mutual funds you want to track.
            </Text>
          </View>
        }
        renderItem={({ item }) => {
          const target = item.target_buy_price;
          const curr = item.nav?.curr_nav;
          const hitsTarget = target != null && curr != null && curr <= target;
          return (
            <TouchableOpacity
              testID={`watchlist-item-${item.scheme_code}`}
              style={styles.card}
              activeOpacity={0.9}
              onPress={() => router.push(`/fund/${item.scheme_code}`)}
            >
              <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start" }}>
                <Text style={[typography.bodyMedium, { fontWeight: "600", flex: 1, paddingRight: spacing.p3 }]} numberOfLines={2}>
                  {item.scheme_name}
                </Text>
                <TouchableOpacity testID={`watchlist-remove-${item.scheme_code}`} onPress={() => remove(item.id, item.scheme_name)} hitSlop={10}>
                  <Feather name="x" size={18} color={colors.textTertiary} />
                </TouchableOpacity>
              </View>
              <View style={styles.row}>
                <View>
                  <Text style={typography.bodySmall}>Current NAV</Text>
                  <Text style={[typography.h3, { marginTop: 2 }]}>₹{curr ? curr.toFixed(2) : "—"}</Text>
                </View>
                <ChangePill changePct={item.nav?.change_pct} />
              </View>
              <TouchableOpacity
                testID={`watchlist-target-${item.scheme_code}`}
                style={[styles.targetRow, hitsTarget ? { backgroundColor: colors.positiveBg } : null]}
                onPress={() => openTarget(item.id, target)}
              >
                <Feather name="target" size={14} color={hitsTarget ? colors.positive : colors.textSecondary} />
                <Text style={[typography.bodySmall, { color: hitsTarget ? colors.positive : colors.textSecondary, marginLeft: 6, fontWeight: "600" }]}>
                  {target ? `Target ${formatINR(target)}${hitsTarget ? " · HIT" : ""}` : "Set target buy price"}
                </Text>
              </TouchableOpacity>
            </TouchableOpacity>
          );
        }}
      />

      <Modal visible={targetModal != null} transparent animationType="fade" onRequestClose={() => setTargetModal(null)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={typography.h3}>Set target buy price</Text>
            <Text style={[typography.bodySmall, { marginTop: 4 }]}>
              Alerts will surface this fund when NAV drops at or below your target.
            </Text>
            <TextInput
              testID="target-input"
              keyboardType="decimal-pad"
              value={targetInput}
              onChangeText={setTargetInput}
              placeholder="₹0.00"
              placeholderTextColor={colors.textTertiary}
              style={styles.input}
            />
            <View style={{ flexDirection: "row", gap: spacing.p3, marginTop: spacing.p4 }}>
              <TouchableOpacity testID="target-cancel" style={[styles.btn, styles.btnSecondary]} onPress={() => setTargetModal(null)}>
                <Text style={[typography.bodyMedium, { fontWeight: "600" }]}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity testID="target-save" style={[styles.btn, styles.btnPrimary]} onPress={saveTarget}>
                <Text style={[typography.bodyMedium, { color: "#fff", fontWeight: "600" }]}>Save</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}
