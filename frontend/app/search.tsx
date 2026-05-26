import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { useRouter, useLocalSearchParams } from "expo-router";
import { Feather } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { api } from "@/src/api";
import { colors, radius, spacing, typography } from "@/src/theme";

export default function Search() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { mode } = useLocalSearchParams<{ mode?: string }>();
  const [q, setQ] = useState("");
  const [results, setResults] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (q.length < 2) {
      setResults([]);
      return;
    }
    setLoading(true);
    const t = setTimeout(async () => {
      try {
        const r = await api.searchFunds(q);
        setResults(r.results);
      } catch (e) {
        console.warn(e);
      } finally {
        setLoading(false);
      }
    }, 300);
    return () => clearTimeout(t);
  }, [q]);

  const onSelect = async (fund: any) => {
    const code = String(fund.schemeCode);
    if (mode === "portfolio") {
      router.replace({ pathname: "/add-holding", params: { code, name: fund.schemeName } });
      return;
    }
    try {
      await api.addWatchlist({ scheme_code: code, scheme_name: fund.schemeName });
      router.back();
    } catch (e: any) {
      // If already exists, just navigate back
      router.back();
    }
  };

  return (
    <KeyboardAvoidingView
      style={[styles.container, { paddingTop: insets.top }]}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <View style={styles.header}>
        <TouchableOpacity testID="search-close" onPress={() => router.back()} hitSlop={10}>
          <Feather name="x" size={24} color={colors.textPrimary} />
        </TouchableOpacity>
        <Text style={[typography.h3, { marginLeft: spacing.p3 }]}>
          {mode === "portfolio" ? "Add holding" : "Find a fund"}
        </Text>
      </View>
      <View style={styles.searchBox}>
        <Feather name="search" size={18} color={colors.textTertiary} />
        <TextInput
          testID="search-input"
          autoFocus
          value={q}
          onChangeText={setQ}
          placeholder="Search by fund name e.g. Nifty, SBI..."
          placeholderTextColor={colors.textTertiary}
          style={styles.searchInput}
        />
      </View>
      {loading && <ActivityIndicator color={colors.brand} style={{ marginTop: 20 }} />}
      <FlatList
        data={results}
        keyExtractor={(it) => String(it.schemeCode)}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={{ padding: spacing.p6, paddingTop: spacing.p3 }}
        ListEmptyComponent={
          !loading && q.length >= 2 ? (
            <Text style={[typography.bodySmall, { textAlign: "center", marginTop: 30 }]}>No results</Text>
          ) : null
        }
        renderItem={({ item }) => (
          <TouchableOpacity
            testID={`search-result-${item.schemeCode}`}
            style={styles.result}
            onPress={() => onSelect(item)}
          >
            <Text style={[typography.bodyMedium, { fontWeight: "500" }]} numberOfLines={2}>
              {item.schemeName}
            </Text>
            <Feather name="plus-circle" size={20} color={colors.brand} />
          </TouchableOpacity>
        )}
      />
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: spacing.p6,
    paddingVertical: spacing.p4,
  },
  searchBox: {
    flexDirection: "row",
    alignItems: "center",
    marginHorizontal: spacing.p6,
    paddingHorizontal: spacing.p4,
    paddingVertical: spacing.p3,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.borderMedium,
    borderRadius: radius.md,
    gap: spacing.p3,
  },
  searchInput: { flex: 1, fontSize: 16, color: colors.textPrimary, paddingVertical: 4 },
  result: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: spacing.p4,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderLight,
    gap: spacing.p3,
  },
});
