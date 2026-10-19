/**
 * Safe Migration Script: Personal Projects
 *
 * Inspects legacy pinnedProjects in the User collection.
 * For each valid pin (where the user has a valid membership or is SYSTEM_ADMIN),
 * creates a PersonalProject record if not already present.
 * Unsets the obsolete pinnedProjects field on User documents.
 */

const mongoose = require("mongoose");
const path = require("path");
require("dotenv").config({ path: path.resolve(__dirname, "../.env") });

const MONGODB_URI = process.env.MONGODB_URI || "mongodb://localhost:27017/biometrik";

// Safe by default: pass --apply to actually write changes.
const APPLY = process.argv.includes("--apply");

async function migrate() {
  console.log(APPLY ? "Mode: APPLY (writing changes)" : "Mode: DRY RUN (pass --apply to write)");
  console.log("Connecting to MongoDB...");
  await mongoose.connect(MONGODB_URI);
  console.log("Connected to MongoDB.");

  const db = mongoose.connection.db;
  const usersCollection = db.collection("users");
  const projectsCollection = db.collection("projects");
  const personalProjectsCollection = db.collection("personalprojects");

  // Create unique index on personalprojects
  if (APPLY) {
    await personalProjectsCollection.createIndex({ user: 1, project: 1 }, { unique: true });
  }

  const usersWithPinned = await usersCollection
    .find({ pinnedProjects: { $exists: true, $not: { $size: 0 } } })
    .toArray();

  console.log(`Found ${usersWithPinned.length} users with legacy pinnedProjects.`);

  let migratedCount = 0;
  let skippedCount = 0;

  for (const user of usersWithPinned) {
    const isSystemAdmin = user.role === "SYSTEM_ADMIN";
    const userId = user._id;
    let hadError = false;

    for (const rawProjId of user.pinnedProjects) {
      if (!rawProjId) continue;
      const projId =
        typeof rawProjId === "string" ? new mongoose.Types.ObjectId(rawProjId) : rawProjId;

      const project = await projectsCollection.findOne({ _id: projId });
      if (!project) {
        skippedCount++;
        continue;
      }

      // Check membership if not System Admin
      let isEligible = isSystemAdmin;
      if (!isEligible) {
        const uIdStr = String(userId);
        const isPM = project.techOwner && String(project.techOwner) === uIdStr;
        const isPO = project.productOwner && String(project.productOwner) === uIdStr;
        const isQA = project.qaLead && String(project.qaLead) === uIdStr;
        const isDev =
          Array.isArray(project.techTeamMembers) &&
          project.techTeamMembers.some((m) => String(m) === uIdStr);

        isEligible = Boolean(isPM || isPO || isQA || isDev);
      }

      if (isEligible) {
        if (!APPLY) {
          migratedCount++;
          continue;
        }
        try {
          await personalProjectsCollection.updateOne(
            { user: userId, project: projId },
            {
              $setOnInsert: {
                user: userId,
                project: projId,
                createdAt: new Date(),
                updatedAt: new Date(),
              },
            },
            { upsert: true }
          );
          migratedCount++;
        } catch (err) {
          if (err && err.code === 11000) {
            // Already migrated (duplicate) - safe to ignore
            migratedCount++;
          } else {
            hadError = true;
            console.error(`Failed to migrate pin for user ${userId}, project ${projId}:`, err);
          }
        }
      } else {
        skippedCount++;
      }
    }

    // Safely unset legacy field only after every pin for this user was handled
    if (APPLY && !hadError) {
      await usersCollection.updateOne({ _id: userId }, { $unset: { pinnedProjects: "" } });
    }
  }

  console.log(`Migration completed: ${migratedCount} migrated, ${skippedCount} skipped.`);
  await mongoose.disconnect();
}

if (require.main === module) {
  migrate().catch((err) => {
    console.error("Migration error:", err);
    process.exit(1);
  });
}

module.exports = { migrate };
