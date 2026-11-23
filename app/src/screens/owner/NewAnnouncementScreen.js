import React, { useCallback, useState } from "react";
import { Alert, View } from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import { api, errorMessage } from "../../api";
import { Banner, Button, Card, Field, Loading, Screen, Text, Title } from "../../ui";
import { space } from "../../theme";
import { useOwnerCafe } from "./OwnerContext";

// Screen 12: publish an announcement or promo on the cafe's profile.
export default function NewAnnouncementScreen({ navigation }) {
  const { cafe, loaded } = useOwnerCafe();
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [posted, setPosted] = useState([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  useFocusEffect(useCallback(() => {
    if (cafe) api.cafe(cafe.id).then((d) => setPosted(d.announcements)).catch(() => {});
  }, [cafe?.id])); // eslint-disable-line react-hooks/exhaustive-deps

  if (!loaded) return <Loading />;
  if (!cafe) return <Screen><Title>Promos</Title><Banner>Register your cafe first, then you can post announcements.</Banner><Button label="Register my cafe" onPress={() => navigation.navigate("EditCafe")} /></Screen>;

  const publish = async () => {
    setBusy(true);
    setError("");
    try {
      const a = await api.announce(cafe.id, { title, body });
      setPosted((x) => [a, ...x]);
      setTitle("");
      setBody("");
      Alert.alert("Published", "Your announcement is now on your cafe's profile.");
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Screen>
      <Title>New announcement</Title>
      {error ? <Banner tone="error">{error}</Banner> : null}
      <Field label="Title" value={title} onChangeText={setTitle} maxLength={100} placeholder="Free pastry with any coffee" />
      <Field label="Details (optional)" value={body} onChangeText={setBody} multiline maxLength={500} />
      <Button label="Publish" onPress={publish} loading={busy} disabled={title.trim().length < 2} />
      {posted.length ? (
        <View style={{ marginTop: space.xl }}>
          <Text semibold style={{ marginBottom: space.sm }}>Recent announcements</Text>
          {posted.map((a) => <Card key={a.id}><Text semibold>{a.title}</Text>{a.body ? <Text size={13} muted>{a.body}</Text> : null}</Card>)}
        </View>
      ) : null}
    </Screen>
  );
}
