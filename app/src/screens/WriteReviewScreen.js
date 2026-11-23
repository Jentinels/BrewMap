import React, { useState } from "react";
import { Pressable, View } from "react-native";
import { Alert } from "react-native";
import { api, errorMessage } from "../api";
import { Banner, Button, Field, Screen, Text, Title } from "../ui";
import { colors, space } from "../theme";

// Screen 07: write a review. The review is saved as pending until the administrator approves it.
export default function WriteReviewScreen({ navigation, route }) {
  const { id, name } = route.params;
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const submit = async () => {
    if (!rating) return setError("Tap a star to rate this cafe.");
    setBusy(true);
    setError("");
    try {
      const r = await api.review(id, { rating, comment });
      Alert.alert("Review sent", r.message, [{ text: "OK", onPress: () => navigation.goBack() }]);
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Screen edges={["left", "right"]}>
      <Title>Review {name}</Title>
      <View style={{ flexDirection: "row", marginVertical: space.md }}>
        {[1, 2, 3, 4, 5].map((n) => (
          <Pressable key={n} accessibilityRole="button" accessibilityLabel={`${n} star${n > 1 ? "s" : ""}`} onPress={() => setRating(n)} hitSlop={6}>
            <Text size={38} color={n <= rating ? colors.caramel : colors.border}>★</Text>
          </Pressable>
        ))}
      </View>
      {error ? <Banner tone="error">{error}</Banner> : null}
      <Field label="Your comment (optional)" value={comment} onChangeText={setComment} multiline maxLength={500} placeholder="What was the cafe like?" />
      <Button label="Submit review" onPress={submit} loading={busy} />
    </Screen>
  );
}
