// Run the API without MongoDB Atlas: starts a temporary in-memory MongoDB, loads the demo data, and serves the API.
// Everything is lost when you stop it. Use `npm run dev` with an Atlas connection string for data that stays.
import { MongoMemoryServer } from "mongodb-memory-server";

const db = await MongoMemoryServer.create({ instance: { launchTimeout: 60000 } });
process.env.MONGODB_URI = `${db.getUri()}brewmap`;
process.argv.push("--demo");
await import("./seed.js");
await import("./index.js");
process.on("SIGINT", async () => { await db.stop(); process.exit(0); });
