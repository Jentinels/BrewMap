import test, { before, after } from "node:test";
import assert from "node:assert/strict";
import mongoose from "mongoose";
import bcrypt from "bcryptjs";
import request from "supertest";
import { MongoMemoryServer } from "mongodb-memory-server";
import { createApp } from "../src/app.js";
import { Cafe, DeliveryLink, Event, User } from "../src/models.js";

let mongod, api;
const alwaysOpen = Object.fromEntries(["mon", "tue", "wed", "thu", "fri", "sat", "sun"].map((d) => [d, { open: "00:00", close: "23:59" }]));
const near = { lat: 14.1952, lng: 120.8784 }; // Indang town center

before(async () => {
  mongod = await MongoMemoryServer.create({ instance: { launchTimeout: 60000 } });
  await mongoose.connect(mongod.getUri());
  await Promise.all(Object.values(mongoose.models).map((m) => m.init())); // build the unique and 2dsphere indexes
  api = request(createApp());
});
after(async () => {
  await mongoose.disconnect();
  await mongod.stop();
});

const register = async (name, email, role = "user") => {
  const r = await api.post("/api/auth/register").send({ name, email, password: "password123", role });
  assert.equal(r.status, 201, JSON.stringify(r.body));
  return { token: r.body.token, id: r.body.user.id };
};
const auth = (t) => ({ Authorization: `Bearer ${t}` });
const makeAdmin = async () => {
  await User.create({ name: "Admin", email: "admin@test.local", role: "admin", passwordHash: await bcrypt.hash("password123", 4) });
  const r = await api.post("/api/auth/login").send({ email: "admin@test.local", password: "password123" });
  return { token: r.body.token, id: r.body.user.id };
};

test("registration, login, and roles", async () => {
  await register("Una User", "una@test.local");
  const bad = await api.post("/api/auth/register").send({ name: "Eve", email: "eve@test.local", password: "password123", role: "admin" });
  assert.equal(bad.status, 400, "an administrator cannot be created through registration");
  assert.equal((await api.post("/api/auth/register").send({ name: "Una Two", email: "una@test.local", password: "password123" })).status, 409);
  assert.equal((await api.post("/api/auth/login").send({ email: "una@test.local", password: "wrong-password" })).status, 401);
  const ok = await api.post("/api/auth/login").send({ email: "UNA@test.local", password: "password123" });
  assert.equal(ok.status, 200);
  assert.equal((await api.get("/api/auth/me").set(auth(ok.body.token))).body.user.role, "user");
  assert.equal((await api.get("/api/auth/me")).status, 401);
});

test("a cafe is pending until the administrator approves it, and only Indang is allowed", async () => {
  const owner = await register("Olga Owner", "olga@test.local", "owner");
  const user = await register("Ula User", "ula@test.local");
  const admin = await makeAdmin();
  const body = { name: "Test Cafe", address: "Indang, Cavite", location: near, priceRange: "mid", amenities: { wifi: true } };

  assert.equal((await api.post("/api/cafes").set(auth(user.token)).send(body)).status, 403);
  assert.equal((await api.post("/api/cafes").set(auth(owner.token)).send({ ...body, location: { lat: 14.5995, lng: 120.9842 } })).status, 400, "Manila is outside Indang");
  const created = await api.post("/api/cafes").set(auth(owner.token)).send(body);
  assert.equal(created.status, 201);
  const id = created.body.id;

  assert.equal((await api.get(`/api/cafes/${id}`)).status, 404, "the public cannot see a pending cafe");
  assert.equal((await api.get(`/api/cafes/${id}`).set(auth(owner.token))).status, 200, "the owner can");
  assert.equal((await api.get("/api/cafes")).body.cafes.length, 0);

  assert.equal((await api.post(`/api/admin/cafes/${id}/decision`).set(auth(owner.token)).send({ decision: "approve" })).status, 403);
  assert.equal((await api.post(`/api/admin/cafes/${id}/decision`).set(auth(admin.token)).send({ decision: "reject" })).status, 400, "a note is needed to reject");
  await api.post(`/api/admin/cafes/${id}/decision`).set(auth(admin.token)).send({ decision: "changes", note: "Add the opening hours" }).expect(200);
  assert.equal((await api.get(`/api/cafes/${id}`).set(auth(owner.token))).body.adminNote, "Add the opening hours");

  await api.patch(`/api/cafes/${id}`).set(auth(owner.token)).send({ openingHours: alwaysOpen }).expect(200);
  assert.equal((await Cafe.findById(id)).status, "pending", "editing after a change request sends it back to the administrator");
  await api.post(`/api/admin/cafes/${id}/decision`).set(auth(admin.token)).send({ decision: "approve" }).expect(200);
  assert.equal((await api.get("/api/cafes")).body.cafes.length, 1);

  const other = await register("Oscar Owner", "oscar@test.local", "owner");
  assert.equal((await api.patch(`/api/cafes/${id}`).set(auth(other.token)).send({ name: "Hijacked" })).status, 404, "another owner cannot edit it");
});

