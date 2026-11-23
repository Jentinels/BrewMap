import React, { useCallback, useEffect, useMemo, useState } from "react";
import { FlatList, Platform, Pressable, StyleSheet, TextInput, View } from "react-native";
import MapView, { Marker, UrlTile } from "react-native-maps";
import * as Location from "expo-location";
import { Ionicons } from "@expo/vector-icons";
import { SafeAreaView } from "react-native-safe-area-context";
import { api, errorMessage } from "../api";
import { INDANG_CENTER, inIndang } from "../config";
import { amenityLabels, distanceLabel, PLATFORM_LABEL, PRICE_LABEL, stars } from "../format";
import { Banner, Card, Empty, ErrorState, Loading, Tag, Text } from "../ui";
import { colors, fonts, radius, space } from "../theme";

export const DEFAULT_FILTERS = { wifi: false, outlets: false, quiet: false, openNow: false, price: null, delivery: null };
export const countFilters = (f) => Object.values(f).filter(Boolean).length;

// Screen 02: map with nearby cafe cards.
export default function ExploreScreen({ navigation, route }) {
  const [filters, setFilters] = useState(DEFAULT_FILTERS);
  const [search, setSearch] = useState("");
  const [query, setQuery] = useState("");
  const [origin, setOrigin] = useState(null); // { lat, lng, device: boolean, note?: string }
  const [cafes, setCafes] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => { if (route.params?.filters) setFilters(route.params.filters); }, [route.params?.filters]);
  useEffect(() => { const t = setTimeout(() => setQuery(search.trim()), 400); return () => clearTimeout(t); }, [search]);

  // Use the phone's location when it is in Indang; otherwise show cafes around the town center.
  useEffect(() => {
    (async () => {
      try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== "granted") return setOrigin({ ...INDANG_CENTER, device: false, note: "Location is off, so cafes are shown around the Indang town center." });
        const p = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
        const here = { lat: p.coords.latitude, lng: p.coords.longitude };
        setOrigin(inIndang(here) ? { ...here, device: true } : { ...INDANG_CENTER, device: false, note: "You are outside Indang, so cafes are shown around the Indang town center." });
      } catch {
        setOrigin({ ...INDANG_CENTER, device: false, note: "Could not get your location, so cafes are shown around the Indang town center." });
      }
    })();
  }, []);

  const load = useCallback(async () => {
    if (!origin) return;
    setError("");
    try {
      const params = { lat: origin.lat, lng: origin.lng, radiusKm: 10 };
      if (query) params.q = query;
      if (filters.wifi) params.wifi = "true";
      if (filters.outlets) params.outlets = "true";
      if (filters.quiet) params.quiet = "true";
      if (filters.openNow) params.openNow = "true";
      if (filters.price) params.price = filters.price;
      if (filters.delivery) params.delivery = filters.delivery;
      setCafes((await api.cafes(params)).cafes);
    } catch (e) {
      setError(errorMessage(e));
    }
  }, [origin, query, filters]);
  useEffect(() => { load(); }, [load]);

  const region = useMemo(() => origin && { latitude: origin.lat, longitude: origin.lng, latitudeDelta: 0.03, longitudeDelta: 0.03 }, [origin]);
  const open = (id) => navigation.navigate("CafeProfile", { id });
  const nFilters = countFilters(filters);

  return (
    <SafeAreaView edges={["top"]} style={{ flex: 1, backgroundColor: colors.cream }}>
      <View style={styles.searchRow}>
        <View style={styles.search}>
          <Ionicons name="search" size={18} color={colors.muted} />
          <TextInput value={search} onChangeText={setSearch} placeholder="Search cafes in Indang" placeholderTextColor="#B5A597" style={styles.searchInput} returnKeyType="search" />
        </View>
        <Pressable accessibilityRole="button" accessibilityLabel="Filters" onPress={() => navigation.navigate("Filters", { filters })} style={styles.filterBtn}>
          <Ionicons name="options" size={20} color={colors.white} />
          {nFilters > 0 ? <View style={styles.badge}><Text size={11} bold color={colors.espresso}>{nFilters}</Text></View> : null}
        </Pressable>
      </View>

      <View style={styles.mapWrap}>
        {region ? (
          <MapView key={`${region.latitude},${region.longitude}`} style={StyleSheet.absoluteFill} initialRegion={region} mapType={Platform.OS === "android" ? "none" : "standard"} showsUserLocation={!!origin?.device}>
            <UrlTile urlTemplate="https://basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}.png" maximumZ={19} />
            {(cafes || []).map((c) => (
              <Marker key={c.id} coordinate={{ latitude: c.location.lat, longitude: c.location.lng }} title={c.name} description={c.address} onCalloutPress={() => open(c.id)} />
            ))}
          </MapView>
        ) : <Loading />}
        <View style={styles.attribution}><Text size={10} muted>© OpenStreetMap contributors © CARTO</Text></View>
      </View>

      {origin?.note ? <View style={{ paddingHorizontal: space.lg, paddingTop: space.sm }}><Banner tone="warn">{origin.note}</Banner></View> : null}
      {error ? <ErrorState message={error} onRetry={load} /> : cafes === null ? <Loading /> : (
        <FlatList
          data={cafes}
          keyExtractor={(c) => c.id}
          contentContainerStyle={{ padding: space.lg }}
          ListEmptyComponent={<Empty>{nFilters || query ? "No cafe matches these filters. Try removing one." : "No cafes found nearby."}</Empty>}
          renderItem={({ item }) => <CafeCard cafe={item} onPress={() => open(item.id)} />}
        />
      )}
    </SafeAreaView>
  );
}

