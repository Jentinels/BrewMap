import React, { useState } from "react";
import { Alert, Linking, Pressable, View } from "react-native";
import { api, errorMessage } from "../api";
import { PLATFORM_LABEL } from "../format";
import { Button, Text } from "../ui";
import { colors, radius, space } from "../theme";

// Screens 05 and 06: the Grab and foodpanda handoff sheets. One screen serves both platforms.
export default function HandoffScreen({ navigation, route }) {
  const { cafeId, cafeName, platform } = route.params;
  const label = PLATFORM_LABEL[platform];
  const [busy, setBusy] = useState(false);

  const go = async () => {
    setBusy(true);
    try {
      const { url } = await api.tapLink(cafeId, platform); // the server records the tap and returns the link
      // The link is a normal https address: it opens in the Grab or foodpanda app when it is installed, and in the browser when it is not.
      await Linking.openURL(url);
      navigation.goBack();
    } catch (e) {
      Alert.alert(`Could not open ${label}`, e?.response ? errorMessage(e) : "The link could not be opened on this phone.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <View style={{ flex: 1, justifyContent: "flex-end", backgroundColor: "rgba(31,21,16,0.55)" }}>
      <Pressable style={{ flex: 1 }} onPress={() => navigation.goBack()} accessibilityLabel="Close" />
      <View style={{ backgroundColor: colors.cream, borderTopLeftRadius: radius.lg, borderTopRightRadius: radius.lg, padding: space.xl, paddingBottom: space.xl * 1.5 }}>
        <Text bold size={20} style={{ color: colors.espresso, marginBottom: space.sm }}>Continue on {label}</Text>
        <Text style={{ marginBottom: space.sm }}>You are leaving BrewMap to open {cafeName} on {label}.</Text>
        <Text size={13} muted style={{ marginBottom: space.lg }}>Ordering, payment, delivery, and customer support are handled by {label} and follow its terms. BrewMap only records that you tapped the link.</Text>
        <Button label={`Open ${label}`} onPress={go} loading={busy} />
        <Button label="Cancel" kind="ghost" onPress={() => navigation.goBack()} style={{ marginTop: space.sm }} />
      </View>
    </View>
  );
}
