import React, { useCallback, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Alert,
  RefreshControl,
  ActivityIndicator,
} from "react-native";
import { useFocusEffect, useRouter } from "expo-router";
import { Feather } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { api, formatINR, formatPct } from "@/src/api";
import { colors, radius, spacing, typography } from "@/src/theme";
import ChangePill from "@/src/components/ChangePill";

export default function Portfolio() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [items, setItems] = useState<any[]>([]);
  const [summary, setSummary] = useState<any>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    try {
      const r = await api.portfolio();
      setItems(r.items);
      setSummary(r.summary);
    } catch (e) {
      console.warn(e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const remove = (id: string, name: string) => {
    Alert.alert("Remove holding?", name, [
      { text: "Cancel", style: "cancel" },
      {
        text: "Remove",
        style: "destructive",
        onPress: async () => {
          await api.deletePortfolio(id);
          load();
        },
      },
    ]);
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <View>
          <Text style={typography.overline}>HOLDINGS</Text>
          <Text style={typography.h1}>Portfolio</Text>
        </View>
        <TouchableOpacity
          testID="add-holding-btn"
          style={styles.addBtn}
          onPress={() => router.push("/search?mode=portfolio")}
        >
          <Feather name="plus" size={20} color={colors.textInverse} />
        </TouchableOpacity>
      </View>

      {loading ? (
        <ActivityIndicator color={colors.brand} style={{ marginTop: 40 }} />
      ) : (
        <FlatList
          data={items}
          keyExtractor={(it) => it.id}
          contentContainerStyle={{ padding: spacing.p6, paddingBottom: 80 }}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }} tintColor={colors.brand} />}
          ListHeaderComponent={
            <View style={styles.summary} testID="portfolio-summary">
              <Text style={typography.overline}>TOTAL VALUE</Text>
              <Text style={[typography.financialLarge, { marginTop: 4 }]} testID="portfolio-total-current">
                {formatINR(summary?.total_current)}
              </Text>
              <View style={{ flexDirection: "row", alignItems: "center", gap: spacing.p2, marginTop: spacing.p2 }}>
                <ChangePill changePct={summary?.total_pnl_pct} />
                <Text style={typography.bodySmall}>
                  {(summary?.total_pnl ?? 0) >= 0 ? "+" : ""}
                  {formatINR(summary?.total_pnl)}
                </Text>
              </View>
              <View style={styles.summaryRow}>
                <View style={styles.summaryCol}>
                  <Text style={typography.bodySmall}>Invested</Text>
                  <Text style={[typography.h4, { marginTop: 2 }]}>{formatINR(summary?.total_invested)}</Text>
                </View>
                <View style={[styles.summaryCol, { borderLeftWidth: 1, borderLeftColor: colors.borderLight, paddingLeft: spacing.p4 }]}>
                  <Text style={typography.bodySmall}>Returns</Text>
                  <Text style={[typography.h4, { marginTop: 2, color: (summary?.total_pnl ?? 0) >= 0 ? colors.positive : colors.negative }]}>
                    {formatPct(summary?.total_pnl_pct)}
                  </Text>
                </View>
              </View>
            </View>
          }
          ListEmptyComponent={
            <View style={styles.empty} testID="portfolio-empty">
              <Feather name="briefcase" size={32} color={colors.textTertiary} />
              <Text style={[typography.h4, { marginTop: spacing.p3 }]}>No holdings yet</Text>
              <Text style={[typography.bodySmall, { textAlign: "center", marginTop: 6 }]}>
                Add the funds you have invested in to track your P&L.
              </Text>
            </View>
          }
          renderItem={({ item }) => (
            <TouchableOpacity
              testID={`portfolio-item-${item.scheme_code}`}
              activeOpacity={0.9}
              style={styles.card}
              onPress={() => router.push(`/fund/${item.scheme_code}`)}
            >
              <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start" }}>
                <Text style={[typography.bodyMedium, { fontWeight: "600", flex: 1, paddingRight: spacing.p3 }]} numberOfLines={2}>
                  {item.scheme_name}
                </Text>
                <TouchableOpacity testID={`portfolio-remove-${item.scheme_code}`} onPress={() => remove(item.id, item.scheme_name)} hitSlop={10}>
                  <Feather name="x" size={18} color={colors.textTertiary} />
                </TouchableOpacity>
              </View>
              <View style={styles.gridRow}>
                <View style={styles.gridCell}>
                  <Text style={typography.bodySmall}>Units</Text>
                  <Text style={[typography.bodyLarge, { fontWeight: "600", marginTop: 2 }]}>
                    {item.units?.toFixed(3)}
                  </Text>
                </View>
                <View style={styles.gridCell}>
                  <Text style={typography.bodySmall}>Avg Buy</Text>
                  <Text style={[typography.bodyLarge, { fontWeight: "600", marginTop: 2 }]}>
                    ₹{item.avg_buy_price?.toFixed(2)}
                  </Text>
                </View>
                <View style={styles.gridCell}>
                  <Text style={typography.bodySmall}>Current NAV</Text>
                  <Text style={[typography.bodyLarge, { fontWeight: "600", marginTop: 2 }]}>
                    ₹{item.nav?.curr_nav?.toFixed(2) || "—"}
                  </Text>
                </View>
              </View>
              <View style={[styles.gridRow, { marginTop: 0, borderTopWidth: 1, borderTopColor: colors.borderLight, paddingTop: spacing.p3 }]}>
                <View style={styles.gridCell}>
                  <Text style={typography.bodySmall}>Invested</Text>
                  <Text style={[typography.bodyMedium, { fontWeight: "600", marginTop: 2 }]}>
                    {formatINR(item.invested)}
                  </Text>
                </View>
                <View style={styles.gridCell}>
                  <Text style={typography.bodySmall}>Current</Text>
                  <Text style={[typography.bodyMedium, { fontWeight: "600", marginTop: 2 }]}>
                    {formatINR(item.current_value)}
                  </Text>
                </View>
                <View style={styles.gridCell}>
                  <Text style={typography.bodySmall}>P&L</Text>
                  <Text style={[typography.bodyMedium, { fontWeight: "700", marginTop: 2, color: item.pnl >= 0 ? colors.positive : colors.negative }]}>
                    {(item.pnl ?? 0) >= 0 ? "+" : ""}
                    {formatINR(item.pnl)}
                  </Text>
                </View>
              </View>
            </TouchableOpacity>
          )}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
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
  summary: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.borderLight,
    borderRadius: radius.lg,
    padding: spacing.p6,
    marginBottom: spacing.p4,
  },
  summaryRow: { flexDirection: "row", marginTop: spacing.p6 },
  summaryCol: { flex: 1 },
  card: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.borderLight,
    borderRadius: radius.md,
    padding: spacing.p4,
    marginBottom: spacing.p3,
  },
  gridRow: { flexDirection: "row", marginTop: spacing.p4, gap: spacing.p3 },
  gridCell: { flex: 1 },
  empty: { alignItems: "center", paddingTop: 60, paddingHorizontal: spacing.p6 },
});
