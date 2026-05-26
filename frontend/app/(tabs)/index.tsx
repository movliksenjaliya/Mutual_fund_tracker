import React, { useCallback, useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  TouchableOpacity,
  Dimensions,
  ActivityIndicator,
} from "react-native";
import { useFocusEffect, useRouter } from "expo-router";
import { Feather } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { api, formatINR, formatPct } from "@/src/api";
import { colors, radius, spacing, typography } from "@/src/theme";
import ChangePill from "@/src/components/ChangePill";
import LineChart from "@/src/components/LineChart";

const NIFTY_CODE = "120716";

export default function Dashboard() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [nifty, setNifty] = useState<any>(null);
  const [portfolio, setPortfolio] = useState<any>(null);
  const [bestBuys, setBestBuys] = useState<any[]>([]);
  const [unread, setUnread] = useState(0);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    try {
      const [n, p, b, a] = await Promise.all([
        api.nifty(),
        api.portfolio(),
        api.bestBuys(),
        api.alerts(),
      ]);
      setNifty(n);
      setPortfolio(p);
      setBestBuys(b.items);
      setUnread(a.unread_count);
    } catch (e) {
      console.warn("dashboard load error", e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  // Trigger a server-side check on first mount to populate alerts
  useEffect(() => {
    api.runCheck().catch(() => {});
  }, []);

  const onRefresh = () => {
    setRefreshing(true);
    api.runCheck().catch(() => {});
    load();
  };

  if (loading && !nifty) {
    return (
      <View style={styles.loadingScreen}>
        <ActivityIndicator color={colors.brand} />
      </View>
    );
  }

  const chartWidth = Dimensions.get("window").width - spacing.p6 * 2 - spacing.p6 * 2;
  const niftyHistory = (nifty?.history || []).slice().reverse().map((p: any) => parseFloat(p.nav));

  return (
    <ScrollView
      style={[styles.container, { paddingTop: insets.top }]}
      contentContainerStyle={{ paddingBottom: 40 }}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.brand} />}
      testID="dashboard-scroll"
    >
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={typography.overline}>Good day, investor</Text>
          <Text style={[typography.h1, { marginTop: 4 }]} testID="dashboard-title">Your funds</Text>
        </View>
        <TouchableOpacity
          testID="open-settings-btn"
          style={styles.iconBtn}
          onPress={() => router.push("/settings")}
        >
          <Feather name="settings" size={20} color={colors.textPrimary} />
        </TouchableOpacity>
      </View>

      {/* Nifty Card */}
      <TouchableOpacity
        testID="nifty-card"
        activeOpacity={0.9}
        onPress={() => router.push(`/fund/${NIFTY_CODE}`)}
        style={styles.heroCard}
      >
        <View style={styles.heroHeader}>
          <View style={{ flex: 1 }}>
            <Text style={[typography.overline, { color: colors.brandSoft }]}>NIFTY 50 INDEX</Text>
            <Text style={[typography.h3, { color: colors.textInverse, marginTop: 4 }]}>
              {nifty?.summary?.scheme_name?.replace(" - Growth Option- Direct", "") || "Nifty Index Fund"}
            </Text>
          </View>
        </View>
        <View style={styles.heroBody}>
          <View>
            <Text style={[typography.financialLarge, { color: colors.textInverse }]} testID="nifty-nav">
              ₹{nifty?.summary?.curr_nav?.toFixed(2) ?? "—"}
            </Text>
            <Text style={[typography.bodySmall, { color: colors.brandSoft, marginTop: 4 }]}>
              NAV • {nifty?.summary?.nav_date}
            </Text>
          </View>
          <ChangePill changePct={nifty?.summary?.change_pct} size="md" />
        </View>
        {niftyHistory.length > 1 && (
          <View style={{ marginTop: spacing.p4, marginHorizontal: -spacing.p6, opacity: 0.95 }}>
            <LineChart
              data={niftyHistory}
              width={chartWidth + spacing.p6 * 2}
              height={70}
              stroke="#fff"
              fillGradient={false}
            />
          </View>
        )}
      </TouchableOpacity>

      {/* Portfolio Summary */}
      <TouchableOpacity
        testID="portfolio-summary-card"
        activeOpacity={0.9}
        onPress={() => router.push("/(tabs)/portfolio")}
        style={styles.card}
      >
        <View style={styles.cardHeaderRow}>
          <Text style={typography.overline}>Portfolio</Text>
          <Feather name="chevron-right" size={18} color={colors.textTertiary} />
        </View>
        <View style={{ marginTop: spacing.p3 }}>
          <Text style={typography.financialLarge} testID="portfolio-current-value">
            {formatINR(portfolio?.summary?.total_current)}
          </Text>
          <View style={{ flexDirection: "row", alignItems: "center", marginTop: spacing.p2, gap: spacing.p2 }}>
            <ChangePill changePct={portfolio?.summary?.total_pnl_pct} />
            <Text style={typography.bodySmall}>
              {(portfolio?.summary?.total_pnl ?? 0) >= 0 ? "+" : ""}
              {formatINR(portfolio?.summary?.total_pnl)}
            </Text>
          </View>
        </View>
        <View style={styles.portfolioRow}>
          <View style={styles.portfolioCol}>
            <Text style={typography.bodySmall}>Invested</Text>
            <Text style={[typography.h4, { marginTop: 2 }]}>{formatINR(portfolio?.summary?.total_invested)}</Text>
          </View>
          <View style={[styles.portfolioCol, { borderLeftWidth: 1, borderLeftColor: colors.borderLight, paddingLeft: spacing.p4 }]}>
            <Text style={typography.bodySmall}>Holdings</Text>
            <Text style={[typography.h4, { marginTop: 2 }]}>{portfolio?.items?.length || 0}</Text>
          </View>
        </View>
      </TouchableOpacity>

      {/* Alerts banner */}
      {unread > 0 && (
        <TouchableOpacity
          testID="alerts-banner"
          activeOpacity={0.9}
          onPress={() => router.push("/(tabs)/alerts")}
          style={styles.alertBanner}
        >
          <View style={styles.alertDot}>
            <Feather name="bell" size={16} color={colors.accent} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={[typography.bodyMedium, { fontWeight: "700", color: colors.textPrimary }]}>
              {unread} new drop alert{unread > 1 ? "s" : ""}
            </Text>
            <Text style={typography.bodySmall}>Tap to review buying opportunities</Text>
          </View>
          <Feather name="chevron-right" size={18} color={colors.textSecondary} />
        </TouchableOpacity>
      )}

      {/* Best Buy Opportunities */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <View>
            <Text style={typography.overline}>OPPORTUNITY</Text>
            <Text style={typography.h3}>Best buys today</Text>
          </View>
        </View>
        {bestBuys.length === 0 ? (
          <View style={styles.emptyCard}>
            <Text style={typography.bodyMedium}>No dips in your watchlist today.</Text>
            <Text style={[typography.bodySmall, { marginTop: 4 }]}>
              Add funds to watchlist to spot buying opportunities.
            </Text>
          </View>
        ) : (
          bestBuys.map((b: any) => (
            <TouchableOpacity
              key={b.id}
              testID={`best-buy-${b.scheme_code}`}
              style={styles.bestBuyCard}
              activeOpacity={0.9}
              onPress={() => router.push(`/fund/${b.scheme_code}`)}
            >
              <View style={{ flex: 1, paddingRight: spacing.p3 }}>
                <Text style={[typography.bodyMedium, { fontWeight: "600" }]} numberOfLines={2}>
                  {b.scheme_name}
                </Text>
                <Text style={[typography.bodySmall, { marginTop: 2 }]}>NAV ₹{b.nav.curr_nav.toFixed(2)}</Text>
              </View>
              <ChangePill changePct={b.nav.change_pct} />
            </TouchableOpacity>
          ))
        )}
      </View>

      {/* Tools */}
      <View style={styles.section}>
        <Text style={typography.overline}>TOOLS</Text>
        <Text style={typography.h3}>Plan your investment</Text>
        <View style={{ flexDirection: "row", gap: spacing.p3, marginTop: spacing.p4 }}>
          <TouchableOpacity
            testID="open-sip-calculator"
            style={[styles.toolCard, { backgroundColor: colors.surface }]}
            onPress={() => router.push("/tools/sip")}
          >
            <View style={[styles.toolIcon, { backgroundColor: colors.positiveBg }]}>
              <Feather name="trending-up" size={18} color={colors.positive} />
            </View>
            <Text style={[typography.h4, { marginTop: spacing.p3 }]}>SIP</Text>
            <Text style={typography.bodySmall}>Monthly investment</Text>
          </TouchableOpacity>
          <TouchableOpacity
            testID="open-lumpsum-calculator"
            style={[styles.toolCard, { backgroundColor: colors.surface }]}
            onPress={() => router.push("/tools/lumpsum")}
          >
            <View style={[styles.toolIcon, { backgroundColor: colors.positiveBg }]}>
              <Feather name="dollar-sign" size={18} color={colors.positive} />
            </View>
            <Text style={[typography.h4, { marginTop: spacing.p3 }]}>Lumpsum</Text>
            <Text style={typography.bodySmall}>One-time invest</Text>
          </TouchableOpacity>
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  loadingScreen: { flex: 1, backgroundColor: colors.bg, alignItems: "center", justifyContent: "center" },
  header: {
    paddingHorizontal: spacing.p6,
    paddingTop: spacing.p4,
    paddingBottom: spacing.p4,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  iconBtn: {
    width: 40,
    height: 40,
    borderRadius: radius.pill,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.borderLight,
    alignItems: "center",
    justifyContent: "center",
  },
  heroCard: {
    marginHorizontal: spacing.p6,
    marginBottom: spacing.p4,
    padding: spacing.p6,
    borderRadius: radius.lg,
    backgroundColor: colors.brand,
    overflow: "hidden",
  },
  heroHeader: { flexDirection: "row", alignItems: "center" },
  heroBody: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-end", marginTop: spacing.p4 },
  card: {
    marginHorizontal: spacing.p6,
    marginBottom: spacing.p4,
    padding: spacing.p6,
    borderRadius: radius.lg,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.borderLight,
  },
  cardHeaderRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  portfolioRow: { flexDirection: "row", marginTop: spacing.p6 },
  portfolioCol: { flex: 1 },
  alertBanner: {
    marginHorizontal: spacing.p6,
    marginBottom: spacing.p4,
    padding: spacing.p4,
    borderRadius: radius.md,
    backgroundColor: colors.negativeBg,
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.p3,
  },
  alertDot: {
    width: 32,
    height: 32,
    borderRadius: radius.pill,
    backgroundColor: "#fff",
    alignItems: "center",
    justifyContent: "center",
  },
  section: { marginTop: spacing.p4, marginBottom: spacing.p4, paddingHorizontal: spacing.p6 },
  sectionHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-end", marginBottom: spacing.p4 },
  emptyCard: {
    padding: spacing.p6,
    borderRadius: radius.md,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.borderLight,
  },
  bestBuyCard: {
    flexDirection: "row",
    alignItems: "center",
    padding: spacing.p4,
    borderRadius: radius.md,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.borderLight,
    marginBottom: spacing.p3,
  },
  toolCard: {
    flex: 1,
    padding: spacing.p4,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.borderLight,
  },
  toolIcon: {
    width: 36,
    height: 36,
    borderRadius: radius.pill,
    alignItems: "center",
    justifyContent: "center",
  },
});
