import { Stack } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { useEffect } from "react";
import { StatusBar } from "expo-status-bar";
import { SafeAreaProvider } from "react-native-safe-area-context";

import { useIconFonts } from "@/src/hooks/use-icon-fonts";

SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const [loaded, error] = useIconFonts();

  useEffect(() => {
    if (loaded || error) {
      SplashScreen.hideAsync();
    }
  }, [loaded, error]);

  if (!loaded && !error) return null;

  return (
    <SafeAreaProvider>
      <StatusBar style="dark" />
      <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: "#F9F8F6" } }}>
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="search" options={{ presentation: "modal" }} />
        <Stack.Screen name="fund/[code]" />
        <Stack.Screen name="tools/sip" />
        <Stack.Screen name="tools/lumpsum" />
        <Stack.Screen name="settings" />
        <Stack.Screen name="add-holding" options={{ presentation: "modal" }} />
        <Stack.Screen name="edit-holding/[id]" />
      </Stack>
    </SafeAreaProvider>
  );
}
