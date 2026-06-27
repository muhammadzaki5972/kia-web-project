require('dotenv').config();
const { db } = require('./api/db.js');
async function query() {
  const result = await db.execute('SELECT * FROM data_perkara LIMIT 1');
  console.log(result.rows);
}
query();
