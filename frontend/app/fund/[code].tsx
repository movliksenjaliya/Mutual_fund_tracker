import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Dimensions,
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { Feather } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { api, formatINR } from "@/src/api";
import { useColors, useTypography, radius, spacing } from "@/src/theme";
import LineChart from "@/src/components/LineChart";
import ChangePill from "@/src/components/ChangePill";
import { notify } from "@/src/utils/dialog";

export default function FundDetail() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const colors = useColors();
  const typography = useTypography();
  const styles = stylesFactory(colors);
  const { code } = useLocalSearchParams<{ code: string }>();
  const [data, setData] = useState<any>(null);
  const [range, setRange] = useState<7 | 30 | 90>(30);
  const [adding, setAdding] = useState(false);

  useEffect(() => {
    api
      .fundDetail(code)
      .then(setData)
      .catch((e) => console.warn(e));
  }, [code]);

  if (!data) {
    return (
      <View style={[styles.loading, { paddingTop: insets.top }]}>
        <ActivityIndicator color={colors.brand} />
      </View>
    );
  }

  const summary = data.summary;
  const history = data.history.slice(0, range).reverse().map((h: any) => parseFloat(h.nav));
  const chartWidth = Dimensions.get("window").width - spacing.p6 * 2;

  const addToWatchlist = async () => {
    setAdding(true);
    try {
      await api.addWatchlist({ scheme_code: code, scheme_name: summary.scheme_name });
      notify("Added", "Fund added to your watchlist.");
    } catch (e: any) {
      notify("Heads up", "Already in your watchlist.");
    } finally {
      setAdding(false);
    }
  };

  const addToPortfolio = () => {
    router.push({ pathname: "/add-holding", params: { code, name: summary.scheme_name } });
  };

  return (
    <ScrollView style={[styles.container, { paddingTop: insets.top }]} contentContainerStyle={{ paddingBottom: 60 }}>
      <View style={styles.header}>
        <TouchableOpacity testID="fund-back-btn" onPress={() => router.back()} hitSlop={10}>
          <Feather name="arrow-left" size={24} color={colors.textPrimary} />
        </TouchableOpacity>
        <Text style={[typography.overline, { marginLeft: spacing.p3 }]}>{summary.fund_house}</Text>
      </View>

      <View style={{ paddingHorizontal: spacing.p6 }}>
        <Text style={typography.h2} numberOfLines={3}>
          {summary.scheme_name}
        </Text>
        <Text style={[typography.bodySmall, { marginTop: spacing.p2 }]}>{summary.scheme_category}</Text>

        <View style={{ flexDirection: "row", alignItems: "flex-end", marginTop: spacing.p6, gap: spacing.p4 }}>
          <Text style={typography.financialLarge} testID="fund-nav-value">₹{summary.curr_nav.toFixed(4)}</Text>
          <ChangePill changePct={summary.change_pct} size="md" />
        </View>
        <Text style={[typography.bodySmall, { marginTop: 4 }]}>
          NAV as of {summary.nav_date} · prev ₹{summary.prev_nav.toFixed(4)}
        </Text>
      </View>

      <View style={[styles.card, { padding: spacing.p4 }]}>
        <View style={{ flexDirection: "row", gap: spacing.p2, marginBottom: spacing.p3 }}>
          {[7, 30, 90].map((d) => (
            <TouchableOpacity
              key={d}
              testID={`range-${d}`}
              onPress={() => setRange(d as 7 | 30 | 90)}
              style={[styles.rangeBtn, range === d ? styles.rangeBtnActive : null]}
            >
              <Text style={[typography.bodySmall, { fontWeight: "600", color: range === d ? colors.textInverse : colors.textSecondary }]}>
                {d}D
              </Text>
            </TouchableOpacity>
          ))}
        </View>
        <LineChart data={history} width={chartWidth - spacing.p4 * 2} height={160} />
        <View style={{ flexDirection: "row", justifyContent: "space-between", marginTop: spacing.p3 }}>
          <Text style={typography.bodySmall}>{data.history[range - 1]?.date}</Text>
          <Text style={typography.bodySmall}>{data.history[0]?.date}</Text>
        </View>
      </View>

      <View style={{ flexDirection: "row", gap: spacing.p3, marginHorizontal: spacing.p6, marginTop: spacing.p4 }}>
        <TouchableOpacity
          testID="add-watchlist-btn"
          style={[styles.actionBtn, styles.actionSecondary]}
          onPress={addToWatchlist}
          disabled={adding}
        >
          <Feather name="bookmark" size={16} color={colors.brand} />
          <Text style={[typography.bodyMedium, { color: colors.brand, fontWeight: "600", marginLeft: spacing.p2 }]}>
            Add to Watchlist
          </Text>
        </TouchableOpacity>
        <TouchableOpacity testID="add-portfolio-btn" style={[styles.actionBtn, styles.actionPrimary]} onPress={addToPortfolio}>
          <Feather name="plus" size={16} color={colors.textInverse} />
          <Text style={[typography.bodyMedium, { color: colors.textInverse, fontWeight: "600", marginLeft: spacing.p2 }]}>
            Add to Portfolio
          </Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

const stylesFactory = (colors: any) => StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  loading: { flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: colors.bg },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: spacing.p6,
    paddingVertical: spacing.p4,
  },
  card: {
    marginHorizontal: spacing.p6,
    marginTop: spacing.p6,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.borderLight,
    borderRadius: radius.lg,
  },
  rangeBtn: {
    paddingHorizontal: spacing.p3,
    paddingVertical: 6,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.borderLight,
  },
  rangeBtnActive: { backgroundColor: colors.brand, borderColor: colors.brand },
  actionBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: spacing.p3,
    borderRadius: radius.pill,
  },
  actionPrimary: { backgroundColor: colors.brand },
  actionSecondary: { borderWidth: 1, borderColor: colors.brand, backgroundColor: colors.surface },
});
