import Database from "better-sqlite3";
import path from "path";
import { fileURLToPath } from "url";
import { dirname } from "path";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Open database
const dbPath = path.join(__dirname, "database.db");
const db = new Database(dbPath);

console.log("🔄 Adding new fields to leads table...");

try {
  db.exec(`ALTER TABLE leads ADD COLUMN first_name TEXT;`);
  console.log("✅ Added first_name column");
} catch (error) {
  if (!error.message.includes("duplicate column")) {
    console.error("❌ Error adding first_name:", error.message);
  }
}

try {
  db.exec(`ALTER TABLE leads ADD COLUMN last_name TEXT;`);
  console.log("✅ Added last_name column");
} catch (error) {
  if (!error.message.includes("duplicate column")) {
    console.error("❌ Error adding last_name:", error.message);
  }
}

try {
  db.exec(`ALTER TABLE leads ADD COLUMN business_name TEXT;`);
  console.log("✅ Added business_name column");
} catch (error) {
  if (!error.message.includes("duplicate column")) {
    console.error("❌ Error adding business_name:", error.message);
  }
}

try {
  db.exec(`ALTER TABLE leads ADD COLUMN business_field TEXT;`);
  console.log("✅ Added business_field column");
} catch (error) {
  if (!error.message.includes("duplicate column")) {
    console.error("❌ Error adding business_field:", error.message);
  }
}

db.close();
console.log("✅ Migration completed!");
