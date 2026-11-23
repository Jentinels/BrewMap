import React from "react";
import { StatusBar } from "expo-status-bar";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { useFonts, PlusJakartaSans_400Regular, PlusJakartaSans_600SemiBold, PlusJakartaSans_700Bold } from "@expo-google-fonts/plus-jakarta-sans";
import { AuthProvider } from "./src/auth";
import RootNavigator from "./src/navigation";
import { Loading } from "./src/ui";

export default function App() {
  const [fontsLoaded] = useFonts({ PlusJakartaSans_400Regular, PlusJakartaSans_600SemiBold, PlusJakartaSans_700Bold });
  if (!fontsLoaded) return <Loading />;
  return (
    <SafeAreaProvider>
      <AuthProvider>
        <RootNavigator />
        <StatusBar style="dark" />
      </AuthProvider>
    </SafeAreaProvider>
  );
}
