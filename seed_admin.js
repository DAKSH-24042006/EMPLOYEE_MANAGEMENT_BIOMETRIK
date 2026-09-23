const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

require('dotenv').config();
const MONGODB_URI = process.env.MONGODB_URI || "mongodb://localhost:27017/requirement_dashboard";

async function seedAdmin() {
  await mongoose.connect(MONGODB_URI);
  console.log("Connected to MongoDB");

  const db = mongoose.connection.db;
  
  const existingAdmin = await db.collection('users').findOne({ username: 'admin' });
  if (existingAdmin) {
    console.log("Admin user already exists.");
  } else {
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash('admin123', salt);
    
    await db.collection('users').insertOne({
      username: 'admin',
      email: 'admin@biometrik.in',
      password: hashedPassword,
      name: 'System Admin',
      role: 'SYSTEM_ADMIN',
      status: 'ACTIVE',
      createdAt: new Date(),
      updatedAt: new Date()
    });
    console.log("Admin user created successfully with username 'admin' and password 'admin123'.");
  }

  process.exit(0);
}

seedAdmin().catch(console.error);
