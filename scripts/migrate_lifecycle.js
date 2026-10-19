const mongoose = require("mongoose");
require("dotenv").config({ path: ".env.local" });

const uri = process.env.MONGODB_URI || "mongodb://127.0.0.1:27017/requirement_dashboard";

async function migrate() {
  await mongoose.connect(uri);
  console.log("Connected to MongoDB for lifecycle status migration...");

  const projectsCollection = mongoose.connection.collection("projects");

  // 1. In Progress
  const r1 = await projectsCollection.updateMany(
    {
      status: {
        $in: [
          "Requirement Created",
          "Submitted for Tech Review",
          "Technically Approved",
          "Planning",
          "Development",
          "Active",
        ],
      },
    },
    { $set: { status: "In Progress" } }
  );

  // 2. On Hold (Backlogged)
  const r2 = await projectsCollection.updateMany(
    {
      status: {
        $in: ["Clarification Required", "Pending", "Closed"],
      },
    },
    { $set: { status: "On Hold (Backlogged)" } }
  );

  // 3. In Testing
  const r3 = await projectsCollection.updateMany(
    {
      status: {
        $in: ["Testing/UAT", "Signoff Pending"],
      },
    },
    { $set: { status: "In Testing" } }
  );

  // 4. Live / Deployed
  const r4 = await projectsCollection.updateMany(
    {
      status: {
        $in: ["Delivered", "Completed"],
      },
    },
    { $set: { status: "Live / Deployed" } }
  );

  console.log("Migration summary:");
  console.log("- In Progress:", r1.modifiedCount);
  console.log("- On Hold (Backlogged):", r2.modifiedCount);
  console.log("- In Testing:", r3.modifiedCount);
  console.log("- Live / Deployed:", r4.modifiedCount);

  const distinct = await projectsCollection.distinct("status");
  console.log("Current distinct statuses:", distinct);

  await mongoose.disconnect();
}

migrate().catch((err) => {
  console.error("Migration failed:", err);
  process.exit(1);
});
