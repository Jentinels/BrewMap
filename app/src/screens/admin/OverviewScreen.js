import React, { useCallback, useState } from "react";
import { View } from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import { api, errorMessage } from "../../api";
import { Button, Card, ErrorState, Loading, Screen, Tag, Text, Title } from "../../ui";
import { colors, space } from "../../theme";

// Screen 13: administrator overview.
export default function OverviewScreen({ navigation }) {
  const [d, setD] = useState(null);
  const [error, setError] = useState("");
  const load = useCallback(async () => {
    setError("");
    try { setD(await api.adminOverview()); } catch (e) { setError(errorMessage(e)); }
  }, []);
  useFocusEffect(useCallback(() => { load(); }, [load]));

  if (error) return <ErrorState message={error} onRetry={load} />;
  if (!d) return <Loading />;

  const stat = [["Approved cafes", d.cafes.approved], ["Waiting for approval", d.cafes.pending], ["Cafe-goers", d.users], ["Cafe owners", d.owners]];
  return (
    <Screen>
      <Title>Overview</Title>
      <View style={{ flexDirection: "row", flexWrap: "wrap", marginHorizontal: -4 }}>
        {stat.map(([label, value]) => (
          <View key={label} style={{ width: "50%", padding: 4 }}>
            <Card style={{ marginBottom: 0 }}><Text size={12} muted>{label}</Text><Text bold size={26} style={{ color: colors.espresso }}>{value}</Text></Card>
          </View>
        ))}
      </View>
      {d.pendingReviews ? <Text size={13} muted style={{ marginTop: space.md }}>{d.pendingReviews} review{d.pendingReviews > 1 ? "s are" : " is"} waiting for moderation.</Text> : null}

      <Text semibold style={{ marginTop: space.lg, marginBottom: space.sm }}>Pending approvals</Text>
      {d.pendingCafes.length === 0 ? <Text muted>Nothing is waiting for approval.</Text> : d.pendingCafes.map((c) => (
        <Card key={c.id} onPress={() => navigation.navigate("ReviewCafe", { id: c.id })}>
          <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
            <View style={{ flex: 1 }}><Text bold>{c.name}</Text><Text size={13} muted>{c.ownerName ? `Owner: ${c.ownerName}` : c.address}</Text></View>
            <Tag label="Review" tone="warn" />
          </View>
        </Card>
      ))}

      <Text semibold style={{ marginTop: space.lg, marginBottom: space.sm }}>Most-clicked delivery links</Text>
      {d.mostClicked.length === 0 ? <Text muted>No taps recorded yet.</Text> : d.mostClicked.map((m) => (
        <Card key={m.cafeId}>
          <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
            <Text semibold style={{ flex: 1 }}>{m.name}</Text>
            <Text size={13} muted>Grab {m.grab} · foodpanda {m.foodpanda}</Text>
          </View>
        </Card>
      ))}
      <Button label="Refresh" kind="ghost" onPress={load} />
    </Screen>
  );
}
