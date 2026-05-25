if (window.location.pathname.includes('admin.html') && !sessionStorage.getItem('isLoggedIn')) { window.location.href = 'login.html'; }
function logout() { sessionStorage.removeItem('isLoggedIn'); window.location.href = 'login.html'; }

let sheetHeadersPerkara = [], sheetHeadersDetail = [], detailData = [], perkaraData = [], quillInstances = {}, isEditMode = false, editId = null;

function parseDate(dateStr) {
    if (!dateStr || dateStr === '-') return '';
    if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) return dateStr;
    const parts = dateStr.split(/[\/\-]/);
    if (parts.length === 3) {
        if (parts.length === 4) return `${parts}-${parts.padStart(2, '0')}-${parts.padStart(2, '0')}`;
        else if (parts.length === 4) return `${parts}-${parts.padStart(2, '0')}-${parts.padStart(2, '0')}`;
    }
    const d = new Date(dateStr);
    return !isNaN(d.getTime()) ? d.toISOString().split('T') : '';
}

function renderInput(headerText, idPrefix, index, isFirstDetail) {
    let label = headerText;
    if (headerText.toLowerCase().trim() === 'sidang') label = 'Sidang Terakhir';
    if (headerText.toLowerCase().trim() === 'rincian informasi') label = 'No Reg';

    const id = `${idPrefix}_${index}`;
    const lower = label.toLowerCase().trim();
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
        if (h.toLowerCase().trim() === 'rincian permohonan' || h.toLowerCase().trim() === 'isi permohonan') {
            const id = `${idPrefix}_${i}`;
            quillInstances[id] = new Quill(`#${id}_quill`, { theme: 'snow', modules: { toolbar: [['bold', 'italic', 'underline'], [{'list':'ordered'},{'list':'bullet'}]] } });
            quillInstances[id].on('text-change', () => { document.getElementById(id).value = quillInstances[id].root.innerHTML; });
        }
    });
}

function attachStatusLogic() {
    let statusIds = [], linkIds = [];
    sheetHeadersPerkara.forEach((h, i) => { if(h.toLowerCase().trim() === 'status sengketa') statusIds.push(`inputPerkara_${i}`); if(h.toLowerCase().trim() === 'link putusan') linkIds.push(`inputPerkara_${i}`); });
    sheetHeadersDetail.forEach((h, i) => { if(h.toLowerCase().trim() === 'status sengketa') statusIds.push(`inputDetail_${i}`); if(h.toLowerCase().trim() === 'link putusan') linkIds.push(`inputDetail_${i}`); });

    window.applyStatusLogic = () => {
        statusIds.forEach(sId => {
            const s = document.getElementById(sId);
            if(!s) return;
            linkIds.forEach(lId => {
                const l = document.getElementById(lId);
                if(!l) return;
                if(s.value === 'Dalam Proses') { l.value = '-'; l.setAttribute('readonly', true); } else { l.removeAttribute('readonly'); }
            });
        });
    };
    statusIds.forEach(sId => { const el = document.getElementById(sId); if(el) el.addEventListener('change', window.applyStatusLogic); });
}

