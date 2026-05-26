import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ScrollView,
} from "react-native";
import { useRouter } from "expo-router";
import { Feather } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { api } from "@/src/api";
import { colors, radius, spacing, typography } from "@/src/theme";
import { notify } from "@/src/utils/dialog";

export default function Settings() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [threshold, setThreshold] = useState("1");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    api.settings().then((r) => setThreshold(String(r.drop_threshold_pct)));
  }, []);

  const save = async () => {
    const v = parseFloat(threshold);
    if (isNaN(v) || v <= 0) {
      notify("Invalid", "Enter a positive number");
      return;
    }
    setSaving(true);
    try {
      await api.updateSettings({ drop_threshold_pct: v });
      notify("Saved", "Drop threshold updated.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <TouchableOpacity testID="settings-back-btn" onPress={() => router.back()} hitSlop={10}>
          <Feather name="arrow-left" size={24} color={colors.textPrimary} />
        </TouchableOpacity>
        <Text style={[typography.h3, { marginLeft: spacing.p3 }]}>Settings</Text>
      </View>
      <ScrollView contentContainerStyle={{ padding: spacing.p6 }}>
        <Text style={typography.overline}>ALERT TRIGGER</Text>
        <Text style={[typography.h4, { marginTop: 4 }]}>Drop threshold (%)</Text>
        <Text style={[typography.bodySmall, { marginTop: 4 }]}>
          You will be alerted when a fund NAV drops by at least this percentage day-over-day.
        </Text>
        <TextInput
          testID="threshold-input"
          style={styles.input}
          value={threshold}
          onChangeText={setThreshold}
          keyboardType="decimal-pad"
        />
        <TouchableOpacity testID="save-settings-btn" style={styles.btn} onPress={save} disabled={saving}>
          <Text style={[typography.bodyLarge, { color: colors.textInverse, fontWeight: "700" }]}>
            {saving ? "Saving..." : "Save"}
          </Text>
        </TouchableOpacity>

        <View style={styles.aboutCard}>
          <Text style={typography.overline}>ABOUT</Text>
          <Text style={[typography.bodyMedium, { marginTop: spacing.p2 }]}>
            NAV data is sourced from the public AMFI feed via mfapi.in. Alerts are checked automatically
            every 30 minutes; pull to refresh on the Alerts screen to check immediately.
          </Text>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  header: { flexDirection: "row", alignItems: "center", paddingHorizontal: spacing.p6, paddingVertical: spacing.p4 },
  input: {
    marginTop: spacing.p3,
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
    marginTop: spacing.p4,
    paddingVertical: spacing.p4,
    borderRadius: radius.pill,
    backgroundColor: colors.brand,
    alignItems: "center",
  },
  aboutCard: {
    marginTop: spacing.p8,
    padding: spacing.p4,
    borderRadius: radius.md,
    backgroundColor: colors.bgSecondary,
  },
});
