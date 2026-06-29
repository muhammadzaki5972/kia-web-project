require('dotenv').config();
const express = require('express');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const helmet = require('helmet');
const { db } = require('./db');
const authMiddleware = require('./middleware/auth');
const authRoutes = require('./routes/auth');

const app = express();

// Security middlewares
app.use(helmet({ contentSecurityPolicy: false }));
app.use(cors({
  origin: process.env.ALLOWED_ORIGIN || '*', // Ganti dengan domain Vercel Anda di production
  credentials: true
}));
app.use(express.json());
app.use(cookieParser());

// Serve static files from public directory
const path = require('path');
app.use(express.static(path.join(__dirname, '../public')));

// Routes
app.use('/api/auth', authRoutes);

// Header statis (sesuaikan jika perlu)
const PERKARA_HEADERS = ["No Reg", "Tgl Register", "Pemohon", "Termohon", "Isu Sengketa", "Detail", "Keterangan Tambahan"];
const DETAIL_HEADERS = [
  "No Reg", "Tgl Register", "Ketua Majelis", "Anggota 1", "Anggota 2", "Mediator", "Panitera Pengganti", 
  "Status Sengketa", "Isu Sengketa", "Nomor Putusan", "Tgl Diputuskan", "Link Putusan", "Isi Permohonan", 
  "Tgl Sidang Sebelumnya", "Agenda Sidang Sebelumnya", "Tgl Sidang Selanjutnya", "Agenda Sidang Selanjutnya", "Kehadiran Para Pihak", "View Count"
];

// GET: Ambil semua data (terbuka untuk publik)
app.get('/api/data', async (req, res) => {
  try {
    const perkaraResult = await db.execute('SELECT * FROM data_perkara');
    const detailResult = await db.execute('SELECT * FROM detail_perkara');

    const perkaraData = perkaraResult.rows.map(r => [
      r.id || '-', r.tgl_register || '-', r.pemohon || '-', r.termohon || '-', r.isu_sengketa || '-', r.col_f || '-', r.col_g || '-'
    ]);

    const detailData = detailResult.rows.map(r => [
      r.id || '-',
      r.tgl_register || '-',
      r.ketua_majelis || '-',
      r.anggota_1 || '-',
      r.anggota_2 || '-',
      r.mediator || '-',
      r.panitera_pengganti || '-',
      r.status_sengketa || '-',
      r.isu_sengketa || '-',
      r.nomor_putusan || '-',
      r.tgl_diputuskan || '-',
      r.link_putusan || '-',
      r.isi_permohonan || '-',
      r.tgl_sidang_sebelumnya || '-',
      r.agenda_sidang_sebelumnya || '-',
      r.tgl_sidang_selanjutnya || '-',
      r.agenda_sidang_selanjutnya || '-',
      r.kehadiran_pihak || '-',
      r.view_count ?? '-'
    ]);

    const updateData = detailResult.rows.map(r => [r.updated_at || '-']);

    res.json({ 
        perkara: [PERKARA_HEADERS, ...perkaraData], 
        detail: [DETAIL_HEADERS, ...detailData],
        update: [['Tanggal Update'], ...updateData]
    });
  } catch (error) { 
    console.error(error);
    res.status(500).json({ error: error.message }); 
  }
});