async function loadData() {
    const thead = document.getElementById('tableHeader'), tbody = document.getElementById('dataTable'), formContainer = document.getElementById('dynamicFormContainer');
    try {
        const res = await fetch('/api/data'); const data = await res.json();
        thead.innerHTML = ''; tbody.innerHTML = ''; formContainer.innerHTML = '';
        if (!data.perkara || data.perkara.length === 0) { tbody.innerHTML = '<tr><td colspan="8" class="text-center">Data kosong.</td></tr>'; return; }
        
        sheetHeadersPerkara = data.perkara; sheetHeadersDetail = data.detail || []; perkaraData = data.perkara.slice(1); detailData = data.detail.slice(1) || [];
        
        const skipIdx = sheetHeadersPerkara.findIndex(h => h.toLowerCase().trim() === 'detail');
        sheetHeadersPerkara.forEach((h, i) => { if(i !== skipIdx) thead.innerHTML += `<th>${h}</th>`; });
        thead.innerHTML += `<th>Detail</th><th>Aksi</th>`;

        let formHtml = `<div class="card shadow-sm mb-4"><div class="card-header bg-secondary text-white fw-bold">Data Utama</div><div class="card-body row">`;
        sheetHeadersPerkara.forEach((h, i) => formHtml += renderInput(h, 'inputPerkara', i, false));
        formHtml += `</div></div><div class="card shadow-sm"><div class="card-header bg-info text-white fw-bold">Data Lengkap</div><div class="card-body row">`;
        sheetHeadersDetail.forEach((h, i) => formHtml += renderInput(h, 'inputDetail', i, i === 0));
        formHtml += `</div></div>`;
        formContainer.innerHTML = formHtml;

        initQuill(sheetHeadersPerkara, 'inputPerkara'); initQuill(sheetHeadersDetail, 'inputDetail'); attachStatusLogic();

        if(document.getElementById('inputPerkara_0')) { document.getElementById('inputPerkara_0').addEventListener('input', (e) => { const d = document.getElementById('inputDetail_0'); if(d) d.value = e.target.value; }); }

        perkaraData.forEach(row => {
            let rowHtml = `<tr>`;
            for (let i = 0; i < sheetHeadersPerkara.length; i++) { if(i !== skipIdx) rowHtml += `<td>${row[i] || '-'}</td>`; }
            rowHtml += `<td><button type="button" class="btn btn-warning btn-sm text-dark fw-bold py-0 shadow-sm" onclick="lihatDetail('${row}')">Lihat</button></td>`;
            rowHtml += `<td><button type="button" class="btn btn-primary btn-sm py-0 shadow-sm" onclick="bukaModalEdit('${row}')">Edit</button> <button type="button" class="btn btn-danger btn-sm py-0 shadow-sm" onclick="hapusData('${row}')">Hapus</button></td></tr>`;
            tbody.innerHTML += rowHtml;
        });
    } catch (e) { tbody.innerHTML = `<tr><td colspan="8" class="text-danger text-center">Error: ${e.message}</td></tr>`; }
}

function filterTable() {
    const q = document.getElementById('searchInput').value.toLowerCase();
    const rows = document.querySelectorAll('#dataTable tr');
    const idxPem = sheetHeadersPerkara.findIndex(h => h.toLowerCase().includes('pemohon'));
    const idxTerm = sheetHeadersPerkara.findIndex(h => h.toLowerCase().includes('termohon'));
    const skipIdx = sheetHeadersPerkara.findIndex(h => h.toLowerCase().trim() === 'detail');
    rows.forEach(r => {
        const cells = r.getElementsByTagName('td');
        if(cells.length <= 1) return;
        const pemohon = cells[idxPem > skipIdx ? idxPem - 1 : idxPem] ? cells[idxPem > skipIdx ? idxPem - 1 : idxPem].textContent.toLowerCase() : '';
        const termohon = cells[idxTerm > skipIdx ? idxTerm - 1 : idxTerm] ? cells[idxTerm > skipIdx ? idxTerm - 1 : idxTerm].textContent.toLowerCase() : '';
        r.style.display = (pemohon.includes(q) || termohon.includes(q)) ? '' : 'none';
    });
}
function clearSearch() { document.getElementById('searchInput').value = ''; filterTable(); }

document.getElementById('formTambahData').addEventListener('submit', async (e) => {
    e.preventDefault();
    const btnSubmit = document.getElementById('btnSubmit'); btnSubmit.innerText = "Memproses..."; btnSubmit.disabled = true;
    let barisPerkara = []; sheetHeadersPerkara.forEach((_, i) => barisPerkara.push(document.getElementById(`inputPerkara_${i}`).value || ''));
    let barisDetail = []; sheetHeadersDetail.forEach((_, i) => barisDetail.push(document.getElementById(`inputDetail_${i}`).value || ''));
    
    try {
        const res = await fetch(isEditMode ? `/api/data?id=${encodeURIComponent(editId)}` : '/api/data', {
            method: isEditMode ? 'PUT' : 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ barisPerkara, barisDetail }) 
        });
        if(res.ok) { alert(`Data berhasil ${isEditMode ? 'diupdate' : 'ditambahkan'}!`); bootstrap.Modal.getInstance(document.getElementById('tambahDataModal')).hide(); loadData(); } 
        else { const err = await res.json(); alert('Gagal: ' + err.error); }
    } catch (e) { alert('Terjadi kesalahan koneksi.'); } finally { btnSubmit.innerText = isEditMode ? "Simpan Perubahan" : "Simpan Data Baru"; btnSubmit.disabled = false; }
});

