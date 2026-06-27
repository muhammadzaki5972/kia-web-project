require('dotenv').config();
const { db } = require('./api/db.js');
async function query() {
  const result = await db.execute('SELECT * FROM data_perkara LIMIT 1');
  console.log("DATA:", result.rows[0]);
  const result2 = await db.execute('SELECT * FROM detail_perkara LIMIT 1');
  console.log("DETAIL:", result2.rows[0]);
}
query();
