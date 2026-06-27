-- Tabel Users (admin)
CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  username TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  role TEXT DEFAULT 'admin',
  created_at TEXT DEFAULT (datetime('now'))
);

-- Tabel DataPerkara (ringkas)
CREATE TABLE IF NOT EXISTS data_perkara (
  id TEXT PRIMARY KEY,          -- No Reg / ID Perkara
  pemohon TEXT,
  termohon TEXT,
  status_sengketa TEXT,
  isu_sengketa TEXT,
  col_f TEXT,                   -- Kolom F dinamis
  col_g TEXT,                   -- Kolom G dinamis
  created_at TEXT DEFAULT (datetime('now'))
);

-- Tabel Detail (lengkap)
CREATE TABLE IF NOT EXISTS detail_perkara (
  id TEXT PRIMARY KEY,
  tgl_register TEXT,
  ketua_majelis TEXT,
  anggota_1 TEXT,
  anggota_2 TEXT,
  mediator TEXT,
  panitera_pengganti TEXT,
  status_sengketa TEXT,
  isu_sengketa TEXT,
  nomor_putusan TEXT,
  tgl_diputuskan TEXT,
  link_putusan TEXT,
  isi_permohonan TEXT,
  tgl_sidang_sebelumnya TEXT,
  agenda_sidang_sebelumnya TEXT,
  tgl_sidang_selanjutnya TEXT,
  agenda_sidang_selanjutnya TEXT,
  view_count INTEGER DEFAULT 0,
  updated_at TEXT,
  FOREIGN KEY (id) REFERENCES data_perkara(id) ON DELETE CASCADE
);
