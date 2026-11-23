import Constants from "expo-constants";

// While developing with Expo Go, the API runs on the same computer that serves the app, so reuse that computer's address.
// For a different server, set EXPO_PUBLIC_API_URL (for example in app/.env).
const devHost = Constants.expoConfig?.hostUri?.split(":")[0];
export const API_URL = process.env.EXPO_PUBLIC_API_URL || (devHost ? `http://${devHost}:4000` : "http://localhost:4000");

// Indang town center, used when the phone is not in Indang or location permission is denied.
export const INDANG_CENTER = { lat: 14.1952, lng: 120.8784 };
export const INDANG_BBOX = { minLat: 14.1220769, maxLat: 14.2464276, minLng: 120.8169037, maxLng: 120.9293018 };
export const inIndang = ({ lat, lng }) => lat >= INDANG_BBOX.minLat && lat <= INDANG_BBOX.maxLat && lng >= INDANG_BBOX.minLng && lng <= INDANG_BBOX.maxLng;
