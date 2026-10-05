const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");

require("dotenv").config({ path: ".env.local" });
require("dotenv").config();
let MONGODB_URI = process.env.MONGODB_URI || "mongodb://127.0.0.1:27017/requirement_dashboard";
MONGODB_URI = MONGODB_URI.replace("localhost", "127.0.0.1");

async function checkAdmin() {
  console.log("Connecting to:", MONGODB_URI);
  await mongoose.connect(MONGODB_URI, { serverSelectionTimeoutMS: 5000 });
  console.log("Connected to MongoDB");

  const db = mongoose.connection.db;
  const users = await db.collection("users").find({}).toArray();

  console.log("Found " + users.length + " users.");
  for (const user of users) {
    console.log(
      `Username: ${user.username}, Email: ${user.email}, Role: ${user.role}, Status: ${user.status}`
    );

    // Test if password is 'admin123'
    if (user.password) {
      const candidates = ["admin@123", "admin123", "admin", "password", "Admin@123"];
      for (const candidate of candidates) {
        const isMatch = await bcrypt.compare(candidate, user.password);
        if (isMatch) {
          console.log(`>>> Verified password is: '${candidate}'`);
        }
      }
    } else {
      console.log("No password set.");
    }
    console.log("---");
  }

  process.exit(0);
}

checkAdmin().catch(console.error);
