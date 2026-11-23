import React, { useCallback, useState } from "react";
import { View } from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import { api, errorMessage } from "../../api";
import { stars } from "../../format";
import { Banner, Button, Card, ErrorState, Loading, Screen, Text, Title } from "../../ui";
import { colors, space } from "../../theme";
import { useOwnerCafe } from "./OwnerContext";

const STATUS = {
  pending: ["warn", "Your cafe is waiting for the administrator's approval. It is not shown to users yet."],
  changes_requested: ["warn", "The administrator asked for changes before approving your cafe."],
  rejected: ["error", "The administrator did not approve this cafe."],
};

// Screen 09: owner dashboard.
export default function DashboardScreen({ navigation }) {
  const { cafe, loaded, error: loadError, reload } = useOwnerCafe();
  const [stats, setStats] = useState(null);
  const [error, setError] = useState("");

  // Refresh the cafe (its approval status may have changed) and its numbers whenever the tab is shown.
  useFocusEffect(useCallback(() => {
    reload();
    if (!cafe) return;
    api.dashboard(cafe.id).then((d) => { setStats(d); setError(""); }).catch((e) => setError(errorMessage(e)));
  }, [reload, cafe?.id])); // eslint-disable-line react-hooks/exhaustive-deps

  if (loadError) return <ErrorState message={loadError} onRetry={reload} />;
  if (!loaded) return <Loading />;
  if (!cafe) {
    return (
      <Screen>
        <Title>Dashboard</Title>
        <Banner>You have not registered a cafe yet. Add your cafe's details, then the administrator will review them.</Banner>
        <Button label="Register my cafe" onPress={() => navigation.navigate("EditCafe")} />
      </Screen>
    );
  }
  const max = Math.max(1, ...(stats?.last7Days || []).map((d) => d.grab + d.foodpanda));
  const status = STATUS[cafe.status];

  return (
    <Screen>
      <Title>{cafe.name}</Title>
      {status ? <Banner tone={status[0]}>{status[1]}{cafe.adminNote ? ` Note: ${cafe.adminNote}` : ""}</Banner> : null}
      {error ? <Banner tone="error">{error}</Banner> : null}
      {stats ? (
        <>
          <View style={{ flexDirection: "row", flexWrap: "wrap", marginHorizontal: -4 }}>
            {[["Profile views", stats.views], ["Link taps", stats.linkTaps.total], ["Favorites", stats.favorites], ["Rating", stats.ratingCount ? `${stats.ratingAvg} / 5` : "None yet"]].map(([label, value]) => (
              <View key={label} style={{ width: "50%", padding: 4 }}>
                <Card style={{ marginBottom: 0 }}><Text size={12} muted>{label}</Text><Text bold size={24} style={{ color: colors.espresso }}>{value}</Text></Card>
              </View>
            ))}
          </View>
          <Card style={{ marginTop: space.md }}>
            <Text semibold style={{ marginBottom: space.sm }}>Link taps, last 7 days</Text>
            <Text size={12} muted style={{ marginBottom: space.sm }}>Grab {stats.linkTaps.grab} · foodpanda {stats.linkTaps.foodpanda}</Text>
            {stats.last7Days.map((d) => (
              <View key={d.day} style={{ flexDirection: "row", alignItems: "center", marginBottom: 4 }}>
                <Text size={11} muted style={{ width: 44 }}>{d.day.slice(5)}</Text>
                <View style={{ flexDirection: "row", flex: 1, height: 12 }}>
                  <View style={{ width: `${(d.grab / max) * 100}%`, backgroundColor: colors.espresso }} />
                  <View style={{ width: `${(d.foodpanda / max) * 100}%`, backgroundColor: colors.caramel }} />
                </View>
                <Text size={11} muted style={{ width: 24, textAlign: "right" }}>{d.grab + d.foodpanda}</Text>
              </View>
            ))}
            <Text size={11} muted style={{ marginTop: 4 }}>Dark bar: Grab. Light bar: foodpanda.</Text>
          </Card>
          <Text size={12} muted>{stats.ratingCount ? `${stars(stats.ratingAvg)} from ${stats.ratingCount} approved review${stats.ratingCount > 1 ? "s" : ""}` : ""}</Text>
        </>
      ) : !error ? <Loading /> : null}
    </Screen>
  );
}
