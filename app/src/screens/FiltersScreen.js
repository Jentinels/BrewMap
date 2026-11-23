import React, { useState } from "react";
import { View } from "react-native";
import { Button, Chip, Screen, Text, Title } from "../ui";
import { colors, space } from "../theme";
import { DEFAULT_FILTERS } from "./ExploreScreen";

// Screen 03: cafe-specific filters.
export default function FiltersScreen({ navigation, route }) {
  const [f, setF] = useState(route.params?.filters || DEFAULT_FILTERS);
  const toggle = (k) => setF((x) => ({ ...x, [k]: !x[k] }));
  const pick = (k, v) => setF((x) => ({ ...x, [k]: x[k] === v ? null : v }));
  const apply = (filters) => navigation.navigate("Tabs", { screen: "Explore", params: { filters } });

  const Group = ({ title, children }) => (
    <View style={{ marginBottom: space.lg }}>
      <Text semibold size={13} style={{ color: colors.coffee, marginBottom: space.sm }}>{title}</Text>
      <View style={{ flexDirection: "row", flexWrap: "wrap" }}>{children}</View>
    </View>
  );

  return (
    <Screen edges={["left", "right"]}>
      <Title>Filters</Title>
      <Group title="What the cafe offers">
        <Chip label="Wi-Fi" selected={f.wifi} onPress={() => toggle("wifi")} />
        <Chip label="Power outlets" selected={f.outlets} onPress={() => toggle("outlets")} />
        <Chip label="Quiet or study-friendly" selected={f.quiet} onPress={() => toggle("quiet")} />
      </Group>
      <Group title="Opening hours">
        <Chip label="Open now" selected={f.openNow} onPress={() => toggle("openNow")} />
      </Group>
      <Group title="Price range">
        <Chip label="₱ Budget" selected={f.price === "low"} onPress={() => pick("price", "low")} />
        <Chip label="₱₱ Mid-range" selected={f.price === "mid"} onPress={() => pick("price", "mid")} />
        <Chip label="₱₱₱ Premium" selected={f.price === "high"} onPress={() => pick("price", "high")} />
      </Group>
      <Group title="Delivery">
        <Chip label="Grab" selected={f.delivery === "grab"} onPress={() => pick("delivery", "grab")} />
        <Chip label="foodpanda" selected={f.delivery === "foodpanda"} onPress={() => pick("delivery", "foodpanda")} />
        <Chip label="Either" selected={f.delivery === "any"} onPress={() => pick("delivery", "any")} />
      </Group>
      <Text size={12} muted style={{ marginBottom: space.lg }}>Wi-Fi, power outlets, quiet space, hours, and price are declared by the cafe owners and are not measured by BrewMap. Cafes that have not declared them do not match these filters.</Text>
      <Button label="Show cafes" onPress={() => apply(f)} />
      <Button label="Reset filters" kind="ghost" onPress={() => apply(DEFAULT_FILTERS)} style={{ marginTop: space.sm }} />
    </Screen>
  );
}