// POST: Tambah data (dilindungi JWT)
app.post('/api/data', authMiddleware, async (req, res) => {
  const { barisPerkara, barisDetail, tanggalUpdate } = req.body; 
  
  if (!barisPerkara || !barisPerkara[0]) {
    return res.status(400).json({ error: "ID / No Reg wajib diisi" });
  }

  const id = barisPerkara[0];

  try {
    await db.execute({
      sql: `INSERT INTO data_perkara (id, tgl_register, pemohon, termohon, isu_sengketa, col_f, col_g) VALUES (?, ?, ?, ?, ?, ?, ?)`,
      args: [id, barisPerkara[1], barisPerkara[2], barisPerkara[3], barisPerkara[4], barisPerkara[5], barisPerkara[6]]
    });

    await db.execute({
      sql: `INSERT INTO detail_perkara (
        id, tgl_register, ketua_majelis, anggota_1, anggota_2, mediator, panitera_pengganti, 
        status_sengketa, isu_sengketa, nomor_putusan, tgl_diputuskan, link_putusan, isi_permohonan, 
        tgl_sidang_sebelumnya, agenda_sidang_sebelumnya, tgl_sidang_selanjutnya, agenda_sidang_selanjutnya, kehadiran_pihak, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      args: [
        id, barisDetail[1], barisDetail[2], barisDetail[3], barisDetail[4], barisDetail[5], barisDetail[6],
        barisDetail[7], barisDetail[8], barisDetail[9], barisDetail[10], barisDetail[11], barisDetail[12],
        barisDetail[13], barisDetail[14], barisDetail[15], barisDetail[16], barisDetail[17], tanggalUpdate
      ]
    });

    res.status(201).json({ message: 'Data berhasil ditambahkan dan disinkronkan' });
  } catch (error) { 
    console.error(error);
    if (error.message && error.message.includes('UNIQUE constraint failed')) {
      return res.status(400).json({ error: 'Nomor Registrasi (No Reg) ini sudah ada di database. Silakan gunakan nomor yang berbeda.' });
    }
    res.status(500).json({ error: error.message }); 
  }
});

// PUT: Update data (dilindungi JWT)
app.put('/api/data', authMiddleware, async (req, res) => {
    const id = req.query.id; 
    const { barisPerkara, barisDetail, tanggalUpdate } = req.body;
    
    try {
      await db.execute({
        sql: `UPDATE data_perkara SET tgl_register=?, pemohon=?, termohon=?, isu_sengketa=?, col_f=?, col_g=? WHERE id=?`,
        args: [barisPerkara[1], barisPerkara[2], barisPerkara[3], barisPerkara[4], barisPerkara[5], barisPerkara[6], id]
      });

      await db.execute({
        sql: `UPDATE detail_perkara SET 
          tgl_register=?, ketua_majelis=?, anggota_1=?, anggota_2=?, mediator=?, panitera_pengganti=?, 
          status_sengketa=?, isu_sengketa=?, nomor_putusan=?, tgl_diputuskan=?, link_putusan=?, isi_permohonan=?, 
          tgl_sidang_sebelumnya=?, agenda_sidang_sebelumnya=?, tgl_sidang_selanjutnya=?, agenda_sidang_selanjutnya=?, kehadiran_pihak=?, updated_at=?
          WHERE id=?`,
        args: [
          barisDetail[1], barisDetail[2], barisDetail[3], barisDetail[4], barisDetail[5], barisDetail[6],
          barisDetail[7], barisDetail[8], barisDetail[9], barisDetail[10], barisDetail[11], barisDetail[12],
          barisDetail[13], barisDetail[14], barisDetail[15], barisDetail[16], barisDetail[17], tanggalUpdate, id
        ]
      });

      res.json({ message: 'Data berhasil diupdate' });
    } catch (e) { 
      console.error(e);
      res.status(500).json({error: e.message}); 
    }
});

// DELETE: Hapus data (dilindungi JWT)
app.delete('/api/data', authMiddleware, async (req, res) => {
    const id = req.query.id; 
    try {
        await db.execute({ sql: `DELETE FROM data_perkara WHERE id = ?`, args: [id] });
        res.json({ message: 'Data dihapus' });
    } catch (e) { 
        console.error(e);
        res.status(500).json({error: e.message}); 
    }
});

// PATCH: Web Analytics Clickstream (terbuka publik)
app.patch('/api/view/:id', async (req, res) => {
    const id = req.params.id;
    try {
        const result = await db.execute({
          sql: `UPDATE detail_perkara SET view_count = view_count + 1 WHERE id = ? RETURNING view_count`,
          args: [id]
        });

        if (result.rows.length > 0) {
            res.json({ success: true, views: result.rows[0].view_count });
        } else {
            res.status(404).json({ error: 'Data tidak ditemukan' });
        }
    } catch (error) { 
        console.error(error);
        res.status(500).json({error: error.message}); 
    }
});
if (require.main === module) {
  const PORT = process.env.PORT || 3000;
  app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
  });
}

module.exports = app;