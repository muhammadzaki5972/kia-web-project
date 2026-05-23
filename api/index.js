const express = require('express');
const cors = require('cors');
const { google } = require('googleapis');

const app = express();
app.use(cors());
app.use(express.json());

// Konfigurasi Autentikasi Google Sheets
const auth = new google.auth.GoogleAuth({
  credentials: {
    client_email: process.env.GOOGLE_CLIENT_EMAIL,
    private_key: process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
  },
  scopes: ['https://www.googleapis.com/auth/spreadsheets'],
});

const sheets = google.sheets({ version: 'v4', auth });
const SPREADSHEET_ID = process.env.SPREADSHEET_ID;

// --- ROUTE READ (Mengambil Data) ---
app.get('/api/data', async (req, res) => {
  try {
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: SPREADSHEET_ID,
      range: 'DataPerkara!A:F', // Mengambil data dari sheet DataPerkara kolom A sampai F
    });
    res.json(response.data.values || []);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// --- ROUTE CREATE (Menambah Data) ---
app.post('/api/data', async (req, res) => {
  const { barisData } = req.body; // Menerima array berisi 6 item dari frontend
  try {
    await sheets.spreadsheets.values.append({
      spreadsheetId: SPREADSHEET_ID,
      range: 'DataPerkara!A:F',
      valueInputOption: 'USER_ENTERED',
      resource: { values: [barisData] }, // Mengirim sebagai 1 baris utuh
    });
    res.status(201).json({ message: 'Data berhasil ditambahkan' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = app;

if (process.env.NODE_ENV !== 'production') {
  app.listen(3000, () => console.log('Server berjalan di port 3000'));
}
