require('dotenv').config();
console.log("URL:", process.env.TURSO_DATABASE_URL);
const { db } = require('./api/db.js');
async function run() {
  try {
    await db.execute('ALTER TABLE detail_perkara ADD COLUMN kehadiran_pihak TEXT');
    console.log("Column added!");
  } catch(e) {
    console.log(e.message);
  }
}
run();