function bukaModalTambah() {
    isEditMode = false; editId = null; document.getElementById('formTambahData').reset();
    Object.values(quillInstances).forEach(q => q.setContents([])); document.getElementById('inputDetail_0').removeAttribute('readonly'); 
    if(typeof window.applyStatusLogic === 'function') window.applyStatusLogic();
    document.getElementById('modalFormTitle').innerText = "Silahkan isi Sengketa Baru"; document.getElementById('modalFormHeader').className = "modal-header bg-success text-white";
    document.getElementById('btnSubmit').className = "btn btn-success w-100 mt-4 py-2 fw-bold"; document.getElementById('btnSubmit').innerText = "Simpan Data Baru";
    new bootstrap.Modal(document.getElementById('tambahDataModal')).show();
}

function bukaModalEdit(id) {
    isEditMode = true; editId = id;
    const rowP = perkaraData.find(r => r === id) || [], rowD = detailData.find(r => r === id) || [];
    
    sheetHeadersPerkara.forEach((h, i) => {
        const el = document.getElementById(`inputPerkara_${i}`); const val = rowP[i] || '';
        if(quillInstances[`inputPerkara_${i}`]) { quillInstances[`inputPerkara_${i}`].clipboard.dangerouslyPasteHTML(val); el.value = val; } 
        else if (el) { if (el.type === 'date') el.value = parseDate(val); else el.value = val; }
    });
    sheetHeadersDetail.forEach((h, i) => {
        const el = document.getElementById(`inputDetail_${i}`); const val = rowD[i] || '';
        if(quillInstances[`inputDetail_${i}`]) { quillInstances[`inputDetail_${i}`].clipboard.dangerouslyPasteHTML(val); el.value = val; } 
        else if (el) { if (el.type === 'date') el.value = parseDate(val); else el.value = val; }
    });

    document.getElementById('inputDetail_0').setAttribute('readonly', true); 
    if(typeof window.applyStatusLogic === 'function') window.applyStatusLogic();
    document.getElementById('modalFormTitle').innerText = `Edit Data Perkara: ${id}`; document.getElementById('modalFormHeader').className = "modal-header bg-warning text-dark";
    document.getElementById('btnSubmit').className = "btn btn-warning w-100 mt-4 py-2 fw-bold text-dark"; document.getElementById('btnSubmit').innerText = "Simpan Perubahan";
    new bootstrap.Modal(document.getElementById('tambahDataModal')).show();
}

async function hapusData(id) { if(!confirm(`Yakin ingin menghapus ${id}?`)) return; const res = await fetch(`/api/data?id=${encodeURIComponent(id)}`, { method: 'DELETE' }); if(res.ok) loadData(); else alert("Gagal"); }

