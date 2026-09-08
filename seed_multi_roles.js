const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");

const MONGODB_URI = "mongodb://localhost:27017/requirement_dashboard";

const usersToSeed = [
  {
    name: "Aniket Admin",
    email: "aniket@biometrik.in",
    role: "ADMIN",
    phoneNumber: "1234567890",
    location: "Kolkata, India",
  },
  {
    name: "Sales Representative",
    email: "sales@biometrik.in",
    role: "SALES_TEAM",
    phoneNumber: "2234567890",
    location: "Mumbai, India",
  },
  {
    name: "Tech Engineer",
    email: "tech@biometrik.in",
    role: "TECH_TEAM",
    phoneNumber: "3234567890",
    location: "Bengaluru, India",
  },
  {
    name: "Tech Manager",
    email: "techmanager@biometrik.in",
    role: "TECH_MANAGER",
    phoneNumber: "4234567890",
    location: "Delhi, India",
  },
];

async function seed() {
  try {
    console.log("Connecting to MongoDB...");
    await mongoose.connect(MONGODB_URI);
    console.log("Connected successfully.");

    const dbUsers = mongoose.connection.db.collection("users");

    for (const u of usersToSeed) {
      console.log(`Processing user: ${u.email}...`);
      await dbUsers.deleteOne({ email: u.email });

      const hashedPassword = await bcrypt.hash("123456789", 10);
      const userDoc = {
        ...u,
        password: hashedPassword,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const res = await dbUsers.insertOne(userDoc);
      console.log(`User seeded: ${u.name} with ID: ${res.insertedId}`);
    }
  } catch (error) {
    console.error("Seeding failed:", error);
  } finally {
    await mongoose.disconnect();
    console.log("Disconnected.");
  }
}

seed();
