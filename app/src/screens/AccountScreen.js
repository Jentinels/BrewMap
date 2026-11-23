import React from "react";
import { Button, Card, Screen, Tag, Text, Title } from "../ui";
import { API_URL } from "../config";
import { useAuth } from "../auth";
import { space } from "../theme";

const ROLE = { user: "Cafe-goer", owner: "Cafe owner", admin: "Administrator" };

// Account tab, shared by every role.
export default function AccountScreen() {
  const { user, logout, exitGuest } = useAuth();
  return (
    <Screen>
      <Title>Account</Title>
      {user ? (
        <>
          <Card>
            <Text bold size={18}>{user.name}</Text>
            <Text muted style={{ marginBottom: space.sm }}>{user.email}</Text>
            <Tag label={ROLE[user.role]} />
          </Card>
          <Button label="Log out" kind="secondary" onPress={logout} />
        </>
      ) : (
        <>
          <Text muted style={{ marginBottom: space.md }}>You are browsing as a guest. Log in to save favorites and write reviews.</Text>
          <Button label="Log in or create account" onPress={exitGuest} />
        </>
      )}
      <Text size={11} muted style={{ marginTop: space.xl }}>Server: {API_URL}</Text>
    </Screen>
  );
}
