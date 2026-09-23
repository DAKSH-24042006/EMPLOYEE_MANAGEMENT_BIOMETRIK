const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

require('dotenv').config();
const MONGODB_URI = process.env.MONGODB_URI || "mongodb://localhost:27017/requirement_dashboard";

async function checkAdmin() {
  await mongoose.connect(MONGODB_URI);
  console.log("Connected to MongoDB");

  const db = mongoose.connection.db;
  const users = await db.collection('users').find({}).toArray();
  
  console.log("Found " + users.length + " users.");
  for (const user of users) {
    console.log(`Username: ${user.username}, Email: ${user.email}, Role: ${user.role}, Status: ${user.status}`);
    
    // Test if password is 'admin123'
    if (user.password) {
      const isMatch = await bcrypt.compare('admin123', user.password);
      console.log(`Password is 'admin123': ${isMatch}`);
    } else {
      console.log("No password set.");
    }
    console.log("---");
  }

  process.exit(0);
}

checkAdmin().catch(console.error);
