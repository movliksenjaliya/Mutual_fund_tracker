import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { useRouter } from "expo-router";
import { Feather } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { api, formatINR } from "@/src/api";
import { colors, radius, spacing, typography } from "@/src/theme";

export default function SIPCalc() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [amount, setAmount] = useState("10000");
  const [years, setYears] = useState("10");
  const [rate, setRate] = useState("12");
  const [result, setResult] = useState<{ invested: number; future_value: number; gain: number } | null>(null);
  const [loading, setLoading] = useState(false);

  const calc = async () => {
    setLoading(true);
    try {
      const r = await api.calcSip({
        monthly_amount: parseFloat(amount),
        years: parseFloat(years),
        expected_return_pct: parseFloat(rate),
      });
      setResult(r);
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={[styles.container, { paddingTop: insets.top }]}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <View style={styles.header}>
        <TouchableOpacity testID="sip-back-btn" onPress={() => router.back()} hitSlop={10}>
          <Feather name="arrow-left" size={24} color={colors.textPrimary} />
        </TouchableOpacity>
        <Text style={[typography.h3, { marginLeft: spacing.p3 }]}>SIP Calculator</Text>
      </View>
      <ScrollView contentContainerStyle={{ padding: spacing.p6 }}>
        <Text style={typography.overline}>MONTHLY INVESTMENT (₹)</Text>
        <TextInput testID="sip-amount" style={styles.input} value={amount} onChangeText={setAmount} keyboardType="decimal-pad" />

        <Text style={[typography.overline, { marginTop: spacing.p4 }]}>YEARS</Text>
        <TextInput testID="sip-years" style={styles.input} value={years} onChangeText={setYears} keyboardType="decimal-pad" />

        <Text style={[typography.overline, { marginTop: spacing.p4 }]}>EXPECTED RETURN (% / yr)</Text>
        <TextInput testID="sip-rate" style={styles.input} value={rate} onChangeText={setRate} keyboardType="decimal-pad" />

        <TouchableOpacity testID="sip-calc-btn" style={styles.btn} onPress={calc} disabled={loading}>
          <Text style={[typography.bodyLarge, { color: colors.textInverse, fontWeight: "700" }]}>
            {loading ? "Calculating..." : "Calculate"}
          </Text>
        </TouchableOpacity>

        {result && (
          <View style={styles.resultCard} testID="sip-result">
            <Text style={typography.overline}>FUTURE VALUE</Text>
            <Text style={[typography.financialLarge, { marginTop: 4 }]}>{formatINR(result.future_value)}</Text>
            <View style={{ marginTop: spacing.p4, flexDirection: "row", gap: spacing.p4 }}>
              <View style={{ flex: 1 }}>
                <Text style={typography.bodySmall}>Invested</Text>
                <Text style={[typography.h4, { marginTop: 2 }]}>{formatINR(result.invested)}</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={typography.bodySmall}>Est. gains</Text>
                <Text style={[typography.h4, { marginTop: 2, color: colors.positive }]}>+{formatINR(result.gain)}</Text>
              </View>
            </View>
          </View>
        )}
      </ScrollView>
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
  btn: {
    marginTop: spacing.p6,
    paddingVertical: spacing.p4,
    borderRadius: radius.pill,
    backgroundColor: colors.brand,
    alignItems: "center",
  },
  resultCard: {
    marginTop: spacing.p6,
    padding: spacing.p6,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.borderLight,
    borderRadius: radius.lg,
  },
});
