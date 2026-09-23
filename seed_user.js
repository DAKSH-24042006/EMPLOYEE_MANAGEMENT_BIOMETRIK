const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");

require('dotenv').config();
const MONGODB_URI = process.env.MONGODB_URI || "mongodb://localhost:27017/requirement_dashboard";

async function seed() {
  try {
    console.log("Connecting to MongoDB...");
    await mongoose.connect(MONGODB_URI);
    console.log("Connected successfully.");

    const email = "aniket@biometrik.in";
    const password = "123456789";

    // Delete existing user if any
    await mongoose.connection.db.collection("users").deleteOne({ email });

    const hashedPassword = await bcrypt.hash(password, 10);
    const user = {
      name: "Aniket Bhattacharya",
      email,
      password: hashedPassword,
      role: "ADMIN",
      phoneNumber: "1234567890",
      location: "Kolkata, India",
      createdAt: new Date(),
      updatedAt: new Date()
    };

    const res = await mongoose.connection.db.collection("users").insertOne(user);
    console.log("User inserted successfully:", res.insertedId);
  } catch (error) {
    console.error("Seeding failed:", error);
  } finally {
    await mongoose.disconnect();
    console.log("Disconnected.");
  }
}

seed();
