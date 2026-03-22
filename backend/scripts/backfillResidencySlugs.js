import { MongoClient } from "mongodb";
import dotenv from "dotenv";

dotenv.config();

const DATABASE_URL = process.env.DATABASE_URL;
const DATABASE_NAME = process.env.DATABASE_NAME || "CaseCentralYT";
const DRY_RUN = process.argv.includes("--dry-run");

const missingSlugConditions = [
  { slug: { $exists: false } },
  { slug: null },
  { slug: "" },
];

const missingSlugFilter = {
  $or: missingSlugConditions,
};

const slugify = (value) =>
  String(value || "")
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/-{2,}/g, "-")
    .replace(/^-+/, "")
    .replace(/-+$/, "");

const buildSlug = (residency) => {
  const base = slugify(residency?.title);
  const id = String(residency?._id || "").trim();

  if (base && id) return `${base}-${id}`;
  if (base) return base;
  if (id) return `property-${id}`;

  return "";
};

async function backfillResidencySlugs() {
  if (!DATABASE_URL) {
    throw new Error("DATABASE_URL is not set.");
  }

  const client = new MongoClient(DATABASE_URL);

  try {
    await client.connect();

    const db = client.db(DATABASE_NAME);
    const residencyCollection = db.collection("Residency");
    const totalCount = await residencyCollection.countDocuments({});

    const candidates = await residencyCollection
      .find(missingSlugFilter, { projection: { _id: 1, title: 1 } })
      .toArray();

    const writableCandidates = candidates
      .map((doc) => ({ doc, slug: buildSlug(doc) }))
      .filter((item) => Boolean(item.slug));
    const wouldUpdateCount = writableCandidates.length;

    if (DRY_RUN) {
      console.log(`dryRun: true`);
      console.log(`wouldUpdateCount: ${wouldUpdateCount}`);
      return;
    }

    if (!wouldUpdateCount) {
      console.log(`updatedCount: 0`);
      console.log(`skippedCount: ${totalCount}`);
      return;
    }

    const operations = writableCandidates.map(({ doc, slug }) => ({
      updateOne: {
        filter: { _id: doc._id, $or: missingSlugConditions },
        update: { $set: { slug } },
      },
    }));

    const result = await residencyCollection.bulkWrite(operations, {
      ordered: false,
    });

    const updatedCount = result.modifiedCount || 0;
    const skippedCount = Math.max(0, totalCount - updatedCount);

    console.log(`updatedCount: ${updatedCount}`);
    console.log(`skippedCount: ${skippedCount}`);
  } finally {
    await client.close();
  }
}

backfillResidencySlugs().catch((error) => {
  console.error("Failed to backfill residency slugs:", error.message);
  process.exit(1);
});