test("search is nearest first and the filters work", async () => {
  await Cafe.deleteMany({});
  const make = (name, lat, lng, extra = {}) => Cafe.create({ name, address: "Indang", location: { type: "Point", coordinates: [lng, lat] }, status: "approved", ...extra });
  const a = await make("Alpha Cafe", 14.1953, 120.8785, { priceRange: "mid", amenities: { wifi: true, outlets: true }, openingHours: alwaysOpen });
  await make("Bravo Cafe", 14.2, 120.89, { priceRange: "low", amenities: { wifi: false }, openingHours: { mon: { open: "03:00", close: "03:01" } } });
  await make("Far Cafe", 14.23, 120.92, { priceRange: "high" }); // about 5 km away
  await DeliveryLink.create({ cafe: a._id, platform: "grab", url: "https://food.grab.com/ph/en/" });

  const all = (await api.get(`/api/cafes?lat=${near.lat}&lng=${near.lng}&radiusKm=10`)).body.cafes;
  assert.deepEqual(all.map((c) => c.name), ["Alpha Cafe", "Bravo Cafe", "Far Cafe"], "nearest first");
  assert.ok(all[0].distanceKm < all[1].distanceKm);
  assert.equal((await api.get(`/api/cafes?lat=${near.lat}&lng=${near.lng}&radiusKm=2`)).body.cafes.length, 2, "the radius excludes the far cafe");

  const names = async (qs) => (await api.get(`/api/cafes?lat=${near.lat}&lng=${near.lng}&${qs}`)).body.cafes.map((c) => c.name);
  assert.deepEqual(await names("wifi=true"), ["Alpha Cafe"]);
  assert.deepEqual(await names("outlets=true"), ["Alpha Cafe"]);
  assert.deepEqual(await names("price=low"), ["Bravo Cafe"]);
  assert.deepEqual(await names("openNow=true"), ["Alpha Cafe"]);
  assert.deepEqual(await names("delivery=grab"), ["Alpha Cafe"]);
  assert.deepEqual(await names("delivery=foodpanda"), []);
  assert.deepEqual(await names("q=brav"), ["Bravo Cafe"]);
  assert.equal((await api.get("/api/cafes?wifi=maybe")).status, 400);
  assert.equal((await api.get("/api/cafes")).body.cafes.length, 3, "works without a location too");
});

test("delivery links: validation, verification, taps, and the owner dashboard", async () => {
  await Cafe.deleteMany({});
  await DeliveryLink.deleteMany({});
  const owner = await register("Dan Owner", "dan@test.local", "owner");
  const admin = (await api.post("/api/auth/login").send({ email: "admin@test.local", password: "password123" })).body;
  const cafe = await Cafe.create({ name: "Link Cafe", address: "Indang", location: { type: "Point", coordinates: [near.lng, near.lat] }, status: "approved", owner: owner.id });
  const id = String(cafe._id);

  assert.equal((await api.put(`/api/cafes/${id}/delivery-links`).set(auth(owner.token)).send({ grab: "https://example.com/cafe" })).status, 400, "must be a Grab address");
  assert.equal((await api.put(`/api/cafes/${id}/delivery-links`).set(auth(owner.token)).send({ grab: "http://food.grab.com/ph/en/x" })).status, 400, "must be https");
  const set = await api.put(`/api/cafes/${id}/delivery-links`).set(auth(owner.token)).send({ grab: "https://food.grab.com/ph/en/restaurant/test", foodpanda: "https://www.foodpanda.ph/restaurant/test" });
  assert.equal(set.status, 200);
  assert.equal(set.body.deliveryLinks.every((l) => l.verified === false), true);

  const linkId = set.body.deliveryLinks.find((l) => l.platform === "grab").id;
  await api.post(`/api/admin/delivery-links/${linkId}/verify`).set(auth(admin.token)).send({ verified: true }).expect(200);
  assert.equal((await api.get(`/api/cafes/${id}`)).body.deliveryLinks.find((l) => l.platform === "grab").verified, true);

  const tap = await api.post(`/api/cafes/${id}/click`).send({ platform: "grab" });
  assert.equal(tap.body.url, "https://food.grab.com/ph/en/restaurant/test");
  await api.post(`/api/cafes/${id}/click`).send({ platform: "grab" }).expect(200);
  await api.post(`/api/cafes/${id}/click`).send({ platform: "foodpanda" }).expect(200);
  assert.equal(await Event.countDocuments({ cafe: id, type: "link_click" }), 3);
  await api.put(`/api/cafes/${id}/delivery-links`).set(auth(owner.token)).send({ foodpanda: null }).expect(200);
  assert.equal((await api.post(`/api/cafes/${id}/click`).send({ platform: "foodpanda" })).status, 404, "a removed link cannot be tapped");

  const dash = (await api.get(`/api/owner/cafes/${id}/dashboard`).set(auth(owner.token))).body;
  assert.equal(dash.views, 1, "the earlier detail request counted as one view");
  assert.equal(dash.linkTaps.grab, 2);
  assert.equal(dash.linkTaps.foodpanda, 1);
  assert.equal(dash.last7Days.length, 7);
  assert.equal(dash.last7Days.at(-1).grab, 2, "today's taps appear on the last day");

  const other = await register("Pam Owner", "pam@test.local", "owner");
  assert.equal((await api.get(`/api/owner/cafes/${id}/dashboard`).set(auth(other.token))).status, 404);
  const overview = (await api.get("/api/admin/overview").set(auth(admin.token))).body;
  assert.equal(overview.mostClicked[0].name, "Link Cafe");
  assert.equal(overview.mostClicked[0].total, 3);
});

