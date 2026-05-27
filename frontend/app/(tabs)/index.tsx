import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  TouchableOpacity,
  Dimensions,
  ActivityIndicator,
  Platform,
} from "react-native";
import { useFocusEffect, useRouter } from "expo-router";
import { Feather } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { api, formatINR } from "@/src/api";
import { colors as lightColors, useColors, useTypography, radius, spacing } from "@/src/theme";
import ChangePill from "@/src/components/ChangePill";
import LineChart from "@/src/components/LineChart";
import {
  filterNewAlerts,
  getPermission,
  requestNotificationPermission,
  showNotification,
  markAllSeen,
} from "@/src/utils/webNotifications";

const NIFTY_CODE = "120716";

export default function Dashboard() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const colors = useColors();
  const typography = useTypography();
  const [nifty, setNifty] = useState<any>(null);
  const [portfolio, setPortfolio] = useState<any>(null);
  const [bestBuys, setBestBuys] = useState<any[]>([]);
  const [unread, setUnread] = useState(0);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [notifPerm, setNotifPerm] = useState(getPermission());
  const firstMount = useRef(true);

  const load = useCallback(async () => {
    try {
      const [n, p, b, a] = await Promise.all([
        api.nifty().catch(() => null),
        api.portfolio(),
        api.bestBuys(),
        api.alerts(),
      ]);
      setNifty(n);
      setPortfolio(p);
      setBestBuys(b.items);
      setUnread(a.unread_count);
      // Show web notifications for any unseen alerts (skip very first mount to avoid noise)
      if (!firstMount.current && Platform.OS === "web") {
        const fresh = filterNewAlerts(a.items);
        fresh.forEach((al: any) => {
          showNotification(
            `${al.scheme_name} dropped ${al.change_pct.toFixed(2)}%`,
            `NAV ₹${al.prev_nav.toFixed(2)} → ₹${al.curr_nav.toFixed(2)} on ${al.nav_date}`,
            () => router.push(`/fund/${al.scheme_code}`),
          );
        });
      } else if (firstMount.current) {
        // Don't notify for existing alerts on first load — just mark them seen
        markAllSeen(a.items);
        firstMount.current = false;
      }
    } catch (e) {
      console.warn("dashboard load error", e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [router]);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  // Trigger server-side check on mount and every 60s; reload alerts/data
  useEffect(() => {
    api.runCheck().catch(() => {});
    const id = setInterval(() => {
      api.runCheck().then(() => load()).catch(() => {});
    }, 60000);
    return () => clearInterval(id);
  }, [load]);

  const onRefresh = () => {
    setRefreshing(true);
    api.runCheck().catch(() => {});
    load();
  };

  const enableNotifs = async () => {
    const p = await requestNotificationPermission();
    setNotifPerm(p);
    if (p === "granted") {
      showNotification("Notifications enabled", "You'll be alerted on NAV drops while this tab is open.");
    }
  };

  if (loading && !portfolio) {
    return (
      <View style={[styles.loadingScreen, { backgroundColor: lightColors.bg }]}>
        <ActivityIndicator color={colors.brand} />
      </View>
    );
  }

  const chartWidth = Dimensions.get("window").width - spacing.p6 * 2;
  const niftyHistory = (nifty?.history || []).slice().reverse().map((p: any) => parseFloat(p.nav));
  const portfolioPnl = portfolio?.summary?.total_pnl ?? 0;
  const portfolioPnlPct = portfolio?.summary?.total_pnl_pct ?? 0;
  const heroBg = portfolioPnl >= 0 ? colors.brand : "#5C2A24";

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: lightColors.bg, paddingTop: insets.top }]}
      contentContainerStyle={{ paddingBottom: 40 }}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.brand} />}
      testID="dashboard-scroll"
    >
      <View style={styles.header}>
        <View>
          <Text style={[typography.overline, { color: colors.textSecondary }]}>Good day, investor</Text>
          <Text style={[typography.h1, { marginTop: 4, color: colors.textPrimary }]} testID="dashboard-title">Your portfolio</Text>
        </View>
        <TouchableOpacity testID="open-settings-btn" style={[styles.iconBtn, { backgroundColor: lightColors.surface, borderColor: lightColors.borderLight }]} onPress={() => router.push("/settings")}>
          <Feather name="settings" size={20} color={colors.textPrimary} />
        </TouchableOpacity>
      </View>

      {/* Notification permission banner (web only) */}
      {Platform.OS === "web" && notifPerm === "default" && (
        <TouchableOpacity testID="enable-notifs-banner" style={styles.notifBanner} onPress={enableNotifs} activeOpacity={0.9}>
          <Feather name="bell" size={18} color={colors.brand} />
          <Text style={[typography.bodySmall, { color: colors.textPrimary, marginLeft: spacing.p2, flex: 1, fontWeight: "600" }]}>
            Enable browser notifications for drop alerts
          </Text>
          <Text style={[typography.bodySmall, { color: colors.brand, fontWeight: "700" }]}>Enable</Text>
        </TouchableOpacity>
      )}

      {/* PORTFOLIO HERO */}
      <TouchableOpacity
        testID="portfolio-hero"
        activeOpacity={0.9}
        onPress={() => router.push("/(tabs)/portfolio")}
        style={[styles.heroCard, { backgroundColor: heroBg }]}
      >
        <View style={styles.heroHeader}>
          <Text style={[typography.overline, { color: colors.brandSoft }]}>TOTAL VALUE</Text>
          <Feather name="chevron-right" size={18} color={colors.brandSoft} />
        </View>
        <Text style={[typography.financialLarge, { color: colors.textInverse, marginTop: 4 }]} testID="hero-current-value">
          {formatINR(portfolio?.summary?.total_current)}
        </Text>
        <View style={{ flexDirection: "row", alignItems: "center", gap: spacing.p2, marginTop: spacing.p2 }}>
          <View style={[styles.heroPill, { backgroundColor: portfolioPnl >= 0 ? "#E8F2EE" : "#F8EAE9" }]}>
            <Text style={[typography.bodySmall, { fontWeight: "700", color: portfolioPnl >= 0 ? colors.positive : colors.negative }]}>
              {portfolioPnl >= 0 ? "▲" : "▼"} {Math.abs(portfolioPnlPct).toFixed(2)}%
            </Text>
          </View>
          <Text style={[typography.bodySmall, { color: colors.textInverse }]}>
            {portfolioPnl >= 0 ? "+" : ""}
            {formatINR(portfolioPnl)}
          </Text>
        </View>
        <View style={styles.heroFooter}>
          <View style={{ flex: 1 }}>
            <Text style={[typography.bodySmall, { color: colors.brandSoft }]}>Invested</Text>
            <Text style={[typography.h4, { color: colors.textInverse, marginTop: 2 }]}>{formatINR(portfolio?.summary?.total_invested)}</Text>
          </View>
          <View style={[styles.heroFooterCol, { flex: 1 }]}>
            <Text style={[typography.bodySmall, { color: colors.brandSoft }]}>Holdings</Text>
            <Text style={[typography.h4, { color: colors.textInverse, marginTop: 2 }]}>{portfolio?.items?.length || 0}</Text>
          </View>
        </View>
      </TouchableOpacity>

      {/* Quick action: Add holding */}
      {(portfolio?.items?.length || 0) === 0 && (
        <TouchableOpacity
          testID="add-first-holding"
          style={[styles.ctaCard, { backgroundColor: colors.surface, borderColor: colors.brand }]}
          onPress={() => router.push("/search?mode=portfolio")}
        >
          <Feather name="plus-circle" size={20} color={colors.brand} />
          <View style={{ flex: 1, marginLeft: spacing.p3 }}>
            <Text style={[typography.bodyMedium, { fontWeight: "700", color: colors.textPrimary }]}>Add your first holding</Text>
            <Text style={[typography.bodySmall, { color: colors.textSecondary }]}>Track units, P&L, and dips on funds you own.</Text>
          </View>
        </TouchableOpacity>
      )}

      {/* Alerts banner */}
      {unread > 0 && (
        <TouchableOpacity
          testID="alerts-banner"
          activeOpacity={0.9}
          onPress={() => router.push("/(tabs)/alerts")}
          style={[styles.alertBanner, { backgroundColor: colors.negativeBg }]}
        >
          <View style={[styles.alertDot, { backgroundColor: colors.surface }]}>
            <Feather name="bell" size={16} color={colors.accent} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={[typography.bodyMedium, { fontWeight: "700", color: colors.textPrimary }]}>
              {unread} new drop alert{unread > 1 ? "s" : ""}
            </Text>
            <Text style={[typography.bodySmall, { color: colors.textSecondary }]}>Tap to review buying opportunities</Text>
          </View>
          <Feather name="chevron-right" size={18} color={colors.textSecondary} />
        </TouchableOpacity>
      )}

      {/* NIFTY — secondary card */}
      <View style={styles.section}>
        <Text style={[typography.overline, { color: colors.textSecondary }]}>MARKET PULSE</Text>
        <Text style={[typography.h3, { color: colors.textPrimary }]}>Nifty 50 Index</Text>
        <TouchableOpacity
          testID="nifty-card"
          activeOpacity={0.9}
          onPress={() => router.push(`/fund/${NIFTY_CODE}`)}
          style={[styles.niftyCard, { backgroundColor: colors.surface, borderColor: colors.borderLight }]}
        >
          <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "flex-end" }}>
            <View>
              <Text style={[typography.h2, { color: colors.textPrimary }]} testID="nifty-nav">
                ₹{nifty?.summary?.curr_nav?.toFixed(2) ?? "—"}
              </Text>
              <Text style={[typography.bodySmall, { marginTop: 2, color: colors.textSecondary }]}>NAV • {nifty?.summary?.nav_date || "—"}</Text>
            </View>
            <ChangePill changePct={nifty?.summary?.change_pct} size="md" />
          </View>
          {niftyHistory.length > 1 && (
            <View style={{ marginTop: spacing.p3, marginHorizontal: -spacing.p4 }}>
              <LineChart data={niftyHistory} width={chartWidth - spacing.p4 * 0} height={50} stroke={colors.brand} />
            </View>
          )}
        </TouchableOpacity>
      </View>

      {/* Best Buy Opportunities */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <View>
            <Text style={[typography.overline, { color: colors.textSecondary }]}>OPPORTUNITY</Text>
            <Text style={[typography.h3, { color: colors.textPrimary }]}>Best buys today</Text>
          </View>
        </View>
        {bestBuys.length === 0 ? (
          <View style={[styles.emptyCard, { backgroundColor: colors.surface, borderColor: colors.borderLight }]}>
            <Text style={[typography.bodyMedium, { color: colors.textPrimary }]}>No dips in your watchlist today.</Text>
            <Text style={[typography.bodySmall, { marginTop: 4, color: colors.textSecondary }]}>
              Add funds to watchlist to spot buying opportunities.
            </Text>
          </View>
        ) : (
          bestBuys.map((b: any) => (
            <TouchableOpacity
              key={b.id}
              testID={`best-buy-${b.scheme_code}`}
              style={[styles.bestBuyCard, { backgroundColor: colors.surface, borderColor: colors.borderLight }]}
              activeOpacity={0.9}
              onPress={() => router.push(`/fund/${b.scheme_code}`)}
            >
              <View style={{ flex: 1, paddingRight: spacing.p3 }}>
                <Text style={[typography.bodyMedium, { fontWeight: "600", color: colors.textPrimary }]} numberOfLines={2}>
                  {b.scheme_name}
                </Text>
                <Text style={[typography.bodySmall, { marginTop: 2, color: colors.textSecondary }]}>NAV ₹{b.nav.curr_nav.toFixed(2)}</Text>
              </View>
              <ChangePill changePct={b.nav.change_pct} />
            </TouchableOpacity>
          ))
        )}
      </View>

      {/* Tools */}
      <View style={styles.section}>
        <Text style={[typography.overline, { color: colors.textSecondary }]}>TOOLS</Text>
        <Text style={[typography.h3, { color: colors.textPrimary }]}>Plan your investment</Text>
        <View style={{ flexDirection: "row", gap: spacing.p3, marginTop: spacing.p4 }}>
          <TouchableOpacity testID="open-sip-calculator" style={[styles.toolCard, { backgroundColor: colors.surface, borderColor: colors.borderLight }]} onPress={() => router.push("/tools/sip")}>
            <View style={[styles.toolIcon, { backgroundColor: colors.positiveBg }]}>
              <Feather name="trending-up" size={18} color={colors.positive} />
            </View>
            <Text style={[typography.h4, { marginTop: spacing.p3, color: colors.textPrimary }]}>SIP</Text>
            <Text style={[typography.bodySmall, { color: colors.textSecondary }]}>Monthly investment</Text>
          </TouchableOpacity>
          <TouchableOpacity testID="open-lumpsum-calculator" style={[styles.toolCard, { backgroundColor: colors.surface, borderColor: colors.borderLight }]} onPress={() => router.push("/tools/lumpsum")}>
            <View style={[styles.toolIcon, { backgroundColor: colors.positiveBg }]}>
              <Feather name="dollar-sign" size={18} color={colors.positive} />
            </View>
            <Text style={[typography.h4, { marginTop: spacing.p3, color: colors.textPrimary }]}>Lumpsum</Text>
            <Text style={[typography.bodySmall, { color: colors.textSecondary }]}>One-time invest</Text>
          </TouchableOpacity>
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  loadingScreen: { flex: 1, alignItems: "center", justifyContent: "center" },
  header: {
    paddingHorizontal: spacing.p6,
    paddingTop: spacing.p4,
    paddingBottom: spacing.p4,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  iconBtn: {
    width: 40, height: 40, borderRadius: radius.pill,
    borderWidth: 1,
    alignItems: "center", justifyContent: "center",
  },
  notifBanner: {
    marginHorizontal: spacing.p6,
    marginBottom: spacing.p3,
    padding: spacing.p3,
    borderRadius: radius.md,
    backgroundColor: lightColors.positiveBg,
    flexDirection: "row",
    alignItems: "center",
  },
  heroCard: {
    marginHorizontal: spacing.p6,
    marginBottom: spacing.p4,
    padding: spacing.p6,
    borderRadius: radius.lg,
  },
  heroHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  heroPill: { paddingHorizontal: spacing.p3, paddingVertical: 4, borderRadius: radius.pill },
  heroFooter: { flexDirection: "row", marginTop: spacing.p6, borderTopWidth: 1, borderTopColor: "rgba(255,255,255,0.15)", paddingTop: spacing.p4 },
  heroFooterCol: { borderLeftWidth: 1, borderLeftColor: "rgba(255,255,255,0.15)", paddingLeft: spacing.p4 },
  ctaCard: {
    marginHorizontal: spacing.p6,
    marginBottom: spacing.p4,
    padding: spacing.p4,
    borderRadius: radius.md,
    backgroundColor: lightColors.surface,
    borderWidth: 1,
    borderColor: lightColors.brand,
    flexDirection: "row",
    alignItems: "center",
  },
  alertBanner: {
    marginHorizontal: spacing.p6,
    marginBottom: spacing.p4,
    padding: spacing.p4,
    borderRadius: radius.md,
    backgroundColor: lightColors.negativeBg,
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.p3,
  },
  alertDot: {
    width: 32, height: 32, borderRadius: radius.pill, backgroundColor: "#fff",
    alignItems: "center", justifyContent: "center",
  },
  section: { marginTop: spacing.p4, marginBottom: spacing.p4, paddingHorizontal: spacing.p6 },
  sectionHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-end", marginBottom: spacing.p4 },
  niftyCard: {
    marginTop: spacing.p3,
    padding: spacing.p4,
    backgroundColor: lightColors.surface,
    borderWidth: 1,
    borderColor: lightColors.borderLight,
    borderRadius: radius.md,
  },
  emptyCard: {
    padding: spacing.p6, borderRadius: radius.md, backgroundColor: lightColors.surface,
    borderWidth: 1, borderColor: lightColors.borderLight,
  },
  bestBuyCard: {
    flexDirection: "row", alignItems: "center", padding: spacing.p4,
    borderRadius: radius.md, backgroundColor: lightColors.surface,
    borderWidth: 1, borderColor: lightColors.borderLight, marginBottom: spacing.p3,
  },
  toolCard: {
    flex: 1, padding: spacing.p4, borderRadius: radius.md,
    backgroundColor: lightColors.surface, borderWidth: 1, borderColor: lightColors.borderLight,
  },
  toolIcon: {
    width: 36, height: 36, borderRadius: radius.pill,
    alignItems: "center", justifyContent: "center",
  },
});
