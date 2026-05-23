const express = require('express');
const cors = require('cors');
const { google } = require('googleapis');

const app = express();
app.use(cors());
app.use(express.json());

// Konfigurasi Autentikasi Google Sheets
// Pastikan variabel lingkungan ini diatur di menu Settings > Environment Variables Vercel
const auth = new google.auth.GoogleAuth({
  credentials: {
    client_email: process.env.GOOGLE_CLIENT_EMAIL,
    private_key: process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
  },
  scopes: ['https://www.googleapis.com/auth/spreadsheets'],
});

const sheets = google.sheets({ version: 'v4', auth });
const SPREADSHEET_ID = process.env.SPREADSHEET_ID; // Masukkan ID Spreadsheet Anda di Vercel

// --- ROUTE READ (Mengambil Data) ---
app.get('/api/data', async (req, res) => {
  try {
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: SPREADSHEET_ID,
      range: 'Sheet1!A2:D', // Sesuaikan range dengan tabel Anda
    });
    res.json(response.data.values || []);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// --- ROUTE CREATE (Menambah Data) ---
app.post('/api/data', async (req, res) => {
  const { id, nama, instansi, status } = req.body;
  try {
    await sheets.spreadsheets.values.append({
      spreadsheetId: SPREADSHEET_ID,
      range: 'Sheet1!A:D',
      valueInputOption: 'USER_ENTERED',
      resource: { values: [[id, nama, instansi, status]] },
    });
    res.status(201).json({ message: 'Data berhasil ditambahkan' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Export untuk Vercel Serverless Function
module.exports = app;

// Jalankan server lokal jika tidak di Vercel
if (process.env.NODE_ENV !== 'production') {
  app.listen(3000, () => console.log('Server berjalan di port 3000'));
}