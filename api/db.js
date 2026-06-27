const { createClient } = require("@libsql/client/web");

const db = createClient({
  url: process.env.TURSO_DATABASE_URL || "libsql://localhost:8080", 
  authToken: process.env.TURSO_AUTH_TOKEN || "",
});

module.exports = { db };
