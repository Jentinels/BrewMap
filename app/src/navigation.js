import React from "react";
import { NavigationContainer, DefaultTheme } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { Ionicons } from "@expo/vector-icons";
import { useAuth } from "./auth";
import { Loading } from "./ui";
import { colors, fonts } from "./theme";
import WelcomeScreen from "./screens/WelcomeScreen";
import ExploreScreen from "./screens/ExploreScreen";
import FiltersScreen from "./screens/FiltersScreen";
import CafeProfileScreen from "./screens/CafeProfileScreen";
import HandoffScreen from "./screens/HandoffScreen";
import WriteReviewScreen from "./screens/WriteReviewScreen";
import FavoritesScreen from "./screens/FavoritesScreen";
import AccountScreen from "./screens/AccountScreen";
import { OwnerProvider } from "./screens/owner/OwnerContext";
import DashboardScreen from "./screens/owner/DashboardScreen";
import EditCafeScreen from "./screens/owner/EditCafeScreen";
import DeliveryLinksScreen from "./screens/owner/DeliveryLinksScreen";
import NewAnnouncementScreen from "./screens/owner/NewAnnouncementScreen";
import OverviewScreen from "./screens/admin/OverviewScreen";
import ReviewCafeScreen from "./screens/admin/ReviewCafeScreen";

const Stack = createNativeStackNavigator();
const Tab = createBottomTabNavigator();

const theme = { ...DefaultTheme, colors: { ...DefaultTheme.colors, background: colors.cream, primary: colors.espresso, card: colors.white, text: colors.ink, border: colors.border } };
const header = { headerStyle: { backgroundColor: colors.cream }, headerTintColor: colors.espresso, headerTitleStyle: { fontFamily: fonts.bold }, headerShadowVisible: false };

// Bottom navigation, one set of tabs per role.
const tabs = (icons) => ({ route }) => ({
  headerShown: false,
  tabBarActiveTintColor: colors.espresso,
  tabBarInactiveTintColor: colors.muted,
  tabBarLabelStyle: { fontFamily: fonts.semibold, fontSize: 11 },
  tabBarIcon: ({ color, size }) => <Ionicons name={icons[route.name]} size={size} color={color} />,
});

const UserTabs = () => (
  <Tab.Navigator screenOptions={tabs({ Explore: "map-outline", Favorites: "heart-outline", Account: "person-outline" })}>
    <Tab.Screen name="Explore" component={ExploreScreen} />
    <Tab.Screen name="Favorites" component={FavoritesScreen} />
    <Tab.Screen name="Account" component={AccountScreen} />
  </Tab.Navigator>
);

const OwnerTabs = () => (
  <OwnerProvider>
    <Tab.Navigator screenOptions={tabs({ Dashboard: "stats-chart-outline", EditCafe: "create-outline", DeliveryLinks: "link-outline", Promos: "megaphone-outline", Account: "person-outline" })}>
      <Tab.Screen name="Dashboard" component={DashboardScreen} />
      <Tab.Screen name="EditCafe" component={EditCafeScreen} options={{ title: "Cafe info" }} />
      <Tab.Screen name="DeliveryLinks" component={DeliveryLinksScreen} options={{ title: "Links" }} />
      <Tab.Screen name="Promos" component={NewAnnouncementScreen} />
      <Tab.Screen name="Account" component={AccountScreen} />
    </Tab.Navigator>
  </OwnerProvider>
);

const AdminTabs = () => (
  <Tab.Navigator screenOptions={tabs({ Overview: "shield-checkmark-outline", Account: "person-outline" })}>
    <Tab.Screen name="Overview" component={OverviewScreen} />
    <Tab.Screen name="Account" component={AccountScreen} />
  </Tab.Navigator>
);

export default function RootNavigator() {
  const { user, guest, loading } = useAuth();
  if (loading) return <Loading />;

  let screens;
  if (!user && !guest) {
    screens = <Stack.Screen name="Welcome" component={WelcomeScreen} options={{ headerShown: false }} />;
  } else if (user?.role === "owner") {
    screens = <Stack.Screen name="OwnerTabs" component={OwnerTabs} options={{ headerShown: false }} />;
  } else if (user?.role === "admin") {
    screens = (
      <>
        <Stack.Screen name="AdminTabs" component={AdminTabs} options={{ headerShown: false }} />
        <Stack.Screen name="ReviewCafe" component={ReviewCafeScreen} options={{ title: "Review cafe" }} />
      </>
    );
  } else {
    screens = (
      <>
        <Stack.Screen name="Tabs" component={UserTabs} options={{ headerShown: false }} />
        <Stack.Screen name="CafeProfile" component={CafeProfileScreen} options={{ title: "" }} />
        <Stack.Screen name="Filters" component={FiltersScreen} options={{ presentation: "modal", title: "Filters" }} />
        <Stack.Screen name="Handoff" component={HandoffScreen} options={{ presentation: "transparentModal", headerShown: false, animation: "fade" }} />
        <Stack.Screen name="WriteReview" component={WriteReviewScreen} options={{ presentation: "modal", title: "Write a review" }} />
      </>
    );
  }
  return (
    <NavigationContainer theme={theme}>
      <Stack.Navigator screenOptions={header}>{screens}</Stack.Navigator>
    </NavigationContainer>
  );
}
