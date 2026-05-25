// ... (Bagian atas file tetap sama)
function renderInput(headerText, idPrefix, index, isFirstDetail) {
    let label = headerText || 'Kolom';
    if ((headerText ? String(headerText).toLowerCase().trim() : '') === 'sidang') label = 'Sidang Terakhir';
    if ((headerText ? String(headerText).toLowerCase().trim() : '') === 'rincian informasi') label = 'No Reg';

    const id = `${idPrefix}_${index}`;
    const lower = (label ? String(label).toLowerCase().trim() : '');
    const hint = isFirstDetail ? `<small class="text-danger d-block mt-1">Otomatis sinkron</small>` : '';

    if (lower === 'rincian permohonan' || lower === 'isi permohonan') {
        return `<div class="col-12 mb-3"><label class="form-label fw-bold">${label}</label><div id="${id}_quill" style="height: 150px; background: white;"></div><input type="hidden" id="${id}"></div>`;
    } else if (lower === 'status sengketa') {
        return `<div class="col-md-6 mb-3"><label class="form-label fw-bold">${label}</label><select class="form-select status-dropdown" id="${id}" required><option value="" disabled selected>-- Pilih Status --</option><option value="Dalam Proses">Dalam Proses</option><option value="Selesai">Selesai</option></select>${hint}</div>`;
    } else if (lower === 'agenda sidang selanjutnya') {
        return `
            <div class="col-md-6 mb-3">
                <label class="form-label fw-bold">${label}</label>
                <select class="form-select" id="${id}" required>
                    <option value="" disabled selected>-- Pilih Agenda --</option>
                    <option value="-">Tidak Ada / Selesai</option>
                    <option value="Pemeriksaan Awal 1">Pemeriksaan Awal 1</option>
                    <option value="Pemeriksaan Awal 2">Pemeriksaan Awal 2</option>
                    <option value="Pemeriksaan Awal 3">Pemeriksaan Awal 3</option>
                    <option value="Pemeriksaan Setempat">Pemeriksaan Setempat</option>
                    <option value="Pembuktian 1">Pembuktian 1</option>
                    <option value="Pembuktian 2">Pembuktian 2</option>
                    <option value="Pembuktian 3">Pembuktian 3</option>
                    <option value="Mediasi">Mediasi</option>
                    <option value="Ajudikasi Pasca Mediasi Gagal">Ajudikasi Pasca Mediasi Gagal</option>
                    <option value="Penyampaian Kesimpulan">Penyampaian Kesimpulan</option>
                    <option value="Penilaian Hasil Uji Konsekuensi">Penilaian Hasil Uji Konsekuensi</option>
                    <option value="Pembacaan Penetapan MK">Pembacaan Penetapan MK</option>
                    <option value="Pembacaan Putusan Ajudikasi">Pembacaan Putusan Ajudikasi</option>
                    <option value="Pembacaan Putusan Sela">Pembacaan Putusan Sela</option>
                    <option value="Penetapan">Penetapan</option>
                    <option value="Pembacaan Putusan Mediasi">Pembacaan Putusan Mediasi</option>
                </select>
                ${hint}
            </div>`;
    } else if (lower.includes('tgl') || lower.includes('tanggal') || lower === 'sidang terakhir') {
        return `<div class="col-md-6 mb-3"><label class="form-label fw-bold">${label}</label><input type="date" class="form-control" id="${id}">${hint}</div>`;
    } else {
        return `<div class="col-md-6 mb-3"><label class="form-label fw-bold">${label}</label><input type="text" class="form-control" id="${id}" placeholder="Isi ${label}">${hint}</div>`;
    }
}

function initQuill(headers, idPrefix) {
    headers.forEach((h, i) => {
        if ((h ? String(h).toLowerCase().trim() : '') === 'rincian permohonan' || (h ? String(h).toLowerCase().trim() : '') === 'isi permohonan') {
            const id = `${idPrefix}_${i}`;
            quillInstances[id] = new Quill(`#${id}_quill`, { theme: 'snow', modules: { toolbar: [['bold', 'italic', 'underline'], [{'list':'ordered'},{'list':'bullet'}]] } });
            quillInstances[id].on('text-change', () => { document.getElementById(id).value = quillInstances[id].root.innerHTML; });
        }
    });
}

function attachStatusLogic() {
    let statusIds = [], linkIds = [];
    sheetHeadersPerkara.forEach((h, i) => { if((h ? String(h).toLowerCase().trim() : '') === 'status sengketa') statusIds.push(`inputPerkara_${i}`); if((h ? String(h).toLowerCase().trim() : '') === 'link putusan') linkIds.push(`inputPerkara_${i}`); });
    sheetHeadersDetail.forEach((h, i) => { if((h ? String(h).toLowerCase().trim() : '') === 'status sengketa') statusIds.push(`inputDetail_${i}`); if((h ? String(h).toLowerCase().trim() : '') === 'link putusan') linkIds.push(`inputDetail_${i}`); });
    
    window.applyStatusLogic = () => {
        statusIds.forEach(sId => {
            const s = document.getElementById(sId); if(!s) return;
            linkIds.forEach(lId => { const l = document.getElementById(lId); if(!l) return; if(s.value === 'Dalam Proses') { l.value = '-'; l.setAttribute('readonly', true); } else { l.removeAttribute('readonly'); } });
        });
    };
    statusIds.forEach(sId => { const el = document.getElementById(sId); if(el) el.addEventListener('change', window.applyStatusLogic); });
}

// ... (sisanya fungsi loadData, filterTable, lihatDetail tetap sama dengan logika (h ? ... : '') di atas)