// Card used in Explore and Favorites.
export function CafeCard({ cafe, onPress }) {
  const amenities = amenityLabels(cafe.amenities);
  return (
    <Card onPress={onPress}>
      <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
        <Text bold size={17} style={{ flex: 1, marginRight: space.sm }}>{cafe.name}</Text>
        {cafe.distanceKm != null ? <Text semibold size={13} color={colors.coffee}>{distanceLabel(cafe.distanceKm)}</Text> : null}
      </View>
      <View style={{ flexDirection: "row", flexWrap: "wrap", marginTop: space.sm }}>
        {cafe.isOpenNow === true ? <Tag label="Open now" tone="good" /> : cafe.isOpenNow === false ? <Tag label="Closed" tone="bad" /> : <Tag label="Hours not declared" />}
        {cafe.priceRange ? <Tag label={PRICE_LABEL[cafe.priceRange]} /> : null}
        {amenities.map((a) => <Tag key={a} label={a} />)}
        {cafe.attributesSource === "demo" ? <Tag label="Sample values" tone="warn" /> : null}
      </View>
      <View style={{ flexDirection: "row", justifyContent: "space-between", marginTop: space.xs }}>
        <Text size={13} muted>{cafe.ratingCount ? `${stars(cafe.ratingAvg)} ${cafe.ratingAvg} (${cafe.ratingCount})` : "No reviews yet"}</Text>
        <Text size={13} muted>{cafe.deliveryPlatforms.length ? cafe.deliveryPlatforms.map((p) => PLATFORM_LABEL[p]).join(" · ") : "No delivery links"}</Text>
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  searchRow: { flexDirection: "row", alignItems: "center", paddingHorizontal: space.lg, paddingVertical: space.sm },
  search: { flex: 1, flexDirection: "row", alignItems: "center", backgroundColor: colors.white, borderRadius: radius.pill, borderWidth: 1.5, borderColor: colors.border, paddingHorizontal: space.md },
  searchInput: { flex: 1, paddingVertical: 9, marginLeft: space.sm, fontFamily: fonts.regular, fontSize: 15, color: colors.ink },
  filterBtn: { width: 44, height: 44, borderRadius: 22, backgroundColor: colors.espresso, alignItems: "center", justifyContent: "center", marginLeft: space.sm },
  badge: { position: "absolute", top: -2, right: -2, minWidth: 18, height: 18, borderRadius: 9, backgroundColor: colors.caramel, alignItems: "center", justifyContent: "center" },
  mapWrap: { height: 230, marginHorizontal: space.lg, borderRadius: radius.lg, overflow: "hidden", borderWidth: 1, borderColor: colors.border, backgroundColor: colors.border },
  attribution: { position: "absolute", left: 6, bottom: 4, backgroundColor: "rgba(255,255,255,0.8)", paddingHorizontal: 4, borderRadius: 4 },
});
