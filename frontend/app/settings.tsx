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
import { useColors, useScheme, setScheme, radius, spacing, useTypography } from "@/src/theme";
import { notify } from "@/src/utils/dialog";

export default function Settings() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const colors = useColors();
  const typography = useTypography();
  const scheme = useScheme();
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
    <View style={[styles.container, { paddingTop: insets.top, backgroundColor: colors.bg }]}>
      <View style={styles.header}>
        <TouchableOpacity testID="settings-back-btn" onPress={() => router.back()} hitSlop={10}>
          <Feather name="arrow-left" size={24} color={colors.textPrimary} />
        </TouchableOpacity>
        <Text style={[typography.h3, { marginLeft: spacing.p3, color: colors.textPrimary }]}>Settings</Text>
      </View>
      <ScrollView contentContainerStyle={{ padding: spacing.p6 }}>
        {/* Theme toggle */}
        <Text style={[typography.overline, { color: colors.textSecondary }]}>APPEARANCE</Text>
        <Text style={[typography.h4, { marginTop: 4, color: colors.textPrimary }]}>Theme</Text>
        <View style={[styles.toggleRow, { backgroundColor: colors.bgSecondary }]} testID="theme-toggle">
          {(["light", "dark"] as const).map((opt) => {
            const active = scheme === opt;
            return (
              <TouchableOpacity
                key={opt}
                testID={`theme-${opt}`}
                onPress={() => setScheme(opt)}
                style={[
                  styles.toggleBtn,
                  active && { backgroundColor: colors.surface, borderColor: colors.brand },
                ]}
              >
                <Feather
                  name={opt === "light" ? "sun" : "moon"}
                  size={16}
                  color={active ? colors.brand : colors.textSecondary}
                />
                <Text
                  style={[
                    typography.bodyMedium,
                    {
                      marginLeft: 6,
                      fontWeight: "600",
                      color: active ? colors.brand : colors.textSecondary,
                      textTransform: "capitalize",
                    },
                  ]}
                >
                  {opt}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        <Text style={[typography.overline, { marginTop: spacing.p8, color: colors.textSecondary }]}>ALERT TRIGGER</Text>
        <Text style={[typography.h4, { marginTop: 4, color: colors.textPrimary }]}>Drop threshold (%)</Text>
        <Text style={[typography.bodySmall, { marginTop: 4, color: colors.textSecondary }]}>
          You will be alerted when a fund NAV drops by at least this percentage day-over-day.
        </Text>
        <TextInput
          testID="threshold-input"
          style={[styles.input, { backgroundColor: colors.surface, borderColor: colors.borderMedium, color: colors.textPrimary }]}
          value={threshold}
          onChangeText={setThreshold}
          keyboardType="decimal-pad"
          placeholderTextColor={colors.textTertiary}
        />
        <TouchableOpacity
          testID="save-settings-btn"
          style={[styles.btn, { backgroundColor: colors.brand }]}
          onPress={save}
          disabled={saving}
        >
          <Text style={[typography.bodyLarge, { color: colors.textInverse, fontWeight: "700" }]}>
            {saving ? "Saving..." : "Save"}
          </Text>
        </TouchableOpacity>

        <View style={[styles.aboutCard, { backgroundColor: colors.bgSecondary }]}>
          <Text style={[typography.overline, { color: colors.textSecondary }]}>ABOUT</Text>
          <Text style={[typography.bodyMedium, { marginTop: spacing.p2, color: colors.textPrimary }]}>
            NAV data is sourced from the public AMFI feed via mfapi.in (with AMFI's official
            NAVAll.txt as a fallback). Alerts are checked automatically every 30 minutes;
            pull-to-refresh on Alerts checks immediately.
          </Text>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { flexDirection: "row", alignItems: "center", paddingHorizontal: spacing.p6, paddingVertical: spacing.p4 },
  toggleRow: {
    marginTop: spacing.p3,
    padding: 4,
    flexDirection: "row",
    borderRadius: radius.pill,
    gap: 4,
  },
  toggleBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: spacing.p3,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: "transparent",
  },
  input: {
    marginTop: spacing.p3,
    borderWidth: 1,
    borderRadius: radius.md,
    paddingHorizontal: spacing.p4,
    paddingVertical: spacing.p3,
    fontSize: 18,
  },
  btn: {
    marginTop: spacing.p4,
    paddingVertical: spacing.p4,
    borderRadius: radius.pill,
    alignItems: "center",
  },
  aboutCard: {
    marginTop: spacing.p8,
    padding: spacing.p4,
    borderRadius: radius.md,
  },
});
