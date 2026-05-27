import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  ActivityIndicator,
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { Feather } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { api, formatINR } from "@/src/api";
import { useColors, useTypography, radius, spacing } from "@/src/theme";
import { notify } from "@/src/utils/dialog";
import ChangePill from "@/src/components/ChangePill";

export default function AddHolding() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const colors = useColors();
  const typography = useTypography();
  const styles = stylesFactory(colors);
  const { code, name } = useLocalSearchParams<{ code: string; name: string }>();
  const [units, setUnits] = useState("");
  const [price, setPrice] = useState("");
  const [purchaseDate, setPurchaseDate] = useState("");
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);
  const [nav, setNav] = useState<any>(null);
  const [navLoading, setNavLoading] = useState(true);

  useEffect(() => {
    api
      .fundDetail(code)
      .then((r) => setNav(r.summary))
      .catch(() => {})
      .finally(() => setNavLoading(false));
  }, [code]);

  const u = parseFloat(units);
  const p = parseFloat(price);
  const invested = !isNaN(u) && !isNaN(p) && u > 0 && p > 0 ? u * p : null;
  const currNav = nav?.curr_nav;
  const currentValue = invested && currNav ? u * currNav : null;
  const pnl = invested && currentValue != null ? currentValue - invested : null;
  const pnlPct = pnl != null && invested ? (pnl / invested) * 100 : null;

  const useCurrentNav = () => {
    if (currNav) setPrice(String(currNav.toFixed(4)));
  };

  const save = async () => {
    if (isNaN(u) || isNaN(p) || u <= 0 || p <= 0) {
      notify("Invalid input", "Enter valid units and average buy price.");
      return;
    }
    setSaving(true);
    try {
      await api.addPortfolio({
        scheme_code: code,
        scheme_name: name,
        units: u,
        avg_buy_price: p,
        purchase_date: purchaseDate.trim() || null,
        notes: notes.trim() || null,
      });
      router.dismissAll();
      router.replace("/(tabs)/portfolio");
    } catch (e: any) {
      notify("Error", String(e.message || e));
    } finally {
      setSaving(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={[styles.container, { paddingTop: insets.top }]}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <View style={styles.header}>
        <TouchableOpacity testID="add-holding-close" onPress={() => router.back()} hitSlop={10}>
          <Feather name="x" size={24} color={colors.textPrimary} />
        </TouchableOpacity>
        <Text style={[typography.h3, { marginLeft: spacing.p3 }]}>Add holding</Text>
      </View>

      <ScrollView contentContainerStyle={{ paddingHorizontal: spacing.p6, paddingBottom: 40 }} keyboardShouldPersistTaps="handled">
        <Text style={typography.overline}>FUND</Text>
        <Text style={[typography.h4, { marginTop: 4 }]} numberOfLines={3}>
          {name}
        </Text>

        {/* Current NAV card */}
        <View style={styles.navCard}>
          <View>
            <Text style={typography.bodySmall}>Current NAV</Text>
            {navLoading ? (
              <ActivityIndicator color={colors.brand} style={{ marginTop: 8, alignSelf: "flex-start" }} />
            ) : currNav ? (
              <Text style={[typography.h2, { marginTop: 2 }]} testID="current-nav-value">
                ₹{currNav.toFixed(4)}
              </Text>
            ) : (
              <Text style={[typography.h4, { marginTop: 2 }]}>—</Text>
            )}
            <Text style={[typography.bodySmall, { marginTop: 2 }]}>NAV as of {nav?.nav_date || "—"}</Text>
          </View>
          <ChangePill changePct={nav?.change_pct} size="md" />
        </View>

        {/* Units */}
        <View style={{ marginTop: spacing.p6 }}>
          <Text style={typography.bodySmall}>Units</Text>
          <TextInput
            testID="units-input"
            value={units}
            onChangeText={setUnits}
            keyboardType="decimal-pad"
            placeholder="0.000"
            placeholderTextColor={colors.textTertiary}
            style={styles.input}
          />
        </View>

        {/* Avg buy price */}
        <View style={{ marginTop: spacing.p4 }}>
          <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
            <Text style={typography.bodySmall}>Average buy price (₹ per unit)</Text>
            {currNav && (
              <TouchableOpacity testID="use-current-nav-btn" onPress={useCurrentNav}>
                <Text style={[typography.bodySmall, { color: colors.brand, fontWeight: "700" }]}>Use current NAV</Text>
              </TouchableOpacity>
            )}
          </View>
          <TextInput
            testID="avg-price-input"
            value={price}
            onChangeText={setPrice}
            keyboardType="decimal-pad"
            placeholder="0.00"
            placeholderTextColor={colors.textTertiary}
            style={styles.input}
          />
        </View>

        {/* Purchase date (optional) */}
        <View style={{ marginTop: spacing.p4 }}>
          <Text style={typography.bodySmall}>Purchase date (optional)</Text>
          <TextInput
            testID="purchase-date-input"
            value={purchaseDate}
            onChangeText={setPurchaseDate}
            placeholder="e.g. 15-Mar-2025"
            placeholderTextColor={colors.textTertiary}
            style={styles.input}
          />
        </View>

        {/* Notes (optional) */}
        <View style={{ marginTop: spacing.p4 }}>
          <Text style={typography.bodySmall}>Notes (optional)</Text>
          <TextInput
            testID="notes-input"
            value={notes}
            onChangeText={setNotes}
            placeholder="e.g. SIP from HDFC account"
            placeholderTextColor={colors.textTertiary}
            style={[styles.input, { minHeight: 56 }]}
            multiline
          />
        </View>

        {/* Live preview */}
        {invested != null && (
          <View style={styles.preview} testID="live-preview">
            <Text style={typography.overline}>LIVE PREVIEW</Text>
            <View style={styles.previewGrid}>
              <View style={styles.previewCell}>
                <Text style={typography.bodySmall}>Invested</Text>
                <Text style={[typography.h4, { marginTop: 2 }]}>{formatINR(invested)}</Text>
              </View>
              <View style={styles.previewCell}>
                <Text style={typography.bodySmall}>Current value</Text>
                <Text style={[typography.h4, { marginTop: 2 }]}>{formatINR(currentValue)}</Text>
              </View>
            </View>
            {pnl != null && pnlPct != null && (
              <View style={{ flexDirection: "row", marginTop: spacing.p3, gap: spacing.p3, alignItems: "center" }}>
                <View style={[styles.pnlPill, { backgroundColor: pnl >= 0 ? colors.positiveBg : colors.negativeBg }]}>
                  <Text style={[typography.bodyMedium, { fontWeight: "700", color: pnl >= 0 ? colors.positive : colors.negative }]}>
                    {pnl >= 0 ? "+" : ""}
                    {formatINR(pnl)} ({pnlPct.toFixed(2)}%)
                  </Text>
                </View>
              </View>
            )}
          </View>
        )}

        <TouchableOpacity
          testID="save-holding-btn"
          style={[styles.saveBtn, saving ? { opacity: 0.6 } : null]}
          onPress={save}
          disabled={saving}
        >
          <Text style={[typography.bodyLarge, { color: colors.textInverse, fontWeight: "700" }]}>
            {saving ? "Saving..." : "Add to portfolio"}
          </Text>
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const stylesFactory = (colors: any) => StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  header: { flexDirection: "row", alignItems: "center", paddingHorizontal: spacing.p6, paddingVertical: spacing.p4 },
  navCard: {
    marginTop: spacing.p4,
    padding: spacing.p4,
    borderRadius: radius.md,
    backgroundColor: colors.bgSecondary,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-end",
  },
  input: {
    marginTop: 4,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.borderMedium,
    borderRadius: radius.md,
    paddingHorizontal: spacing.p4,
    paddingVertical: spacing.p3,
    fontSize: 18,
    color: colors.textPrimary,
  },
  preview: {
    marginTop: spacing.p6,
    padding: spacing.p4,
    borderRadius: radius.md,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.borderLight,
  },
  previewGrid: { flexDirection: "row", gap: spacing.p4, marginTop: spacing.p3 },
  previewCell: { flex: 1 },
  pnlPill: { paddingHorizontal: spacing.p3, paddingVertical: 6, borderRadius: radius.pill },
  saveBtn: {
    marginTop: spacing.p6,
    paddingVertical: spacing.p4,
    borderRadius: radius.pill,
    backgroundColor: colors.brand,
    alignItems: "center",
  },
});
