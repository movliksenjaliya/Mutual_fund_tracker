import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  Alert,
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { Feather } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { api, formatINR } from "@/src/api";
import { colors, radius, spacing, typography } from "@/src/theme";

export default function AddHolding() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { code, name } = useLocalSearchParams<{ code: string; name: string }>();
  const [units, setUnits] = useState("");
  const [price, setPrice] = useState("");
  const [saving, setSaving] = useState(false);

  const u = parseFloat(units);
  const p = parseFloat(price);
  const invested = !isNaN(u) && !isNaN(p) ? u * p : null;

  const save = async () => {
    if (isNaN(u) || isNaN(p) || u <= 0 || p <= 0) {
      Alert.alert("Invalid input", "Enter valid units and average buy price.");
      return;
    }
    setSaving(true);
    try {
      await api.addPortfolio({ scheme_code: code, scheme_name: name, units: u, avg_buy_price: p });
      router.dismissAll();
      router.replace("/(tabs)/portfolio");
    } catch (e: any) {
      Alert.alert("Error", String(e.message || e));
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

      <View style={{ paddingHorizontal: spacing.p6 }}>
        <Text style={typography.overline}>FUND</Text>
        <Text style={[typography.h4, { marginTop: 4 }]} numberOfLines={3}>
          {name}
        </Text>

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

        <View style={{ marginTop: spacing.p4 }}>
          <Text style={typography.bodySmall}>Average buy price (₹ per unit)</Text>
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

        {invested != null && (
          <View style={styles.summary}>
            <Text style={typography.overline}>TOTAL INVESTED</Text>
            <Text style={[typography.h2, { marginTop: 4 }]}>{formatINR(invested)}</Text>
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
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  header: { flexDirection: "row", alignItems: "center", paddingHorizontal: spacing.p6, paddingVertical: spacing.p4 },
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
  summary: {
    marginTop: spacing.p6,
    padding: spacing.p4,
    borderRadius: radius.md,
    backgroundColor: colors.bgSecondary,
  },
  saveBtn: {
    marginTop: spacing.p6,
    paddingVertical: spacing.p4,
    borderRadius: radius.pill,
    backgroundColor: colors.brand,
    alignItems: "center",
  },
});
