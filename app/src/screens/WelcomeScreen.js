import React, { useState } from "react";
import { View } from "react-native";
import { Banner, Button, Chip, Field, Screen, Text } from "../ui";
import { useAuth } from "../auth";
import { errorMessage } from "../api";
import { colors, space } from "../theme";

// Screen 01: welcome, log in, and create an account.
export default function WelcomeScreen() {
  const { login, register, continueAsGuest } = useAuth();
  const [mode, setMode] = useState("login");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState("user");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const submit = async () => {
    setBusy(true);
    setError("");
    try {
      if (mode === "login") await login(email.trim(), password);
      else await register({ name: name.trim(), email: email.trim(), password, role });
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Screen>
      <View style={{ alignItems: "center", marginVertical: space.xl }}>
        <Text bold size={34} style={{ color: colors.espresso }}>BrewMap</Text>
        <Text muted style={{ textAlign: "center", marginTop: space.xs }}>Find cafes in Indang and order from their Grab or foodpanda page.</Text>
      </View>

      <View style={{ flexDirection: "row", marginBottom: space.md }}>
        <Chip label="Log in" selected={mode === "login"} onPress={() => setMode("login")} />
        <Chip label="Create account" selected={mode === "register"} onPress={() => setMode("register")} />
      </View>

      {error ? <Banner tone="error">{error}</Banner> : null}
      {mode === "register" ? <Field label="Name" value={name} onChangeText={setName} autoCapitalize="words" /> : null}
      <Field label="Email" value={email} onChangeText={setEmail} autoCapitalize="none" keyboardType="email-address" autoComplete="email" />
      <Field label="Password" value={password} onChangeText={setPassword} secureTextEntry autoCapitalize="none" placeholder={mode === "register" ? "At least 8 characters" : ""} />
      {mode === "register" ? (
        <View style={{ marginBottom: space.md }}>
          <Text semibold size={13} style={{ marginBottom: 6, color: colors.coffee }}>I am a</Text>
          <View style={{ flexDirection: "row" }}>
            <Chip label="Cafe-goer" selected={role === "user"} onPress={() => setRole("user")} />
            <Chip label="Cafe owner" selected={role === "owner"} onPress={() => setRole("owner")} />
          </View>
        </View>
      ) : null}

      <Button label={mode === "login" ? "Log in" : "Create account"} onPress={submit} loading={busy} />
      <Button label="Continue as guest" kind="ghost" onPress={continueAsGuest} style={{ marginTop: space.sm }} />
    </Screen>
  );
}
