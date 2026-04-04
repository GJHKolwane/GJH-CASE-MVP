import pool from "./src/config/db.js";

async function testDB() {
  try {
    const res = await pool.query("SELECT NOW()");
    console.log("✅ DB Connected:", res.rows[0]);
  } catch (err) {
    console.error("❌ DB Error:", err.message);
  } finally {
    process.exit();
  }
}

testDB();
