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

async function findRowIndex(sheetName, id) {
    const res = await sheets.spreadsheets.values.get({ spreadsheetId: SPREADSHEET_ID, range: `${sheetName}!A:A` });
    const rows = res.data.values || [];
    const index = rows.findIndex(row => row[0] === id);
    return index !== -1 ? index + 1 : null; 
}

app.get('/api/data', async (req, res) => {
  try {
    const [resPerkara, resDetail] = await Promise.all([
        sheets.spreadsheets.values.get({ spreadsheetId: SPREADSHEET_ID, range: 'DataPerkara!A:F' }),
        sheets.spreadsheets.values.get({ spreadsheetId: SPREADSHEET_ID, range: 'detail!A:N' }) // Diperlebar sampai N
    ]);
    res.json({ perkara: resPerkara.data.values || [], detail: resDetail.data.values || [] });
  } catch (error) { res.status(500).json({ error: error.message }); }
});

app.post('/api/data', async (req, res) => {
  const { barisPerkara, barisDetail } = req.body; 
  try {
    await Promise.all([
        sheets.spreadsheets.values.append({
            spreadsheetId: SPREADSHEET_ID, range: 'DataPerkara!A:F',
            valueInputOption: 'USER_ENTERED', resource: { values: [barisPerkara] },
        }),
        sheets.spreadsheets.values.append({
            spreadsheetId: SPREADSHEET_ID, range: 'detail!A:N', // Diperlebar sampai N
            valueInputOption: 'USER_ENTERED', resource: { values: [barisDetail] },
        })
    ]);
    res.status(201).json({ message: 'Data berhasil ditambahkan' });
  } catch (error) { res.status(500).json({ error: error.message }); }
});

app.put('/api/data', async (req, res) => {
    const id = req.query.id; 
    const { barisPerkara, barisDetail } = req.body;
    try {
        const idxPerkara = await findRowIndex('DataPerkara', id);
        const idxDetail = await findRowIndex('detail', id);

        if(idxPerkara) await sheets.spreadsheets.values.update({
            spreadsheetId: SPREADSHEET_ID, range: `DataPerkara!A${idxPerkara}:F${idxPerkara}`,
            valueInputOption: 'USER_ENTERED', resource: { values: [barisPerkara] }
        });
        
        if(idxDetail) await sheets.spreadsheets.values.update({
            spreadsheetId: SPREADSHEET_ID, range: `detail!A${idxDetail}:N${idxDetail}`, // Diperlebar sampai N
            valueInputOption: 'USER_ENTERED', resource: { values: [barisDetail] }
        });

        res.json({ message: 'Data berhasil diupdate' });
    } catch (e) { res.status(500).json({error: e.message}); }
});

app.delete('/api/data', async (req, res) => {
    const id = req.query.id; 
    try {
        const idxPerkara = await findRowIndex('DataPerkara', id);
        const idxDetail = await findRowIndex('detail', id);
        const meta = await sheets.spreadsheets.get({ spreadsheetId: SPREADSHEET_ID });
        const sheetIdPerkara = meta.data.sheets.find(s => s.properties.title === 'DataPerkara').properties.sheetId;
        const sheetIdDetail = meta.data.sheets.find(s => s.properties.title === 'detail').properties.sheetId;

        const requests = [];
        if(idxPerkara) requests.push({ deleteDimension: { range: { sheetId: sheetIdPerkara, dimension: 'ROWS', startIndex: idxPerkara - 1, endIndex: idxPerkara } }});
        if(idxDetail) requests.push({ deleteDimension: { range: { sheetId: sheetIdDetail, dimension: 'ROWS', startIndex: idxDetail - 1, endIndex: idxDetail } }});

        if(requests.length > 0) await sheets.spreadsheets.batchUpdate({ spreadsheetId: SPREADSHEET_ID, resource: { requests } });
        res.json({ message: 'Data dihapus' });
    } catch (e) { res.status(500).json({error: e.message}); }
});

module.exports = app;
