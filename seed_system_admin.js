const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
require("dotenv").config();

const MONGODB_URI = process.env.MONGODB_URI || "mongodb://localhost:27017/requirement_dashboard";
const SYSTEM_ADMIN_EMAIL = (process.env.SYSTEM_ADMIN_EMAIL || "admin@biometrik.in").toLowerCase().trim();
const ADMIN_USERNAME = process.env.SYSTEM_ADMIN_USERNAME || "admin";
const ADMIN_PASSWORD = process.env.SYSTEM_ADMIN_PASSWORD || "admin123";

async function seedSystemAdmin() {
  try {
    console.log("Connecting to MongoDB at:", MONGODB_URI);
    await mongoose.connect(MONGODB_URI);
    console.log("Connected successfully.");

    const dbUsers = mongoose.connection.db.collection("users");
    const hashedPassword = await bcrypt.hash(ADMIN_PASSWORD, 10);

    console.log(`Checking System Admin for username: ${ADMIN_USERNAME} or email: ${SYSTEM_ADMIN_EMAIL}...`);
    const existing = await dbUsers.findOne({
      $or: [
        { username: ADMIN_USERNAME },
        { email: SYSTEM_ADMIN_EMAIL },
        { microsoftEmail: SYSTEM_ADMIN_EMAIL }
      ]
    });

    if (existing) {
      console.log(`User found (ID: ${existing._id}). Ensuring username=${ADMIN_USERNAME}, role=SYSTEM_ADMIN, status=ACTIVE, and updated password...`);
      await dbUsers.updateOne(
        { _id: existing._id },
        {
          $set: {
            username: ADMIN_USERNAME,
            password: hashedPassword,
            role: "SYSTEM_ADMIN",
            status: "ACTIVE",
            name: existing.name || "System Administrator",
            email: existing.email || SYSTEM_ADMIN_EMAIL,
            designation: existing.designation || "System Administrator",
            updatedAt: new Date()
          }
        }
      );
      console.log(`System Admin updated successfully with username '${ADMIN_USERNAME}' and the password from .env!`);
    } else {
      console.log("No existing user found. Creating dedicated System Admin...");
      const newAdmin = {
        name: "System Administrator",
        username: ADMIN_USERNAME,
        email: SYSTEM_ADMIN_EMAIL,
        password: hashedPassword,
        designation: "System Administrator",
        role: "SYSTEM_ADMIN",
        status: "ACTIVE",
        createdAt: new Date(),
        updatedAt: new Date()
      };

      const res = await dbUsers.insertOne(newAdmin);
      console.log("System Admin created with ID:", res.insertedId, `Username: ${ADMIN_USERNAME}, Password: [HIDDEN]`);
    }
  } catch (error) {
    console.error("System Admin seeding failed:", error);
  } finally {
    await mongoose.disconnect();
    console.log("Disconnected from MongoDB.");
  }
}

seedSystemAdmin();
