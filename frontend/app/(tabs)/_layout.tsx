import { Tabs } from "expo-router";
import { Feather } from "@expo/vector-icons";
import React, { useEffect, useState } from "react";
import { View, Text, StyleSheet } from "react-native";

import { api } from "@/src/api";
import { colors, radius } from "@/src/theme";

function AlertsTabIcon({ color, size, focused }: { color: string; size: number; focused: boolean }) {
  const [unread, setUnread] = useState(0);
  useEffect(() => {
    let alive = true;
    const fetchUnread = async () => {
      try {
        const r = await api.alerts();
        if (alive) setUnread(r.unread_count);
      } catch {}
    };
    fetchUnread();
    const id = setInterval(fetchUnread, 20000);
    return () => {
      alive = false;
      clearInterval(id);
    };
  }, [focused]);
  return (
    <View testID="alerts-tab-icon">
      <Feather name="bell" size={size} color={color} />
      {unread > 0 && (
        <View style={styles.badge} testID="alerts-tab-badge">
          <Text style={styles.badgeText}>{unread > 9 ? "9+" : unread}</Text>
        </View>
      )}
    </View>
  );
}

export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.brand,
        tabBarInactiveTintColor: colors.textTertiary,
        tabBarStyle: {
          backgroundColor: colors.surface,
          borderTopColor: colors.borderLight,
          height: 64,
          paddingBottom: 10,
          paddingTop: 8,
        },
        tabBarLabelStyle: { fontSize: 11, fontWeight: "600" },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: "Home",
          tabBarIcon: ({ color, size }) => <Feather name="home" size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="watchlist"
        options={{
          title: "Watchlist",
          tabBarIcon: ({ color, size }) => <Feather name="bookmark" size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="portfolio"
        options={{
          title: "Portfolio",
          tabBarIcon: ({ color, size }) => <Feather name="briefcase" size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="alerts"
        options={{
          title: "Alerts",
          tabBarIcon: ({ color, size, focused }) => <AlertsTabIcon color={color} size={size} focused={focused} />,
        }}
      />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  badge: {
    position: "absolute",
    top: -4,
    right: -8,
    backgroundColor: colors.accent,
    borderRadius: radius.pill,
    minWidth: 16,
    height: 16,
    paddingHorizontal: 4,
    alignItems: "center",
    justifyContent: "center",
  },
  badgeText: { color: "#fff", fontSize: 10, fontWeight: "700" },
});
