import React, { useEffect, useState } from "react";
import { Alert, View } from "react-native";
import * as Location from "expo-location";
import { api, errorMessage } from "../../api";
import { inIndang } from "../../config";
import { DAYS } from "../../format";
import { Banner, Button, Chip, ErrorState, Field, Loading, Screen, Text, Title } from "../../ui";
import { colors, space } from "../../theme";
import { useOwnerCafe } from "./OwnerContext";

const HHMM = /^([01]\d|2[0-3]):[0-5]\d$/;

// Screen 10: register the cafe, or edit its information.
export default function EditCafeScreen({ navigation }) {
  const { cafe, loaded, error: loadError, reload } = useOwnerCafe();
  const [ready, setReady] = useState(false);
  const [f, setF] = useState({ name: "", address: "", description: "", lat: "", lng: "", price: null, wifi: false, outlets: false, quiet: false, opens: "08:00", closes: "21:00", closed: [] });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const set = (k, v) => setF((x) => ({ ...x, [k]: v }));

  // Fill the form with the saved cafe, if there is one.
  useEffect(() => {
    if (!loaded) return;
    if (!cafe) return setReady(true);
    api.cafe(cafe.id).then((d) => {
      const days = DAYS.map(([k]) => d.openingHours?.[k]);
      const firstOpen = days.find(Boolean);
      setF({
        name: d.name, address: d.address, description: d.description || "", lat: String(d.location.lat), lng: String(d.location.lng), price: d.priceRange,
        wifi: !!d.amenities.wifi, outlets: !!d.amenities.outlets, quiet: !!d.amenities.quietSpace,
        opens: firstOpen?.open || "08:00", closes: firstOpen?.close || "21:00",
        closed: firstOpen ? DAYS.filter(([k]) => !d.openingHours[k]).map(([k]) => k) : [],
      });
      setReady(true);
    }).catch((e) => setError(errorMessage(e)));
  }, [loaded, cafe?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  const useMyLocation = async () => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") return Alert.alert("Location is off", "Allow location, or type the coordinates yourself.");
      const p = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High });
      const here = { lat: p.coords.latitude, lng: p.coords.longitude };
      if (!inIndang(here)) return Alert.alert("Outside Indang", "BrewMap only lists cafes in Indang. Stand inside your cafe, or type the coordinates.");
      setF((x) => ({ ...x, lat: here.lat.toFixed(6), lng: here.lng.toFixed(6) }));
    } catch {
      Alert.alert("Could not get your location", "Try again, or type the coordinates yourself.");
    }
  };

  const save = async () => {
    setError("");
    const lat = Number(f.lat), lng = Number(f.lng);
    if (!f.name.trim() || !f.address.trim()) return setError("Enter the cafe name and address.");
    if (!f.lat || !f.lng || Number.isNaN(lat) || Number.isNaN(lng)) return setError("Enter the cafe's latitude and longitude, or tap Use my location.");
    if (!HHMM.test(f.opens) || !HHMM.test(f.closes)) return setError("Write opening and closing times as HH:MM in 24-hour time, for example 08:00 and 21:00.");
    const openingHours = Object.fromEntries(DAYS.map(([k]) => [k, f.closed.includes(k) ? null : { open: f.opens, close: f.closes }]));
    const body = {
      name: f.name.trim(), address: f.address.trim(), description: f.description.trim(), location: { lat, lng },
      priceRange: f.price, amenities: { wifi: f.wifi, outlets: f.outlets, quietSpace: f.quiet }, openingHours,
    };
    setBusy(true);
    try {
      if (cafe) await api.updateCafe(cafe.id, body); else await api.createCafe(body);
      await reload();
      Alert.alert("Saved", cafe ? "Your changes were saved." : "Your cafe was sent to the administrator for approval.");
      navigation.navigate("Dashboard");
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setBusy(false);
    }
  };

  if (loadError) return <ErrorState message={loadError} onRetry={reload} />;
  if (!ready) return <Loading />;

  return (
    <Screen>
      <Title>{cafe ? "Edit cafe info" : "Register your cafe"}</Title>
      {error ? <Banner tone="error">{error}</Banner> : null}
      <Field label="Cafe name" value={f.name} onChangeText={(v) => set("name", v)} />
      <Field label="Address" value={f.address} onChangeText={(v) => set("address", v)} />
      <Field label="Description (optional)" value={f.description} onChangeText={(v) => set("description", v)} multiline maxLength={500} />
      <View style={{ flexDirection: "row" }}>
        <Field label="Latitude" value={f.lat} onChangeText={(v) => set("lat", v)} keyboardType="numbers-and-punctuation" style={{ flex: 1, marginRight: space.sm }} placeholder="14.1952" />
        <Field label="Longitude" value={f.lng} onChangeText={(v) => set("lng", v)} keyboardType="numbers-and-punctuation" style={{ flex: 1 }} placeholder="120.8784" />
      </View>
      <Button label="Use my location" kind="secondary" onPress={useMyLocation} style={{ marginBottom: space.lg }} />

      <Text semibold size={13} style={{ color: colors.coffee, marginBottom: space.sm }}>Price range</Text>
      <View style={{ flexDirection: "row", flexWrap: "wrap" }}>
        {[["low", "₱ Budget"], ["mid", "₱₱ Mid-range"], ["high", "₱₱₱ Premium"]].map(([v, l]) => <Chip key={v} label={l} selected={f.price === v} onPress={() => set("price", f.price === v ? null : v)} />)}
      </View>

      <Text semibold size={13} style={{ color: colors.coffee, marginVertical: space.sm }}>What your cafe offers</Text>
      <View style={{ flexDirection: "row", flexWrap: "wrap" }}>
        <Chip label="Wi-Fi" selected={f.wifi} onPress={() => set("wifi", !f.wifi)} />
        <Chip label="Power outlets" selected={f.outlets} onPress={() => set("outlets", !f.outlets)} />
        <Chip label="Quiet or study-friendly" selected={f.quiet} onPress={() => set("quiet", !f.quiet)} />
      </View>
      <Text size={12} muted style={{ marginBottom: space.md }}>These are your own declarations. BrewMap does not measure them, and users can compare them with reviews.</Text>

      <View style={{ flexDirection: "row" }}>
        <Field label="Opens (HH:MM)" value={f.opens} onChangeText={(v) => set("opens", v)} style={{ flex: 1, marginRight: space.sm }} />
        <Field label="Closes (HH:MM)" value={f.closes} onChangeText={(v) => set("closes", v)} style={{ flex: 1 }} />
      </View>
      <Text semibold size={13} style={{ color: colors.coffee, marginBottom: space.sm }}>Closed on</Text>
      <View style={{ flexDirection: "row", flexWrap: "wrap", marginBottom: space.md }}>
        {DAYS.map(([k, l]) => <Chip key={k} label={l.slice(0, 3)} selected={f.closed.includes(k)} onPress={() => set("closed", f.closed.includes(k) ? f.closed.filter((x) => x !== k) : [...f.closed, k])} />)}
      </View>
      <Button label={cafe ? "Save changes" : "Send for approval"} onPress={save} loading={busy} />
    </Screen>
  );
}
