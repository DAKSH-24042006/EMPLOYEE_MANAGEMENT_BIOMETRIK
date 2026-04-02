const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");

async function seed() {
  const MONGODB_URI = "mongodb://localhost:27017/requirement-dashboard";
  await mongoose.connect(MONGODB_URI);
  
  const UserSchema = new mongoose.Schema({
    username: String,
    password: { type: String, select: false },
    role: String
  });
  const User = mongoose.models.User || mongoose.model("User", UserSchema);

  const ProjectSchema = new mongoose.Schema({
    clientDetails: { companyName: String, email: String },
    features: mongoose.Schema.Types.Mixed,
    status: String,
    timeline: { startDate: Date, endDate: Date },
    createdBy: mongoose.Schema.Types.ObjectId
  });
  const Project = mongoose.models.Project || mongoose.model("Project", ProjectSchema);

  // Clear 
  await User.deleteMany({});
  await Project.deleteMany({});

  const hashedPassword = await bcrypt.hash("admin123", 10);
  const user = await User.create({
    username: "admin",
    emailid: "admin@biometrik.com"
    password: hashedPassword,
    role: "ADMIN"
  });

  await Project.create({
    clientDetails: { companyName: "Biometrik Systems", email: "info@biometrik.in" },
    features: {
      visitorManagement: true,
      attendanceManagement: true,
      webApp: true,
      adminPanel: true,
      cloud: true
    },
    status: "Active",
    timeline: { startDate: new Date(), endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) },
    createdBy: user._id
  });

  console.log("Seeded database with admin/admin123 and one project.");
  process.exit(0);
}

seed().catch(err => {
  console.error(err);
  process.exit(1);
});
