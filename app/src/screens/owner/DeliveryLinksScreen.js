import React, { useCallback, useState } from "react";
import { Alert, Linking, View } from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import { api, errorMessage } from "../../api";
import { PLATFORM_LABEL } from "../../format";
import { Banner, Button, Card, Field, Loading, Screen, Tag, Text, Title } from "../../ui";
import { space } from "../../theme";
import { useOwnerCafe } from "./OwnerContext";

// Screen 11: add, test, and update the Grab and foodpanda links.
export default function DeliveryLinksScreen({ navigation }) {
  const { cafe, loaded } = useOwnerCafe();
  const [urls, setUrls] = useState({ grab: "", foodpanda: "" });
  const [links, setLinks] = useState([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const apply = (list) => {
    setLinks(list);
    setUrls({ grab: list.find((l) => l.platform === "grab")?.url || "", foodpanda: list.find((l) => l.platform === "foodpanda")?.url || "" });
  };
  useFocusEffect(useCallback(() => {
    if (cafe) api.cafe(cafe.id).then((d) => apply(d.deliveryLinks)).catch((e) => setError(errorMessage(e)));
  }, [cafe?.id])); // eslint-disable-line react-hooks/exhaustive-deps

  if (!loaded) return <Loading />;
  if (!cafe) return <Screen><Title>Delivery links</Title><Banner>Register your cafe first, then add its Grab and foodpanda links here.</Banner><Button label="Register my cafe" onPress={() => navigation.navigate("EditCafe")} /></Screen>;

  const save = async () => {
    setBusy(true);
    setError("");
    try {
      const body = {};
      for (const p of ["grab", "foodpanda"]) body[p] = urls[p].trim() || null; // an empty box removes the link
      apply((await api.setLinks(cafe.id, body)).deliveryLinks);
      Alert.alert("Saved", "Your links were saved. The administrator checks them before they are marked as verified.");
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setBusy(false);
    }
  };
  const test = (p) => urls[p].trim() ? Linking.openURL(urls[p].trim()).catch(() => Alert.alert("Could not open the link")) : null;

  return (
    <Screen>
      <Title>Delivery links</Title>
      <Text muted style={{ marginBottom: space.md }}>Paste your cafe's page on each platform. Users tap these links to order there.</Text>
      {error ? <Banner tone="error">{error}</Banner> : null}
      {["grab", "foodpanda"].map((p) => {
        const saved = links.find((l) => l.platform === p);
        return (
          <Card key={p}>
            <View style={{ flexDirection: "row", justifyContent: "space-between", marginBottom: space.sm }}>
              <Text bold>{PLATFORM_LABEL[p]}</Text>
              {saved ? <Tag label={saved.verified ? "Verified" : "Waiting for verification"} tone={saved.verified ? "good" : "warn"} /> : <Tag label="No link" />}
            </View>
            <Field value={urls[p]} onChangeText={(v) => setUrls((x) => ({ ...x, [p]: v }))} autoCapitalize="none" keyboardType="url" placeholder={p === "grab" ? "https://food.grab.com/ph/en/..." : "https://www.foodpanda.ph/restaurant/..."} style={{ marginBottom: space.sm }} />
            <Button label="Test link" kind="secondary" onPress={() => test(p)} disabled={!urls[p].trim()} />
          </Card>
        );
      })}
      <Button label="Save links" onPress={save} loading={busy} />
    </Screen>
  );
}
