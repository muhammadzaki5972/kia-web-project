const express = require('express');
const cors = require('cors');
const { google } = require('googleapis');

const app = express();
app.use(cors());
app.use(express.json());

const auth = new google.auth.GoogleAuth({
  credentials: {
    client_email: process.env.GOOGLE_CLIENT_EMAIL,
    private_key: process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
  },
  scopes: ['https://www.googleapis.com/auth/spreadsheets'],
});

const sheets = google.sheets({ version: 'v4', auth });
const SPREADSHEET_ID = process.env.SPREADSHEET_ID;

// --- ROUTE READ (Mengambil Data dari 2 Sheet) ---
app.get('/api/data', async (req, res) => {
  try {
    const [resPerkara, resDetail] = await Promise.all([
        sheets.spreadsheets.values.get({ spreadsheetId: SPREADSHEET_ID, range: 'DataPerkara!A:F' }),
        sheets.spreadsheets.values.get({ spreadsheetId: SPREADSHEET_ID, range: 'detail!A:I' })
    ]);
    
    res.json({
        perkara: resPerkara.data.values || [],
        detail: resDetail.data.values || []
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// --- ROUTE CREATE (Menyimpan Data ke 2 Sheet) ---
app.post('/api/data', async (req, res) => {
  const { barisPerkara, barisDetail } = req.body; 
  try {
    await Promise.all([
        sheets.spreadsheets.values.append({
            spreadsheetId: SPREADSHEET_ID,
            range: 'DataPerkara!A:F',
            valueInputOption: 'USER_ENTERED',
            resource: { values: [barisPerkara] },
        }),
        sheets.spreadsheets.values.append({
            spreadsheetId: SPREADSHEET_ID,
            range: 'detail!A:I',
            valueInputOption: 'USER_ENTERED',
            resource: { values: [barisDetail] },
        })
    ]);
    res.status(201).json({ message: 'Data berhasil ditambahkan ke kedua sheet' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = app;

if (process.env.NODE_ENV !== 'production') {
  app.listen(3000, () => console.log('Server berjalan di port 3000'));
}
