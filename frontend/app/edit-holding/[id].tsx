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
import { confirm, notify } from "@/src/utils/dialog";
import ChangePill from "@/src/components/ChangePill";

export default function EditHolding() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const colors = useColors();
  const typography = useTypography();
  const styles = stylesFactory(colors);
  const { id } = useLocalSearchParams<{ id: string }>();
  const [holding, setHolding] = useState<any>(null);
  const [units, setUnits] = useState("");
  const [avgPrice, setAvgPrice] = useState("");
  const [purchaseDate, setPurchaseDate] = useState("");
  const [notes, setNotes] = useState("");
  const [buyUnits, setBuyUnits] = useState("");
  const [buyPrice, setBuyPrice] = useState("");
  const [saving, setSaving] = useState(false);
  const [buying, setBuying] = useState(false);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    try {
      const r = await api.portfolio();
      const h = r.items.find((x: any) => x.id === id);
      if (!h) {
        notify("Not found", "Holding no longer exists.");
        router.back();
        return;
      }
      setHolding(h);
      setUnits(String(h.units));
      setAvgPrice(String(h.avg_buy_price));
      setPurchaseDate(h.purchase_date || "");
      setNotes(h.notes || "");
    } catch (e: any) {
      notify("Error", String(e.message || e));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, [id]);

  const save = async () => {
    const u = parseFloat(units);
    const p = parseFloat(avgPrice);
    if (isNaN(u) || isNaN(p) || u <= 0 || p <= 0) {
      notify("Invalid", "Units and average price must be positive numbers.");
      return;
    }
    setSaving(true);
    try {
      await api.updatePortfolio(id, {
        units: u,
        avg_buy_price: p,
        purchase_date: purchaseDate.trim() || null,
        notes: notes.trim() || null,
      });
      router.back();
    } catch (e: any) {
      notify("Error", String(e.message || e));
    } finally {
      setSaving(false);
    }
  };

  const buyMore = async () => {
    const bu = parseFloat(buyUnits);
    const bp = parseFloat(buyPrice);
    if (isNaN(bu) || isNaN(bp) || bu <= 0 || bp <= 0) {
      notify("Invalid", "Enter valid units and price for the new purchase.");
      return;
    }
    setBuying(true);
    try {
      const result = await api.buyMore(id, { units: bu, price: bp });
      setUnits(String(result.units));
      setAvgPrice(String(result.avg_buy_price));
      setBuyUnits("");
      setBuyPrice("");
      notify("Bought!", `New total: ${result.units} units @ ₹${result.avg_buy_price.toFixed(4)} avg`);
      load();
    } catch (e: any) {
      notify("Error", String(e.message || e));
    } finally {
      setBuying(false);
    }
  };

  const remove = async () => {
    const ok = await confirm("Remove holding?", holding?.scheme_name || "");
    if (!ok) return;
    await api.deletePortfolio(id);
    router.back();
  };

  const useCurrentNav = () => {
    if (holding?.nav?.curr_nav) setBuyPrice(String(holding.nav.curr_nav.toFixed(4)));
  };

  if (loading) {
    return (
      <View style={[styles.loading, { paddingTop: insets.top }]}>
        <ActivityIndicator color={colors.brand} />
      </View>
    );
  }

  const currNav = holding?.nav?.curr_nav;
  const newBuyUnitsNum = parseFloat(buyUnits);
  const newBuyPriceNum = parseFloat(buyPrice);
  let previewUnits: number | null = null;
  let previewAvg: number | null = null;
  if (!isNaN(newBuyUnitsNum) && !isNaN(newBuyPriceNum) && newBuyUnitsNum > 0 && newBuyPriceNum > 0) {
    previewUnits = holding.units + newBuyUnitsNum;
    previewAvg = (holding.units * holding.avg_buy_price + newBuyUnitsNum * newBuyPriceNum) / previewUnits;
  }

  return (
    <KeyboardAvoidingView
      style={[styles.container, { paddingTop: insets.top }]}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <View style={styles.header}>
        <TouchableOpacity testID="edit-close" onPress={() => router.back()} hitSlop={10}>
          <Feather name="arrow-left" size={24} color={colors.textPrimary} />
        </TouchableOpacity>
        <Text style={[typography.h3, { marginLeft: spacing.p3, flex: 1 }]} numberOfLines={1}>
          Edit holding
        </Text>
        <TouchableOpacity testID="edit-delete" onPress={remove} hitSlop={10}>
          <Feather name="trash-2" size={20} color={colors.negative} />
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={{ padding: spacing.p6, paddingTop: 0 }} keyboardShouldPersistTaps="handled">
        <Text style={typography.overline}>FUND</Text>
        <Text style={[typography.h4, { marginTop: 4 }]} numberOfLines={3}>
          {holding.scheme_name}
        </Text>

        {/* Current NAV mini-card */}
        <View style={styles.navCard}>
          <View>
            <Text style={typography.bodySmall}>Current NAV</Text>
            <Text style={[typography.h3, { marginTop: 2 }]}>{currNav ? `₹${currNav.toFixed(4)}` : "—"}</Text>
            <Text style={[typography.bodySmall, { marginTop: 2 }]}>NAV {holding?.nav?.nav_date || "—"}</Text>
          </View>
          <ChangePill changePct={holding?.nav?.change_pct} size="md" />
        </View>

        {/* Quick action: Buy more */}
        <Text style={[typography.overline, { marginTop: spacing.p6 }]}>BOUGHT MORE UNITS?</Text>
        <Text style={[typography.bodySmall, { marginTop: 4 }]}>
          We will average it in automatically. No math needed.
        </Text>
        <View style={[styles.section, { backgroundColor: colors.positiveBg, borderColor: colors.brandSoft }]}>
          <View style={{ flexDirection: "row", gap: spacing.p3 }}>
            <View style={{ flex: 1 }}>
              <Text style={typography.bodySmall}>New units bought</Text>
              <TextInput
                testID="buy-units-input"
                value={buyUnits}
                onChangeText={setBuyUnits}
                keyboardType="decimal-pad"
                placeholder="0.000"
                placeholderTextColor={colors.textTertiary}
                style={styles.input}
              />
            </View>
            <View style={{ flex: 1 }}>
              <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
                <Text style={typography.bodySmall}>Buy price (₹)</Text>
                {currNav && (
                  <TouchableOpacity testID="buy-use-nav" onPress={useCurrentNav}>
                    <Text style={[typography.bodySmall, { color: colors.brand, fontWeight: "700" }]}>Use NAV</Text>
                  </TouchableOpacity>
                )}
              </View>
              <TextInput
                testID="buy-price-input"
                value={buyPrice}
                onChangeText={setBuyPrice}
                keyboardType="decimal-pad"
                placeholder="0.00"
                placeholderTextColor={colors.textTertiary}
                style={styles.input}
              />
            </View>
          </View>
          {previewUnits != null && previewAvg != null && (
            <View style={styles.previewBox} testID="buy-preview">
              <Text style={typography.bodySmall}>After this purchase:</Text>
              <Text style={[typography.bodyMedium, { fontWeight: "700", marginTop: 2 }]}>
                {previewUnits.toFixed(4).replace(/\.?0+$/, "")} units @ ₹{previewAvg.toFixed(4).replace(/\.?0+$/, "")} avg
              </Text>
            </View>
          )}
          <TouchableOpacity
            testID="buy-more-btn"
            style={[styles.buyBtn, buying ? { opacity: 0.6 } : null]}
            onPress={buyMore}
            disabled={buying}
          >
            <Feather name="plus" size={16} color={colors.textInverse} />
            <Text style={[typography.bodyMedium, { color: colors.textInverse, fontWeight: "700", marginLeft: 6 }]}>
              {buying ? "Adding..." : "Add to holding"}
            </Text>
          </TouchableOpacity>
        </View>

        {/* Direct edit */}
        <Text style={[typography.overline, { marginTop: spacing.p6 }]}>OR EDIT DIRECTLY</Text>
        <View style={{ marginTop: spacing.p3 }}>
          <Text style={typography.bodySmall}>Total units</Text>
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
        <View style={{ marginTop: spacing.p4 }}>
          <Text style={typography.bodySmall}>Average buy price (₹ per unit)</Text>
          <TextInput
            testID="avg-price-input"
            value={avgPrice}
            onChangeText={setAvgPrice}
            keyboardType="decimal-pad"
            placeholder="0.00"
            placeholderTextColor={colors.textTertiary}
            style={styles.input}
          />
        </View>
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
        <View style={{ marginTop: spacing.p4 }}>
          <Text style={typography.bodySmall}>Notes (optional)</Text>
          <TextInput
            testID="notes-input"
            value={notes}
            onChangeText={setNotes}
            placeholder="Any reference notes"
            placeholderTextColor={colors.textTertiary}
            style={[styles.input, { minHeight: 56 }]}
            multiline
          />
        </View>

        <TouchableOpacity
          testID="save-edit-btn"
          style={[styles.saveBtn, saving ? { opacity: 0.6 } : null]}
          onPress={save}
          disabled={saving}
        >
          <Text style={[typography.bodyLarge, { color: colors.textInverse, fontWeight: "700" }]}>
            {saving ? "Saving..." : "Save changes"}
          </Text>
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
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
  navCard: {
    marginTop: spacing.p4,
    padding: spacing.p4,
    borderRadius: radius.md,
    backgroundColor: colors.bgSecondary,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-end",
  },
  section: {
    marginTop: spacing.p3,
    padding: spacing.p4,
    borderRadius: radius.md,
    borderWidth: 1,
  },
  input: {
    marginTop: 4,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.borderMedium,
    borderRadius: radius.md,
    paddingHorizontal: spacing.p4,
    paddingVertical: spacing.p3,
    fontSize: 16,
    color: colors.textPrimary,
  },
  previewBox: {
    marginTop: spacing.p3,
    padding: spacing.p3,
    backgroundColor: colors.surface,
    borderRadius: radius.sm,
  },
  buyBtn: {
    marginTop: spacing.p3,
    paddingVertical: spacing.p3,
    backgroundColor: colors.brand,
    borderRadius: radius.pill,
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "center",
  },
  saveBtn: {
    marginTop: spacing.p6,
    paddingVertical: spacing.p4,
    borderRadius: radius.pill,
    backgroundColor: colors.brand,
    alignItems: "center",
  },
});
