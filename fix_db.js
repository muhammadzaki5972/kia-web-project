require('dotenv').config();
const { db } = require('./api/db.js');

async function fix() {
  try {
    console.log("Fixing detail_perkara...");
    await db.execute(`
      UPDATE detail_perkara SET
        tgl_register = panitera_pengganti,
        ketua_majelis = tgl_register,
        anggota_1 = ketua_majelis,
        anggota_2 = anggota_1,
        mediator = anggota_2,
        panitera_pengganti = mediator,
        
        nomor_putusan = isi_permohonan,
        tgl_diputuskan = tgl_sidang_sebelumnya,
        link_putusan = '-',
        isi_permohonan = nomor_putusan,
        tgl_sidang_sebelumnya = agenda_sidang_sebelumnya,
        agenda_sidang_sebelumnya = tgl_sidang_selanjutnya,
        tgl_sidang_selanjutnya = tgl_diputuskan,
        agenda_sidang_selanjutnya = link_putusan,
        view_count = COALESCE(CAST(agenda_sidang_selanjutnya AS INTEGER), 0) + COALESCE(view_count, 0)
      WHERE agenda_sidang_selanjutnya != 'null' OR panitera_pengganti != '-'
    `);
    
    console.log("Fixing data_perkara schema...");
    await db.execute(`ALTER TABLE data_perkara RENAME COLUMN pemohon TO tgl_register`);
    await db.execute(`ALTER TABLE data_perkara RENAME COLUMN termohon TO pemohon`);
    await db.execute(`ALTER TABLE data_perkara RENAME COLUMN status_sengketa TO termohon`);
    
    console.log("DONE!");
  } catch(e) {
    console.error(e);
  }
}
fix();
