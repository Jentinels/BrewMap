import React, { useCallback, useEffect, useState } from "react";
import { Alert, Linking, View } from "react-native";
import { api, errorMessage } from "../../api";
import { inIndang } from "../../config";
import { DAYS, PLATFORM_LABEL } from "../../format";
import { Banner, Button, Card, ErrorState, Field, Loading, Screen, Tag, Text, Title } from "../../ui";
import { colors, space } from "../../theme";

// Screen 14: review a cafe registration. The checklist, the link check, and the three decisions.
export default function ReviewCafeScreen({ navigation, route }) {
  const { id } = route.params;
  const [cafe, setCafe] = useState(null);
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    setError("");
    try { setCafe(await api.cafe(id)); } catch (e) { setError(errorMessage(e)); }
  }, [id]);
  useEffect(() => { load(); }, [load]);

  if (error && !cafe) return <ErrorState message={error} onRetry={load} />;
  if (!cafe) return <Loading />;

  const checks = [
    ["Name and address are filled in", !!cafe.name && !!cafe.address],
    ["Location is inside Indang", inIndang(cafe.location)],
    ["Opening hours are declared", DAYS.some(([k]) => cafe.openingHours?.[k])],
    ["Price range is declared", !!cafe.priceRange],
    ["At least one delivery link", cafe.deliveryLinks.length > 0],
    ["Every delivery link is verified", cafe.deliveryLinks.length > 0 && cafe.deliveryLinks.every((l) => l.verified)],
  ];

  const decide = (decision, label) => {
    if (decision !== "approve" && !note.trim()) return setError("Write a note for the owner first.");
    Alert.alert(label, `${label} “${cafe.name}”?`, [
      { text: "Cancel", style: "cancel" },
      { text: label, style: decision === "reject" ? "destructive" : "default", onPress: async () => {
        setBusy(true);
        setError("");
        try { await api.decideCafe(id, { decision, note }); navigation.goBack(); } catch (e) { setError(errorMessage(e)); } finally { setBusy(false); }
      } },
    ]);
  };
  const verify = async (link, verified) => {
    try { await api.verifyLink(link.id, { verified }); await load(); } catch (e) { setError(errorMessage(e)); }
  };

  return (
    <Screen edges={["left", "right"]}>
      <Title>{cafe.name}</Title>
      <Text muted style={{ marginBottom: space.md }}>{cafe.address}</Text>
      {cafe.status !== "pending" ? <Banner tone="warn">Current status: {cafe.status.replace("_", " ")}.</Banner> : null}
      {error ? <Banner tone="error">{error}</Banner> : null}

      <Card>
        <Text semibold style={{ marginBottom: space.sm }}>Submission checklist</Text>
        {checks.map(([label, ok]) => (
          <View key={label} style={{ flexDirection: "row", marginBottom: 4 }}>
            <Text color={ok ? colors.success : colors.danger} bold style={{ width: 22 }}>{ok ? "✓" : "✗"}</Text>
            <Text size={14} style={{ flex: 1 }}>{label}</Text>
          </View>
        ))}
      </Card>

      <Card>
        <Text semibold style={{ marginBottom: space.sm }}>Delivery link check</Text>
        {cafe.deliveryLinks.length === 0 ? <Text muted>The owner has not added any link.</Text> : cafe.deliveryLinks.map((l) => (
          <View key={l.id} style={{ marginBottom: space.md }}>
            <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
              <Text bold>{PLATFORM_LABEL[l.platform]}</Text>
              <Tag label={l.verified ? "Verified" : "Not verified"} tone={l.verified ? "good" : "warn"} />
            </View>
            <Text size={12} muted numberOfLines={2} style={{ marginVertical: 4 }}>{l.url}</Text>
            <View style={{ flexDirection: "row" }}>
              <Button label="Open link" kind="secondary" onPress={() => Linking.openURL(l.url).catch(() => Alert.alert("Could not open the link"))} style={{ flex: 1, marginRight: space.sm }} />
              <Button label={l.verified ? "Unverify" : "Mark verified"} kind={l.verified ? "ghost" : "caramel"} onPress={() => verify(l, !l.verified)} style={{ flex: 1 }} />
            </View>
          </View>
        ))}
      </Card>

      <Field label="Note to the owner (required to request changes or reject)" value={note} onChangeText={setNote} multiline maxLength={300} />
      <Button label="Approve" onPress={() => decide("approve", "Approve")} loading={busy} style={{ marginBottom: space.sm }} />
      <Button label="Request changes" kind="caramel" onPress={() => decide("changes", "Request changes")} disabled={busy} style={{ marginBottom: space.sm }} />
      <Button label="Reject" kind="danger" onPress={() => decide("reject", "Reject")} disabled={busy} />
    </Screen>
  );
}
