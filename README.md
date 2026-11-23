# BrewMap

A mobile-based cafe discovery and management system for cafes in Indang, Cavite. Users find cafes on a map, filter them by Wi-Fi, power outlets, quiet or study-friendly space, opening hours, price range, and delivery availability, and open a cafe's Grab or foodpanda page with one tap. Cafe owners manage their own listings, and an administrator approves cafes and verifies delivery links. BrewMap does not take orders or payments.

```
server/   Express REST API, MongoDB (Mongoose), JWT login with role-based access
app/      Expo React Native app (React Navigation), 14 screens in three flows
```

## Run it

You need Node.js 22.13 or later, a MongoDB Atlas free cluster, and the Expo Go app on your phone (phone and computer on the same Wi-Fi).

**1. API**

```powershell
cd server
npm install
copy .env.example .env      # then fill in MONGODB_URI and JWT_SECRET
npm run seed:demo           # 10 real Indang cafes from OpenStreetMap, 3 labeled demo cafes, and 3 demo accounts
npm run dev                 # http://localhost:4000
```

`npm run seed` loads only the real cafes (names and locations from OpenStreetMap) and the accounts. `npm run seed:demo` adds three clearly labeled sample cafes ("Sample Cafe A (demo)") with made-up amenities, hours, and Grab and foodpanda home-page links, so the filters and the handoff can be shown. Running either script again keeps existing data. The demo accounts are `admin@brewmap.test`, `owner@brewmap.test`, and `user@brewmap.test`, with the password in `SEED_PASSWORD` (development only).

**2. App**

```powershell
cd app
npm install
npx expo start
```

Scan the QR code with Expo Go. The app finds the API on the same computer (port 4000). To use another server, set `EXPO_PUBLIC_API_URL` (see `app/.env.example`). If the phone cannot reach the computer, allow Node.js through the Windows firewall for private networks.

## Test

```powershell
cd server
npm test        # 8 tests: roles, approval flow, nearby search and filters, delivery links, taps, dashboard, reviews, favorites
```

The tests start an in-memory MongoDB, so they need no Atlas connection (the first run downloads a MongoDB binary of about 100 MB).

## What works

| Screen | |
|---|---|
| 01 Welcome / Log in | log in, create account (cafe-goer or cafe owner), continue as guest |
| 02 Explore | OpenStreetMap map, nearby cafe cards, search, distance, open now |
| 03 Filters | Wi-Fi, power outlets, quiet or study-friendly, open now, price range, delivery |
| 04 Cafe profile | details, hours, reviews, announcements, favorite |
| 05 and 06 Grab and foodpanda handoff | records the tap, then opens the cafe's page (app if installed, browser if not) |
| 07 Write review | saved as pending until the administrator approves it |
| 08 Favorites | saved cafes |
| 09 Dashboard | profile views, link taps, favorites, rating, 7-day taps |
| 10 Edit cafe info | register or edit the cafe; a new cafe waits for approval |
| 11 Delivery links | add, test, and update the Grab and foodpanda links |
| 12 New announcement | publish an announcement or promo |
| 13 Admin overview | counts, pending approvals, most-clicked links |
| 14 Review cafe | checklist, link check and verification, approve, request changes, reject |

Rules the API enforces: only cafes inside the Indang boundary can be registered, a cafe is public only after approval, a delivery link must be an https link on grab.com or foodpanda.ph/.com and must be verified again after a change, a disabled account stops working at once, and an administrator cannot be created through registration.

## Not built yet

These are the planned later features, and some pieces of the Chapter 1 requirements that are not in this first version:

- cafe photo upload (expo-image-picker and Cloudinary), push notifications, password recovery by email;
- an administrator screen for review moderation and for managing users (the API for both already exists);
- deployment of the API to Render and an EAS build.

## Notes

- The cafe listings from OpenStreetMap have a name and a location only. Their amenities, hours, and prices are not invented; they stay "not declared" until an owner declares them.
- The public OpenStreetMap tile server is meant for light use. For heavy use, switch to a tile provider that allows it.
- The brand colors in `app/src/theme.js` are close matches to the Figma prototype; change them there if the Figma variables differ.
- This folder is inside OneDrive. `node_modules` has thousands of files, so consider moving the project outside OneDrive or pausing sync while you run `npm install`.
