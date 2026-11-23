import React, { useCallback, useEffect, useState } from "react";
import { Alert, Pressable, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { api, errorMessage } from "../api";
import { useAuth } from "../auth";
import { amenityLabels, DAYS, PLATFORM_LABEL, PRICE_LABEL, stars, time12, todayHours } from "../format";
import { Banner, Button, Card, ErrorState, Loading, Screen, Tag, Text, Title } from "../ui";
import { colors, space } from "../theme";

// Screen 04: cafe profile with the Grab and foodpanda buttons.
export default function CafeProfileScreen({ navigation, route }) {
  const { id } = route.params;
  const { user, exitGuest } = useAuth();
  const [cafe, setCafe] = useState(null);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    setError("");
    try { setCafe(await api.cafe(id)); } catch (e) { setError(errorMessage(e)); }
  }, [id]);
  useEffect(() => { load(); }, [load]);

  const needLogin = (what) =>
    Alert.alert("Log in first", `Log in or create an account to ${what}.`, [{ text: "Not now", style: "cancel" }, { text: "Log in", onPress: exitGuest }]);

  const toggleFavorite = async () => {
    if (!user) return needLogin("save favorites");
    try {
      if (cafe.isFavorite) await api.removeFavorite(id); else await api.addFavorite(id);
      setCafe({ ...cafe, isFavorite: !cafe.isFavorite });
    } catch (e) { Alert.alert("Could not update favorites", errorMessage(e)); }
  };

  if (error) return <ErrorState message={error} onRetry={load} />;
  if (!cafe) return <Loading />;

  const amenities = amenityLabels(cafe.amenities);
  const linkFor = (p) => cafe.deliveryLinks.find((l) => l.platform === p);
  const showHours = DAYS.some(([k]) => cafe.openingHours?.[k]);

  return (
    <Screen edges={["left", "right"]}>
      <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start" }}>
        <Title style={{ flex: 1 }}>{cafe.name}</Title>
        <Pressable accessibilityRole="button" accessibilityLabel={cafe.isFavorite ? "Remove from favorites" : "Save to favorites"} onPress={toggleFavorite} hitSlop={12}>
          <Ionicons name={cafe.isFavorite ? "heart" : "heart-outline"} size={28} color={cafe.isFavorite ? colors.danger : colors.coffee} />
        </Pressable>
      </View>
      <Text muted>{cafe.address}</Text>
      <View style={{ flexDirection: "row", flexWrap: "wrap", marginVertical: space.md }}>
        {cafe.isOpenNow === true ? <Tag label="Open now" tone="good" /> : cafe.isOpenNow === false ? <Tag label="Closed" tone="bad" /> : null}
        {cafe.priceRange ? <Tag label={PRICE_LABEL[cafe.priceRange]} /> : null}
        {amenities.map((a) => <Tag key={a} label={a} />)}
      </View>
      {cafe.status !== "approved" ? <Banner tone="warn">This cafe is not public yet. Status: {cafe.status.replace("_", " ")}.{cafe.adminNote ? ` Note: ${cafe.adminNote}` : ""}</Banner> : null}
      {cafe.attributesSource === "demo" ? <Banner tone="warn">The hours, price, and amenities of this listing are sample values for the demo.</Banner> : null}
      {cafe.attributesSource === "unset" ? <Banner>The owner has not declared this cafe's amenities, hours, or price yet.</Banner> : null}
      {cafe.description ? <Text style={{ marginBottom: space.md }}>{cafe.description}</Text> : null}

      <Text semibold size={13} style={{ color: colors.coffee, marginBottom: space.sm }}>Order online</Text>
      {["grab", "foodpanda"].map((p) => (
        <Button key={p} label={linkFor(p) ? `Order on ${PLATFORM_LABEL[p]}` : `No ${PLATFORM_LABEL[p]} link yet`} kind={p === "grab" ? "primary" : "caramel"}
          disabled={!linkFor(p) || cafe.status !== "approved"} style={{ marginBottom: space.sm }}
          onPress={() => navigation.navigate("Handoff", { cafeId: id, cafeName: cafe.name, platform: p })} />
      ))}
      <Text size={12} muted style={{ marginBottom: space.lg }}>BrewMap does not take orders or payments. You finish your order on the delivery platform.</Text>

      <Card>
        <Text semibold style={{ marginBottom: space.xs }}>Opening hours</Text>
        <Text muted>Today: {todayHours(cafe.openingHours)}</Text>
        {showHours ? DAYS.map(([k, label]) => (
          <View key={k} style={{ flexDirection: "row", justifyContent: "space-between", marginTop: 4 }}>
            <Text size={13} muted>{label}</Text>
            <Text size={13}>{cafe.openingHours[k] ? `${time12(cafe.openingHours[k].open)} to ${time12(cafe.openingHours[k].close)}` : "Closed"}</Text>
          </View>
        )) : null}
      </Card>

      {cafe.menuHighlights.length ? <Card><Text semibold style={{ marginBottom: space.xs }}>Menu highlights</Text>{cafe.menuHighlights.map((m) => <Text key={m} muted>• {m}</Text>)}</Card> : null}
      {cafe.announcements.length ? <Card><Text semibold style={{ marginBottom: space.xs }}>Announcements</Text>{cafe.announcements.map((a) => <View key={a.id} style={{ marginBottom: space.xs }}><Text semibold size={14}>{a.title}</Text>{a.body ? <Text size={13} muted>{a.body}</Text> : null}</View>)}</Card> : null}

      <Card>
        <View style={{ flexDirection: "row", justifyContent: "space-between", marginBottom: space.sm }}>
          <Text semibold>Reviews</Text>
          <Text size={13} muted>{cafe.ratingCount ? `${stars(cafe.ratingAvg)} ${cafe.ratingAvg} (${cafe.ratingCount})` : "No reviews yet"}</Text>
        </View>
        {cafe.reviews.map((r) => (
          <View key={r.id} style={{ marginBottom: space.sm }}>
            <Text size={13} semibold>{r.userName}  <Text size={13} color={colors.caramel}>{stars(r.rating)}</Text></Text>
            {r.comment ? <Text size={13} muted>{r.comment}</Text> : null}
          </View>
        ))}
        {cafe.status === "approved" ? <Button label="Write a review" kind="secondary" onPress={() => (user ? navigation.navigate("WriteReview", { id, name: cafe.name }) : needLogin("write a review"))} /> : null}
      </Card>
    </Screen>
  );
}
