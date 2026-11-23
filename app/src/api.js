import axios from "axios";
import { API_URL } from "./config";

export const http = axios.create({ baseURL: `${API_URL}/api`, timeout: 15000 });

let token = null;
export const setToken = (t) => { token = t; };
http.interceptors.request.use((config) => {
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// The text to show the user when a request fails.
export function errorMessage(e) {
  if (e?.response) {
    const d = e.response.data;
    if (d?.issues?.length) return d.issues.map((i) => (i.path ? `${i.path}: ${i.message}` : i.message)).join("\n");
    return d?.error || `The server answered with an error (${e.response.status}).`;
  }
  return `Cannot reach the BrewMap server at ${API_URL}. Check that the API is running and that your phone is on the same Wi-Fi.`;
}

const data = (p) => p.then((r) => r.data);

export const api = {
  register: (body) => data(http.post("/auth/register", body)),
  login: (body) => data(http.post("/auth/login", body)),
  me: () => data(http.get("/auth/me")),

  cafes: (params) => data(http.get("/cafes", { params })),
  cafe: (id) => data(http.get(`/cafes/${id}`)),
  tapLink: (id, platform) => data(http.post(`/cafes/${id}/click`, { platform })),
  review: (id, body) => data(http.post(`/cafes/${id}/reviews`, body)),
  favorites: () => data(http.get("/favorites")),
  addFavorite: (id) => http.put(`/favorites/${id}`),
  removeFavorite: (id) => http.delete(`/favorites/${id}`),

  ownerCafes: () => data(http.get("/owner/cafes")),
  dashboard: (id) => data(http.get(`/owner/cafes/${id}/dashboard`)),
  createCafe: (body) => data(http.post("/cafes", body)),
  updateCafe: (id, body) => data(http.patch(`/cafes/${id}`, body)),
  setLinks: (id, body) => data(http.put(`/cafes/${id}/delivery-links`, body)),
  announce: (id, body) => data(http.post(`/cafes/${id}/announcements`, body)),

  adminOverview: () => data(http.get("/admin/overview")),
  decideCafe: (id, body) => data(http.post(`/admin/cafes/${id}/decision`, body)),
  verifyLink: (id, body) => data(http.post(`/admin/delivery-links/${id}/verify`, body)),
};
