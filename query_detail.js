require('dotenv').config();
const { db } = require('./api/db.js');
async function query() {
  const result = await db.execute("SELECT * FROM detail_perkara WHERE id = '001/I/KIA/2026'");
  console.log(result.rows);
}
query();