test("reviews wait for the administrator, favorites, announcements, and account control", async () => {
  await Cafe.deleteMany({});
  const owner = await register("Rae Owner", "rae@test.local", "owner");
  const fan = await register("Fay Fan", "fay@test.local");
  const admin = (await api.post("/api/auth/login").send({ email: "admin@test.local", password: "password123" })).body;
  const cafe = await Cafe.create({ name: "Review Cafe", address: "Indang", location: { type: "Point", coordinates: [near.lng, near.lat] }, status: "approved", owner: owner.id });
  const id = String(cafe._id);

  assert.equal((await api.post(`/api/cafes/${id}/reviews`).send({ rating: 5 })).status, 401);
  assert.equal((await api.post(`/api/cafes/${id}/reviews`).set(auth(fan.token)).send({ rating: 6 })).status, 400);
  assert.equal((await api.post(`/api/cafes/${id}/reviews`).set(auth(owner.token)).send({ rating: 5 })).status, 403, "no reviewing your own cafe");
  const r = await api.post(`/api/cafes/${id}/reviews`).set(auth(fan.token)).send({ rating: 4, comment: "Quiet and warm" });
  assert.equal(r.body.status, "pending");
  await api.post(`/api/cafes/${id}/reviews`).set(auth(fan.token)).send({ rating: 5, comment: "Even better" }).expect(201); // updates, not a second review
  assert.equal((await api.get(`/api/cafes/${id}`)).body.reviews.length, 0, "not shown before approval");

  const pending = (await api.get("/api/admin/reviews").set(auth(admin.token))).body.reviews;
  assert.equal(pending.length, 1);
  await api.post(`/api/admin/reviews/${pending[0].id}/decision`).set(auth(admin.token)).send({ decision: "approve" }).expect(200);
  const detail = (await api.get(`/api/cafes/${id}`).set(auth(fan.token))).body;
  assert.equal(detail.reviews.length, 1);
  assert.equal(detail.ratingAvg, 5);
  assert.equal(detail.ratingCount, 1);

  await api.put(`/api/favorites/${id}`).set(auth(fan.token)).expect(204);
  await api.put(`/api/favorites/${id}`).set(auth(fan.token)).expect(204); // idempotent
  assert.equal((await api.get("/api/favorites").set(auth(fan.token))).body.cafes.length, 1);
  assert.equal((await api.get(`/api/cafes/${id}`).set(auth(fan.token))).body.isFavorite, true);
  await api.delete(`/api/favorites/${id}`).set(auth(fan.token)).expect(204);
  assert.equal((await api.get("/api/favorites").set(auth(fan.token))).body.cafes.length, 0);

  assert.equal((await api.post(`/api/cafes/${id}/announcements`).set(auth(fan.token)).send({ title: "Hello" })).status, 404);
  await api.post(`/api/cafes/${id}/announcements`).set(auth(owner.token)).send({ title: "Free cookie Friday" }).expect(201);
  assert.equal((await api.get(`/api/cafes/${id}`)).body.announcements[0].title, "Free cookie Friday");

  assert.equal((await api.get("/api/admin/overview").set(auth(fan.token))).status, 403);
  await api.patch(`/api/admin/users/${fan.id}`).set(auth(admin.token)).send({ disabled: true }).expect(200);
  assert.equal((await api.get("/api/auth/me").set(auth(fan.token))).status, 401, "a disabled account stops working at once");
  assert.equal((await api.post("/api/auth/login").send({ email: "fay@test.local", password: "password123" })).status, 401);
  assert.equal((await api.patch(`/api/admin/users/${admin.id}`).set(auth(admin.token)).send({ disabled: true })).status, 400, "an administrator cannot disable themselves");
});
