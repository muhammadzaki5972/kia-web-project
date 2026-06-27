// Load environment variables for local testing if needed
require('dotenv').config();

const { google } = require('googleapis');
const bcrypt = require('bcrypt');
const { db } = require('./db');

const auth = new google.auth.GoogleAuth({
  credentials: {
    client_email: process.env.GOOGLE_CLIENT_EMAIL,
    private_key: process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
  },
  scopes: ['https://www.googleapis.com/auth/spreadsheets'],
});

const sheets = google.sheets({ version: 'v4', auth });
const SPREADSHEET_ID = process.env.SPREADSHEET_ID;

const fs = require('fs');
const path = require('path');

async function runSeed() {
  console.log('Memulai migrasi dari Google Sheets ke Turso...');

  try {
    // 0. Buat tabel jika belum ada
    console.log('Membuat tabel (jika belum ada)...');
    const schemaPath = path.join(__dirname, 'schema.sql');
    const schemaSql = fs.readFileSync(schemaPath, 'utf8');
    
    // Turso / libsql-client execute doesn't support multiple statements in one call easily if separated by semicolons,
    // so we split by ';' and execute them one by one.
    const statements = schemaSql.split(';').map(s => s.trim()).filter(s => s.length > 0);
    for (const stmt of statements) {
        await db.execute(stmt);
    }
    console.log('✅ Tabel berhasil dibuat/diverifikasi.');

    // 1. Setup Admin Account
    console.log('Setup admin account...');
    const adminPasswordHash = await bcrypt.hash('admin123', 12);
    
    // Check if admin exists
    const adminCheck = await db.execute("SELECT id FROM users WHERE username = 'admin'");
    if (adminCheck.rows.length === 0) {
      await db.execute({
        sql: "INSERT INTO users (username, password_hash, role) VALUES (?, ?, ?)",
        args: ['admin', adminPasswordHash, 'admin']
      });
      console.log('✅ Akun admin default berhasil dibuat.');
    } else {
      console.log('⚠️ Akun admin sudah ada, skip pembuatan akun.');
    }

    if (!SPREADSHEET_ID) {
      console.log('⚠️ SPREADSHEET_ID tidak ditemukan, skip migrasi data dari Google Sheets.');
      return;
    }

    // 2. Fetch data from Google Sheets
    console.log('Mengambil data dari Google Sheets...');
    const [resPerkara, resDetail, resUpdate] = await Promise.all([
      sheets.spreadsheets.values.get({ spreadsheetId: SPREADSHEET_ID, range: 'DataPerkara!A:G' }).catch(() => ({ data: { values: [] } })),
      sheets.spreadsheets.values.get({ spreadsheetId: SPREADSHEET_ID, range: 'detail!A:Q' }).catch(() => ({ data: { values: [] } })),
      sheets.spreadsheets.values.get({ spreadsheetId: SPREADSHEET_ID, range: 'update_data!A:A' }).catch(() => ({ data: { values: [] } }))
    ]);

    const perkaraRows = resPerkara.data.values || [];
    const detailRows = resDetail.data.values || [];
    const updateRows = resUpdate.data.values || [];

    if (perkaraRows.length <= 1) {
      console.log('Tidak ada data perkara untuk dimigrasi.');
      return;
    }

    // 3. Insert into Turso
    console.log(`Memulai insert ${perkaraRows.length - 1} baris data ke Turso...`);
    
    for (let i = 1; i < perkaraRows.length; i++) {
      const p = perkaraRows[i];
      if (!p || !p[0]) continue;
      const id = p[0];

      // Insert ke data_perkara
      try {
        await db.execute({
          sql: `INSERT INTO data_perkara (id, pemohon, termohon, status_sengketa, isu_sengketa, col_f, col_g) VALUES (?, ?, ?, ?, ?, ?, ?)`,
          args: [id, p[1] || null, p[2] || null, p[3] || null, p[4] || null, p[5] || null, p[6] || null]
        });
      } catch (e) {
        if (!e.message.includes('UNIQUE constraint failed')) {
           console.error(`Gagal insert perkara ID ${id}:`, e.message);
        }
      }

      // Cari detail yang sesuai
      const d = detailRows.find(row => row[0] === id);
      const updated_at = (updateRows[i] && updateRows[i][0]) ? updateRows[i][0] : null;

      if (d) {
        try {
          await db.execute({
            sql: `INSERT INTO detail_perkara (
              id, tgl_register, ketua_majelis, anggota_1, anggota_2, mediator, panitera_pengganti, 
              status_sengketa, isu_sengketa, nomor_putusan, tgl_diputuskan, link_putusan, isi_permohonan, 
              tgl_sidang_sebelumnya, agenda_sidang_sebelumnya, tgl_sidang_selanjutnya, agenda_sidang_selanjutnya, 
              view_count, updated_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            args: [
              id, d[1] || null, d[2] || null, d[3] || null, d[4] || null, d[5] || null, d[6] || null,
              d[7] || null, d[8] || null, d[9] || null, d[10] || null, d[11] || null, d[12] || null,
              d[13] || null, d[14] || null, d[15] || null, d[16] || null, 
              d[17] ? parseInt(d[17]) : 0, updated_at
            ]
          });
        } catch (e) {
          if (!e.message.includes('UNIQUE constraint failed')) {
             console.error(`Gagal insert detail ID ${id}:`, e.message);
          }
        }
      }
    }

    console.log('✅ Migrasi selesai!');
  } catch (error) {
    console.error('❌ Terjadi kesalahan saat migrasi:', error);
  }
}

runSeed();
