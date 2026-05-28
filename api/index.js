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

// PERBAIKAN 1: Ekstraksi row[0] agar ID cocok & Hapus/Edit kembali berfungsi
async function findRowIndex(sheetName, id) {
    const res = await sheets.spreadsheets.values.get({ spreadsheetId: SPREADSHEET_ID, range: `${sheetName}!A:A` });
    const rows = res.data.values || [];
    // Data sheets berbentuk array of arrays [['ID-01'], ['ID-02']]. Gunakan index ke-[0] untuk mengecek text-nya.
    const index = rows.findIndex(row => row[0] && String(row[0]).trim() === String(id).trim());
    return index !== -1 ? index + 1 : null; 
}

app.get('/api/data', async (req, res) => {
  try {
    const [resPerkara, resDetail] = await Promise.all([
        sheets.spreadsheets.values.get({ spreadsheetId: SPREADSHEET_ID, range: 'DataPerkara!A:G' }), 
        sheets.spreadsheets.values.get({ spreadsheetId: SPREADSHEET_ID, range: 'detail!A:O' })
    ]);
    
    let resUpdate = { data: { values: [] } };
    try { resUpdate = await sheets.spreadsheets.values.get({ spreadsheetId: SPREADSHEET_ID, range: 'update_data!A:A' }); } 
    catch (e) { /* Abaikan jika sheet update_data belum dibuat */ }

    res.json({ 
        perkara: resPerkara.data.values || [], 
        detail: resDetail.data.values || [],
        update: resUpdate.data.values || []
    });
  } catch (error) { res.status(500).json({ error: error.message }); }
});

app.post('/api/data', async (req, res) => {
  const { barisPerkara, barisDetail, tanggalUpdate } = req.body; 
  try {
    // PERBAIKAN 2: Simpan DataPerkara DULU untuk mendeteksi dia jatuh di baris ke berapa
    const appendPerkara = await sheets.spreadsheets.values.append({
        spreadsheetId: SPREADSHEET_ID, range: 'DataPerkara!A:G', 
        valueInputOption: 'USER_ENTERED', resource: { values: [barisPerkara] },
    });

    // Ambil info letak sel data baru (contoh kembaliannya: "DataPerkara!A15:G15") -> Dapatkan angka "15"
    const updatedRange = appendPerkara.data.updates.updatedRange;
    const match = updatedRange ? updatedRange.match(/!A(\d+)/) : null;
    const targetRow = match ? match[1] : null;

    if (targetRow) {
        // Karena letak barisnya sudah pasti, gunakan fungsi "update" (bukan append) ke sheet detail dan update_data
        // agar sinkronisasi baris terkunci sempurna (100% mencegah baris melenceng/bergeser ke atas/bawah)
        await Promise.all([
            sheets.spreadsheets.values.update({
                spreadsheetId: SPREADSHEET_ID, range: `detail!A${targetRow}:O${targetRow}`, 
                valueInputOption: 'USER_ENTERED', resource: { values: [barisDetail] },
            }),
            sheets.spreadsheets.values.update({
                spreadsheetId: SPREADSHEET_ID, range: `update_data!A${targetRow}:A${targetRow}`, 
                valueInputOption: 'USER_ENTERED', resource: { values: [[tanggalUpdate || '-']] },
            })
        ]);
    } else {
        // Fallback jika Google Sheets gagal mengembalikan nomor Range
        await Promise.all([
            sheets.spreadsheets.values.append({
                spreadsheetId: SPREADSHEET_ID, range: 'detail!A:O', 
                valueInputOption: 'USER_ENTERED', resource: { values: [barisDetail] },
            }),
            sheets.spreadsheets.values.append({
                spreadsheetId: SPREADSHEET_ID, range: 'update_data!A:A', 
                valueInputOption: 'USER_ENTERED', resource: { values: [[tanggalUpdate || '-']] },
            })
        ]);
    }
    res.status(201).json({ message: 'Data berhasil ditambahkan dan disinkronkan' });
  } catch (error) { res.status(500).json({ error: error.message }); }
});

app.put('/api/data', async (req, res) => {
    const id = req.query.id; 
    const { barisPerkara, barisDetail, tanggalUpdate } = req.body;
    try {
        const idxPerkara = await findRowIndex('DataPerkara', id);
        const idxDetail = await findRowIndex('detail', id);

        const updates = [];
        if(idxPerkara) updates.push(sheets.spreadsheets.values.update({
            spreadsheetId: SPREADSHEET_ID, range: `DataPerkara!A${idxPerkara}:G${idxPerkara}`, 
            valueInputOption: 'USER_ENTERED', resource: { values: [barisPerkara] }
        }));
        
        if(idxDetail) updates.push(sheets.spreadsheets.values.update({
            spreadsheetId: SPREADSHEET_ID, range: `detail!A${idxDetail}:O${idxDetail}`, 
            valueInputOption: 'USER_ENTERED', resource: { values: [barisDetail] }
        }));

        if(idxPerkara && tanggalUpdate) updates.push(sheets.spreadsheets.values.update({
            spreadsheetId: SPREADSHEET_ID, range: `update_data!A${idxPerkara}:A${idxPerkara}`, 
            valueInputOption: 'USER_ENTERED', resource: { values: [[tanggalUpdate]] }
        }));

        await Promise.all(updates);
        res.json({ message: 'Data berhasil diupdate' });
    } catch (e) { res.status(500).json({error: e.message}); }
});

app.delete('/api/data', async (req, res) => {
    const id = req.query.id; 
    try {
        const idxPerkara = await findRowIndex('DataPerkara', id);
        const idxDetail = await findRowIndex('detail', id);
        
        const meta = await sheets.spreadsheets.get({ spreadsheetId: SPREADSHEET_ID });
        
        // PERBAIKAN 3: Penggunaan "?." (Optional Chaining) 
        // Melindungi Server agar tidak Error 500/Crash apabila ada salah satu nama sheet yang di-rename tak sengaja
        const sheetIdPerkara = meta.data.sheets.find(s => s.properties.title === 'DataPerkara')?.properties?.sheetId;
        const sheetIdDetail = meta.data.sheets.find(s => s.properties.title === 'detail')?.properties?.sheetId;
        const sheetUpdate = meta.data.sheets.find(s => s.properties.title === 'update_data');

        const requests = [];
        if(idxPerkara && sheetIdPerkara !== undefined) {
            requests.push({ deleteDimension: { range: { sheetId: sheetIdPerkara, dimension: 'ROWS', startIndex: idxPerkara - 1, endIndex: idxPerkara } }});
        }
        if(idxDetail && sheetIdDetail !== undefined) {
            requests.push({ deleteDimension: { range: { sheetId: sheetIdDetail, dimension: 'ROWS', startIndex: idxDetail - 1, endIndex: idxDetail } }});
        }
        if(idxPerkara && sheetUpdate?.properties?.sheetId !== undefined) {
            requests.push({ deleteDimension: { range: { sheetId: sheetUpdate.properties.sheetId, dimension: 'ROWS', startIndex: idxPerkara - 1, endIndex: idxPerkara } }});
        }

        if(requests.length > 0) {
            await sheets.spreadsheets.batchUpdate({ spreadsheetId: SPREADSHEET_ID, resource: { requests } });
        }
        res.json({ message: 'Data dihapus' });
    } catch (e) { res.status(500).json({error: e.message}); }
});

module.exports = app;