function lihatDetail(id) {
    const modalEl = document.getElementById('detailModal'); new bootstrap.Modal(modalEl).show();
    document.getElementById('detailLoading').style.display = 'flex'; document.getElementById('detailContent').innerHTML = '';
    const pRow = perkaraData.find(r => r === id);
    document.getElementById('detailModalTitle').innerText = pRow ? `${pRow[sheetHeadersPerkara.findIndex(h=>h.toLowerCase().includes('pemohon'))]} vs ${pRow[sheetHeadersPerkara.findIndex(h=>h.toLowerCase().includes('termohon'))]}` : 'Detail Perkara';

    setTimeout(() => {
        const row = detailData.find(r => r === id);
        const leftFields = ["no reg", "tgl register", "ketua majelis", "anggota 1", "anggota 2", "mediator", "panitera pengganti", "status sengketa", "sidang terakhir", "tgl sidang selanjutnya", "agenda sidang selanjutnya", "nomor putusan", "tgl diputuskan", "link putusan"];
        
        let leftHtml = '<div class="col-md-6">';
        let datesCollected = [];

        leftFields.forEach(f => {
            let fieldVal = '-', labelText = '';
            const findIdx = (headers) => headers.findIndex(h => { const val = h.toLowerCase().trim(); return val === f || (f === 'no reg' && val === 'rincian informasi') || (f === 'sidang terakhir' && val === 'sidang'); });
            
            let idx = findIdx(sheetHeadersDetail);
            if(idx !== -1) { fieldVal = row ? (row[idx] || '-') : '-'; labelText = sheetHeadersDetail[idx]; } 
            else { idx = findIdx(sheetHeadersPerkara); if(idx !== -1) { fieldVal = pRow ? (pRow[idx] || '-') : '-'; labelText = sheetHeadersPerkara[idx]; } }

            if(idx !== -1) {
                if(f === 'no reg') labelText = 'No Reg'; if(f === 'sidang terakhir') labelText = 'Sidang Terakhir';
                
                if(fieldVal !== '-' && fieldVal !== '') {
                    if (/^\d{4}-\d{2}-\d{2}$/.test(fieldVal)) { datesCollected.push(new Date(fieldVal)); } 
                    else if (/^\d{2}[\/\-]\d{2}[\/\-]\d{4}$/.test(fieldVal)) { const p = fieldVal.split(/[\/\-]/); datesCollected.push(new Date(`${p}-${p}-${p}`)); }
                }

                if(f.includes('tgl') || f.includes('tanggal') || f.includes('sidang')) {
                    if (/^\d{4}-\d{2}-\d{2}$/.test(fieldVal)) { const p = fieldVal.split('-'); fieldVal = `${p}/${p}/${p}`; }
                }

                if (f === 'link putusan' && fieldVal !== '-' && fieldVal !== '') fieldVal = `<a href="${!fieldVal.startsWith('http')?'https://'+fieldVal:fieldVal}" target="_blank" class="text-primary fw-bold text-decoration-none">Buka Putusan ↗</a>`;
                leftHtml += `<div class="card shadow-sm border-0 mb-2"><div class="card-body py-1 px-3"><div class="text-muted fw-bold d-block" style="font-size: 0.75rem;">${labelText}</div><div class="text-dark" style="font-size: 0.85rem;">${fieldVal}</div></div></div>`;
            }
        });
        leftHtml += '</div>';

        let latestDateStr = '-';
        if (datesCollected.length > 0) {
            let maxDate = new Date(Math.max.apply(null, datesCollected));
            if (!isNaN(maxDate.getTime())) {
                const dd = String(maxDate.getDate()).padStart(2, '0');
                const mm = String(maxDate.getMonth() + 1).padStart(2, '0');
                const yyyy = maxDate.getFullYear();
                latestDateStr = `${dd}/${mm}/${yyyy}`;
            }
        }
        if (document.getElementById('modalLastUpdated')) {
            document.getElementById('modalLastUpdated').innerText = "Data terakhir diperbarui tanggal: " + latestDateStr;
        }

        const idxPermohonan = sheetHeadersDetail.findIndex(h => h.toLowerCase().trim() === 'isi permohonan');
        let rightHtml = `<div class="col-md-6"><div class="card shadow-sm border-0"><div class="card-header bg-light fw-bold" style="font-size: 0.85rem;">Isi Permohonan</div><div class="card-body scrollable-box" style="font-size: 0.85rem;"><div class="text-dark">${idxPermohonan !== -1 ? (row ? row[idxPermohonan] || '-' : '-') : '-'}</div></div></div></div>`;
        document.getElementById('detailContent').innerHTML = leftHtml + rightHtml; document.getElementById('detailLoading').style.display = 'none';
    }, 500); 
}
function closeDetailModal() { const m = bootstrap.Modal.getInstance(document.getElementById('detailModal')); if(m) m.hide(); }
window.onload = loadData;
