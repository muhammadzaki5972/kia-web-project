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
    const lower = headerText ? headerText.toString().toLowerCase().trim() : '';
    
    if (lower === 'sidang') label = 'Sidang Terakhir';
    if (lower === 'rincian informasi') label = 'No Reg';

    const id = `${idPrefix}_${index}`;
    const hint = isFirstDetail ? `<small class="text-danger d-block mt-1">Otomatis sinkron</small>` : '';

    if (lower === 'tanggal update' || lower === 'terakhir diperbarui') {
        return `<input type="hidden" id="${id}">`;
    }

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
        const lower = h ? h.toString().toLowerCase().trim() : '';
        if (lower === 'rincian permohonan' || lower === 'isi permohonan') {
            const id = `${idPrefix}_${i}`;
            quillInstances[id] = new Quill(`#${id}_quill`, { theme: 'snow', modules: { toolbar: [['bold', 'italic', 'underline'], [{'list':'ordered'},{'list':'bullet'}]] } });
            quillInstances[id].on('text-change', () => { document.getElementById(id).value = quillInstances[id].root.innerHTML; });
        }
    });
}

function attachStatusLogic() {
    let statusIds = [], linkIds = [];
    sheetHeadersPerkara.forEach((h, i) => { 
        const lower = h ? h.toString().toLowerCase().trim() : '';
        if(lower === 'status sengketa') statusIds.push(`inputPerkara_${i}`); 
        if(lower === 'link putusan') linkIds.push(`inputPerkara_${i}`); 
    });
    sheetHeadersDetail.forEach((h, i) => { 
        const lower = h ? h.toString().toLowerCase().trim() : '';
        if(lower === 'status sengketa') statusIds.push(`inputDetail_${i}`); 
        if(lower === 'link putusan') linkIds.push(`inputDetail_${i}`); 
    });

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
        
        const skipIdx = sheetHeadersPerkara.findIndex(h => h && h.toString().toLowerCase().trim() === 'detail');
        sheetHeadersPerkara.forEach((h, i) => { 
            const lowH = h ? h.toString().toLowerCase().trim() : '';
            if(i !== skipIdx && lowH !== 'tanggal update' && lowH !== 'terakhir diperbarui') {
                thead.innerHTML += `<th>${h}</th>`; 
            }
        });
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
            for (let i = 0; i < sheetHeadersPerkara.length; i++) { 
                const lowH = sheetHeadersPerkara[i] ? sheetHeadersPerkara[i].toString().toLowerCase().trim() : '';
                if(i !== skipIdx && lowH !== 'tanggal update' && lowH !== 'terakhir diperbarui') {
                    rowHtml += `<td>${row[i] || '-'}</td>`; 
                }
            }
            rowHtml += `<td><button type="button" class="btn btn-warning btn-sm text-dark fw-bold py-0 shadow-sm" onclick="lihatDetail('${row}')">Lihat</button></td>`;
            rowHtml += `<td><button type="button" class="btn btn-primary btn-sm py-0 shadow-sm" onclick="bukaModalEdit('${row}')">Edit</button> <button type="button" class="btn btn-danger btn-sm py-0 shadow-sm" onclick="hapusData('${row}')">Hapus</button></td></tr>`;
            tbody.innerHTML += rowHtml;
        });
    } catch (e) { tbody.innerHTML = `<tr><td colspan="8" class="text-danger text-center">Error: ${e.message}</td></tr>`; }
}

function filterTable() {
    const q = document.getElementById('searchInput').value.toLowerCase();
    const rows = document.querySelectorAll('#dataTable tr');
    const idxPem = sheetHeadersPerkara.findIndex(h => h && h.toString().toLowerCase().includes('pemohon'));
    const idxTerm = sheetHeadersPerkara.findIndex(h => h && h.toString().toLowerCase().includes('termohon'));
    const skipIdx = sheetHeadersPerkara.findIndex(h => h && h.toString().toLowerCase().trim() === 'detail');
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
    
    const now = new Date();
    const offset = 7 * 60; // Waktu Indonesia Barat (WIB)
    const localTime = new Date(now.getTime() + (offset - now.getTimezoneOffset()) * 60000);
    const todayWibStr = localTime.toISOString().split('T');
    
    sheetHeadersPerkara.forEach((h, i) => {
