import React, { useCallback, useState } from "react";
import { FlatList, View } from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import { SafeAreaView } from "react-native-safe-area-context";
import { api, errorMessage } from "../api";
import { useAuth } from "../auth";
import { Button, Empty, ErrorState, Loading, Text, Title } from "../ui";
import { colors, space } from "../theme";
import { CafeCard } from "./ExploreScreen";

// Screen 08: saved cafes.
export default function FavoritesScreen({ navigation }) {
  const { user, exitGuest } = useAuth();
  const [cafes, setCafes] = useState(null);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    if (!user) return;
    setError("");
    try { setCafes((await api.favorites()).cafes); } catch (e) { setError(errorMessage(e)); }
  }, [user]);
  useFocusEffect(useCallback(() => { load(); }, [load]));

  return (
    <SafeAreaView edges={["top"]} style={{ flex: 1, backgroundColor: colors.cream }}>
      <View style={{ padding: space.lg, paddingBottom: 0 }}><Title>Favorites</Title></View>
      {!user ? (
        <View style={{ padding: space.lg }}>
          <Text muted style={{ marginBottom: space.md }}>Log in to save the cafes you like.</Text>
          <Button label="Log in or create account" onPress={exitGuest} />
        </View>
      ) : error ? <ErrorState message={error} onRetry={load} /> : cafes === null ? <Loading /> : (
        <FlatList data={cafes} keyExtractor={(c) => c.id} contentContainerStyle={{ padding: space.lg }}
          ListEmptyComponent={<Empty>No favorites yet. Tap the heart on a cafe to save it.</Empty>}
          renderItem={({ item }) => <CafeCard cafe={item} onPress={() => navigation.navigate("CafeProfile", { id: item.id })} />} />
      )}
    </SafeAreaView>
  );
}
