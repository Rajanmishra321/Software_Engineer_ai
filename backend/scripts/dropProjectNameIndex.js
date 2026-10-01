/**
 * One-off migration: removes the old unique index on project names.
 *
 * Project names used to be globally unique, so a name taken by one user
 * blocked everyone else. Dropping the schema rule isn't enough - the index
 * already exists in MongoDB and keeps rejecting duplicates.
 *
 * Run once per database (local and production):  node scripts/dropProjectNameIndex.js
 * Safe to re-run: it reports when there's nothing to drop.
 */
import "dotenv/config";
import mongoose from "mongoose";
import Project from "../models/projectModel.js";

const INDEX_NAME = "name_1";

const run = async () => {
  await mongoose.connect(process.env.MONGODB_URI);

  const indexes = await Project.collection.indexes();
  const hasIndex = indexes.some((index) => index.name === INDEX_NAME);

  if (hasIndex) {
    await Project.collection.dropIndex(INDEX_NAME);
    console.log(`Dropped the unique index on project names (${INDEX_NAME}).`);
  } else {
    console.log("No unique index on project names - nothing to do.");
  }

  await mongoose.disconnect();
};

run().catch(async (error) => {
  console.error("Migration failed:", error.message);
  await mongoose.disconnect();
  process.exitCode = 1;
});
