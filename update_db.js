const mongoose = require('mongoose');

async function update() {
  await mongoose.connect('mongodb://localhost:27017/requirement_dashboard');
  const db = mongoose.connection;
  const collection = db.collection('emailconfigs');
  
  await collection.updateOne({}, {
    $set: {
      smtpHost: "smtp.office365.com",
      smtpUser: "notifications@biometrik.in",
      smtpPass: "aayush@123",
      fromEmail: "notifications@biometrik.in",
      fromName: "Biometrik Systems Notifications"
    }
  });
  console.log("Updated config successfully");
  process.exit(0);
}

update().catch(console.error);
