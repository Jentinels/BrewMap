import React from "react";
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text as RNText, TextInput, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { colors, fonts, radius, space } from "./theme";

export function Text({ style, bold, semibold, muted, size, color, ...rest }) {
  return <RNText {...rest} style={[{ fontFamily: bold ? fonts.bold : semibold ? fonts.semibold : fonts.regular, color: color || (muted ? colors.muted : colors.ink), fontSize: size || 15 }, style]} />;
}

// A screen with the standard background and padding. `scroll` makes it scrollable.
export function Screen({ children, scroll = true, style, edges = ["top", "left", "right"] }) {
  const body = scroll ? <ScrollView contentContainerStyle={[styles.pad, style]} keyboardShouldPersistTaps="handled">{children}</ScrollView> : <View style={[styles.pad, { flex: 1 }, style]}>{children}</View>;
  return <SafeAreaView edges={edges} style={styles.screen}>{body}</SafeAreaView>;
}

export function Title({ children, style }) {
  return <Text bold size={24} style={[{ color: colors.espresso, marginBottom: space.sm }, style]}>{children}</Text>;
}

export function Button({ label, onPress, kind = "primary", disabled, loading, style }) {
  const k = { primary: [colors.espresso, colors.white], caramel: [colors.caramel, colors.espresso], secondary: [colors.white, colors.espresso], danger: [colors.danger, colors.white], ghost: ["transparent", colors.coffee] }[kind];
  return (
    <Pressable accessibilityRole="button" accessibilityLabel={label} onPress={onPress} disabled={disabled || loading}
      style={({ pressed }) => [styles.btn, { backgroundColor: k[0], borderColor: kind === "secondary" ? colors.espresso : k[0], opacity: disabled ? 0.5 : pressed ? 0.85 : 1 }, style]}>
      {loading ? <ActivityIndicator color={k[1]} /> : <Text semibold style={{ color: k[1] }}>{label}</Text>}
    </Pressable>
  );
}

export function Chip({ label, selected, onPress, style }) {
  return (
    <Pressable accessibilityRole="button" accessibilityState={{ selected: !!selected }} onPress={onPress}
      style={[styles.chip, selected && { backgroundColor: colors.espresso, borderColor: colors.espresso }, style]}>
      <Text semibold size={13} style={{ color: selected ? colors.white : colors.coffee }}>{label}</Text>
    </Pressable>
  );
}

export function Tag({ label, tone = "neutral" }) {
  const t = { neutral: [colors.cream, colors.coffee], good: ["#E3F2E9", colors.success], warn: ["#FBEFD9", colors.warning], bad: ["#F8E3E0", colors.danger] }[tone];
  return <View style={[styles.tag, { backgroundColor: t[0] }]}><Text semibold size={12} style={{ color: t[1] }}>{label}</Text></View>;
}

export function Field({ label, error, style, ...input }) {
  return (
    <View style={[{ marginBottom: space.md }, style]}>
      {label ? <Text semibold size={13} style={{ marginBottom: 4, color: colors.coffee }}>{label}</Text> : null}
      <TextInput placeholderTextColor="#B5A597" {...input} style={[styles.input, input.multiline && { minHeight: 80, textAlignVertical: "top" }, error && { borderColor: colors.danger }]} />
      {error ? <Text size={12} color={colors.danger}>{error}</Text> : null}
    </View>
  );
}

export function Card({ children, style, onPress }) {
  const C = onPress ? Pressable : View;
  return <C onPress={onPress} style={[styles.card, style]}>{children}</C>;
}

export function Banner({ children, tone = "info" }) {
  const t = { info: [colors.cream, colors.coffee], warn: ["#FBEFD9", colors.warning], error: ["#F8E3E0", colors.danger], good: ["#E3F2E9", colors.success] }[tone];
  return <View style={[styles.banner, { backgroundColor: t[0] }]}><Text size={13} style={{ color: t[1] }}>{children}</Text></View>;
}

export const Loading = () => <View style={styles.center}><ActivityIndicator size="large" color={colors.caramel} /></View>;

export function ErrorState({ message, onRetry }) {
  return (
    <View style={styles.center}>
      <Text style={{ textAlign: "center", marginBottom: space.md }} color={colors.danger}>{message}</Text>
      {onRetry ? <Button label="Try again" kind="secondary" onPress={onRetry} /> : null}
    </View>
  );
}

export const Empty = ({ children }) => <View style={styles.center}><Text muted style={{ textAlign: "center" }}>{children}</Text></View>;

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.cream },
  pad: { padding: space.lg, paddingBottom: space.xl * 2 },
  btn: { minHeight: 48, borderRadius: radius.md, borderWidth: 1.5, alignItems: "center", justifyContent: "center", paddingHorizontal: space.lg },
  chip: { borderWidth: 1.5, borderColor: colors.border, backgroundColor: colors.white, borderRadius: radius.pill, paddingHorizontal: space.md, paddingVertical: 7, marginRight: space.sm, marginBottom: space.sm },
  tag: { borderRadius: radius.pill, paddingHorizontal: 10, paddingVertical: 3, marginRight: 6, marginBottom: 4 },
  input: { backgroundColor: colors.white, borderWidth: 1.5, borderColor: colors.border, borderRadius: radius.md, paddingHorizontal: space.md, paddingVertical: 10, fontFamily: fonts.regular, fontSize: 15, color: colors.ink },
  card: { backgroundColor: colors.white, borderRadius: radius.lg, padding: space.lg, marginBottom: space.md, borderWidth: 1, borderColor: colors.border },
  banner: { borderRadius: radius.md, padding: space.md, marginBottom: space.md },
  center: { flex: 1, alignItems: "center", justifyContent: "center", padding: space.xl },
});
