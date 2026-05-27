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

import { api, formatINR, formatPct } from "@/src/api";
import { useColors, useTypography, radius, spacing } from "@/src/theme";
import ChangePill from "@/src/components/ChangePill";
import PieChart from "@/src/components/PieChart";

// Smart number formatter — show up to N significant decimals, strip trailing zeros.
function fmtNum(n: number | null | undefined, maxFractionDigits = 4): string {
  if (n == null || isNaN(n)) return "—";
  const s = n.toFixed(maxFractionDigits);
  return s.replace(/\.?0+$/, "");
}

const PROJECTION_RATES = [10, 12, 15];
const PROJECTION_YEARS = 5;

export default function Portfolio() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const colors = useColors();
  const typography = useTypography();
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

  const projections = useMemo(() => {
    const principal = summary?.total_current || 0;
    if (!principal) return [];
    return PROJECTION_RATES.map((rate) => ({
      rate,
      value: principal * Math.pow(1 + rate / 100, PROJECTION_YEARS),
    }));
  }, [summary?.total_current]);

  return (
    <View style={[styles.container, { backgroundColor: colors.bg, paddingTop: insets.top }]}>
      <View style={styles.header}>
        <View>
          <Text style={[typography.overline, { color: colors.textSecondary }]}>HOLDINGS</Text>
          <Text style={[typography.h1, { color: colors.textPrimary }]}>Portfolio</Text>
        </View>
        <TouchableOpacity
          testID="add-holding-btn"
          style={[styles.addBtn, { backgroundColor: colors.brand }]}
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
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => { setRefreshing(true); load(); }}
              tintColor={colors.brand}
            />
          }
          ListHeaderComponent={
            <View>
              <View style={[styles.summary, { backgroundColor: colors.surface, borderColor: colors.borderLight }]} testID="portfolio-summary">
                <Text style={[typography.overline, { color: colors.textSecondary }]}>TOTAL VALUE</Text>
                <Text style={[typography.financialLarge, { marginTop: 4, color: colors.textPrimary }]} testID="portfolio-total-current">
                  {formatINR(summary?.total_current)}
                </Text>
                <View style={{ flexDirection: "row", alignItems: "center", gap: spacing.p2, marginTop: spacing.p2, flexWrap: "wrap" }}>
                  <ChangePill changePct={summary?.total_pnl_pct} />
                  <Text style={[typography.bodySmall, { color: colors.textSecondary }]}>
                    {(summary?.total_pnl ?? 0) >= 0 ? "+" : ""}
                    {formatINR(summary?.total_pnl)}
                  </Text>
                  {summary?.total_xirr != null && (
                    <View
                      style={[
                        styles.xirrBadge,
                        {
                          backgroundColor: summary.total_xirr >= 0 ? colors.positiveBg : colors.negativeBg,
                        },
                      ]}
                      testID="portfolio-xirr"
                    >
                      <Feather
                        name="percent"
                        size={11}
                        color={summary.total_xirr >= 0 ? colors.positive : colors.negative}
                      />
                      <Text
                        style={[
                          typography.bodySmall,
                          { fontWeight: "700", marginLeft: 4, color: summary.total_xirr >= 0 ? colors.positive : colors.negative },
                        ]}
                      >
                        XIRR {summary.total_xirr >= 0 ? "+" : ""}{summary.total_xirr.toFixed(2)}%
                      </Text>
                    </View>
                  )}
               
                {summary?.yearly_xirr && Object.keys(summary.yearly_xirr).length > 0 && (
                    <View style={{ marginTop: spacing.p3 }}>
                      <Text style={[typography.overline, { color: colors.textSecondary, marginBottom: spacing.p2 }]}>
                        YEARLY XIRR
                      </Text>
                      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: spacing.p2 }}>
                        {Object.entries(summary.yearly_xirr)
                          .sort(([a], [b]) => Number(a) - Number(b))
                          .map(([year, xirr]) => (
                            <View
                              key={year}
                              style={[
                                styles.xirrBadge,
                                {
                                  backgroundColor:
                                    Number(xirr) >= 0 ? colors.positiveBg : colors.negativeBg,
                                },
                              ]}
                            >
                              <Text style={[typography.bodySmall, { color: colors.textSecondary, marginRight: 4 }]}>
                                {year}
                              </Text>
                              <Text
                                style={[
                                  typography.bodySmall,
                                  {
                                    fontWeight: "700",
                                    color: Number(xirr) >= 0 ? colors.positive : colors.negative,
                                  },
                                ]}
                              >
                                {Number(xirr) >= 0 ? "+" : ""}
                                {Number(xirr).toFixed(2)}%
                              </Text>
                            </View>
                          ))}
                      </View>
                    </View>
                  )}
                </View>
                <View style={[styles.summaryRow, { borderTopColor: colors.borderLight }]}>
                  <View style={styles.summaryCol}>
                    <Text style={[typography.bodySmall, { color: colors.textSecondary }]}>Invested</Text>
                    <Text style={[typography.h4, { marginTop: 2, color: colors.textPrimary }]}>{formatINR(summary?.total_invested)}</Text>
                  </View>
                  <View style={[styles.summaryCol, { borderLeftWidth: 1, borderLeftColor: colors.borderLight, paddingLeft: spacing.p4 }]}>
                    <Text style={[typography.bodySmall, { color: colors.textSecondary }]}>Returns</Text>
                    <Text style={[typography.h4, { marginTop: 2, color: (summary?.total_pnl ?? 0) >= 0 ? colors.positive : colors.negative }]}>
                      {formatPct(summary?.total_pnl_pct)}
                    </Text>
                  </View>
                </View>
              </View>

              {/* Category allocation */}
              {summary?.category_breakdown && summary.category_breakdown.length > 0 && (
                <View style={[styles.allocCard, { backgroundColor: colors.surface, borderColor: colors.borderLight }]} testID="category-breakdown">
                  <Text style={[typography.overline, { color: colors.textSecondary }]}>ALLOCATION</Text>
                  <Text style={[typography.bodyMedium, { fontWeight: "600", marginTop: 2, color: colors.textPrimary }]}>
                    By fund category
                  </Text>
                  <View style={styles.allocBody}>
                    <PieChart
                      size={140}
                      thickness={20}
                      data={summary.category_breakdown.map((c: any) => ({ value: c.value, color: c.color }))}
                    />
                    <View style={styles.allocLegend}>
                      {summary.category_breakdown.map((c: any) => (
                        <View key={c.category} style={styles.legendRow} testID={`category-${c.category}`}>
                          <View style={[styles.legendSwatch, { backgroundColor: c.color }]} />
                          <View style={{ flex: 1, marginLeft: spacing.p2 }}>
                            <Text style={[typography.bodySmall, { color: colors.textPrimary, fontWeight: "600" }]} numberOfLines={1}>
                              {c.category.replace(/^Equity Scheme - /, "").replace(/^Other Scheme - /, "")}
                            </Text>
                            <Text style={[typography.bodySmall, { color: colors.textSecondary, fontSize: 11 }]}>
                              {formatINR(c.value)} · {c.pct.toFixed(1)}%
                            </Text>
                          </View>
                        </View>
                      ))}
                    </View>
                  </View>
                </View>
              )}

              {/* Projected returns */}
              {projections.length > 0 && (
                <View style={[styles.projection, { backgroundColor: colors.surface, borderColor: colors.borderLight }]} testID="projection-card">
                  <View style={styles.projHeaderRow}>
                    <View style={[styles.projIcon, { backgroundColor: colors.positiveBg }]}>
                      <Feather name="trending-up" size={14} color={colors.positive} />
                    </View>
                    <Text style={[typography.overline, { color: colors.textSecondary, marginLeft: spacing.p2 }]}>
                      PROJECTED IN {PROJECTION_YEARS} YEARS
                    </Text>
                  </View>
                  <Text style={[typography.bodySmall, { color: colors.textSecondary, marginTop: 4 }]}>
                    From today&apos;s value of {formatINR(summary?.total_current)}, if your funds grow at:
                  </Text>
                  <View style={styles.projRow}>
                    {projections.map((p) => (
                      <View key={p.rate} style={[styles.projCell, { borderColor: colors.borderLight }]} testID={`projection-${p.rate}`}>
                        <Text style={[typography.bodySmall, { color: colors.textSecondary }]}>{p.rate}% / yr</Text>
                        <Text style={[typography.h4, { marginTop: 2, color: colors.brand }]} numberOfLines={1} adjustsFontSizeToFit>
                          {formatINR(p.value)}
                        </Text>
                        <Text style={[typography.bodySmall, { color: colors.positive, marginTop: 2 }]}>
                          +{formatINR(p.value - (summary?.total_current || 0))}
                        </Text>
                      </View>
                    ))}
                  </View>
                </View>
              )}
            </View>
          }
          ListEmptyComponent={
            <View style={styles.empty} testID="portfolio-empty">
              <Feather name="briefcase" size={32} color={colors.textTertiary} />
              <Text style={[typography.h4, { marginTop: spacing.p3, color: colors.textPrimary }]}>No holdings yet</Text>
              <Text style={[typography.bodySmall, { textAlign: "center", marginTop: 6, color: colors.textSecondary }]}>
                Add the funds you have invested in to track your P&L.
              </Text>
            </View>
          }
          renderItem={({ item }) => (
            <TouchableOpacity
              testID={`portfolio-item-${item.scheme_code}`}
              activeOpacity={0.9}
              style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.borderLight }]}
              onPress={() => router.push(`/edit-holding/${item.id}`)}
            >
              <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start" }}>
                <Text style={[typography.bodyMedium, { fontWeight: "600", flex: 1, paddingRight: spacing.p3, color: colors.textPrimary }]} numberOfLines={2}>
                  {item.scheme_name}
                </Text>
                <View style={[styles.editIcon, { backgroundColor: colors.positiveBg }]} testID={`portfolio-edit-${item.scheme_code}`}>
                  <Feather name="edit-2" size={14} color={colors.brand} />
                </View>
              </View>
              {item.xirr != null && (
                <View style={{ flexDirection: "row", marginTop: 4 }}>
                  <View
                    style={[
                      styles.holdingXirr,
                      { backgroundColor: item.xirr >= 0 ? colors.positiveBg : colors.negativeBg },
                    ]}
                    testID={`holding-xirr-${item.scheme_code}`}
                  >
                    <Text
                      style={[
                        typography.bodySmall,
                        {
                          fontWeight: "700",
                          fontSize: 11,
                          color: item.xirr >= 0 ? colors.positive : colors.negative,
                        },
                      ]}
                    >
                      XIRR {item.xirr >= 0 ? "+" : ""}{item.xirr.toFixed(2)}%
                    </Text>
                  </View>
                </View>
              )}
              <View style={styles.gridRow}>
                <View style={styles.gridCell}>
                  <Text style={[typography.bodySmall, { color: colors.textSecondary }]}>Units</Text>
                  <Text style={[typography.bodyLarge, { fontWeight: "600", marginTop: 2, color: colors.textPrimary }]}>
                    {fmtNum(item.units, 4)}
                  </Text>
                </View>
                <View style={styles.gridCell}>
                  <Text style={[typography.bodySmall, { color: colors.textSecondary }]}>Avg Buy</Text>
                  <Text style={[typography.bodyLarge, { fontWeight: "600", marginTop: 2, color: colors.textPrimary }]}>
                    ₹{fmtNum(item.avg_buy_price, 4)}
                  </Text>
                </View>
                <View style={styles.gridCell}>
                  <Text style={[typography.bodySmall, { color: colors.textSecondary }]}>Current NAV</Text>
                  <Text style={[typography.bodyLarge, { fontWeight: "600", marginTop: 2, color: colors.textPrimary }]}>
                    ₹{item.nav?.curr_nav ? fmtNum(item.nav.curr_nav, 4) : "—"}
                  </Text>
                </View>
              </View>
              <View style={[styles.gridRow, { marginTop: 0, borderTopWidth: 1, borderTopColor: colors.borderLight, paddingTop: spacing.p3 }]}>
                <View style={styles.gridCell}>
                  <Text style={[typography.bodySmall, { color: colors.textSecondary }]}>Invested</Text>
                  <Text style={[typography.bodyMedium, { fontWeight: "600", marginTop: 2, color: colors.textPrimary }]}>
                    {formatINR(item.invested)}
                  </Text>
                </View>
                <View style={styles.gridCell}>
                  <Text style={[typography.bodySmall, { color: colors.textSecondary }]}>Current</Text>
                  <Text style={[typography.bodyMedium, { fontWeight: "600", marginTop: 2, color: colors.textPrimary }]}>
                    {formatINR(item.current_value)}
                  </Text>
                </View>
                <View style={styles.gridCell}>
                  <Text style={[typography.bodySmall, { color: colors.textSecondary }]}>P&L</Text>
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
  container: { flex: 1 },
  header: {
    paddingHorizontal: spacing.p6,
    paddingTop: spacing.p4,
    paddingBottom: spacing.p3,
    flexDirection: "row",
    alignItems: "flex-end",
    justifyContent: "space-between",
  },
  addBtn: { width: 44, height: 44, borderRadius: radius.pill, alignItems: "center", justifyContent: "center" },
  summary: { borderWidth: 1, borderRadius: radius.lg, padding: spacing.p6, marginBottom: spacing.p4 },
  summaryRow: { flexDirection: "row", marginTop: spacing.p6, borderTopWidth: 0, paddingTop: 0 },
  summaryCol: { flex: 1 },
  projection: { borderWidth: 1, borderRadius: radius.lg, padding: spacing.p4, marginBottom: spacing.p4 },
  projHeaderRow: { flexDirection: "row", alignItems: "center" },
  projIcon: { width: 24, height: 24, borderRadius: radius.pill, alignItems: "center", justifyContent: "center" },
  projRow: { flexDirection: "row", marginTop: spacing.p3, gap: spacing.p2 },
  projCell: { flex: 1, padding: spacing.p3, borderRadius: radius.md, borderWidth: 1 },
  card: { borderWidth: 1, borderRadius: radius.md, padding: spacing.p4, marginBottom: spacing.p3 },
  gridRow: { flexDirection: "row", marginTop: spacing.p4, gap: spacing.p3 },
  gridCell: { flex: 1 },
  empty: { alignItems: "center", paddingTop: 60, paddingHorizontal: spacing.p6 },
  editIcon: { width: 28, height: 28, borderRadius: radius.pill, alignItems: "center", justifyContent: "center" },
  xirrBadge: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: radius.pill,
  },
  holdingXirr: {
    alignSelf: "flex-start",
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: radius.pill,
  },
  allocCard: { borderWidth: 1, borderRadius: radius.lg, padding: spacing.p4, marginBottom: spacing.p4 },
  allocBody: { flexDirection: "row", alignItems: "center", marginTop: spacing.p3, gap: spacing.p3 },
  allocLegend: { flex: 1 },
  legendRow: { flexDirection: "row", alignItems: "center", marginBottom: spacing.p2 },
  legendSwatch: { width: 12, height: 12, borderRadius: 3 },
});
