async function checkAuth() {
    if (window.location.pathname.includes('admin.html')) {
        try {
            const res = await fetch('/api/auth/me');
            if (!res.ok) {
                window.location.href = 'login.html';
            } else {
                const data = await res.json();
                if (data.user && data.user.username) {
                    const userElement = document.getElementById('loggedUsername');
                    if (userElement) {
                        userElement.textContent = data.user.username;
                    }
                }
            }
        } catch (e) {
            window.location.href = 'login.html';
        }
    }
}
checkAuth();

function logout() {
    new bootstrap.Modal(document.getElementById('logoutModal')).show();
}

async function confirmLogout() { 
    try {
        await fetch('/api/auth/logout', { method: 'POST' });
    } catch(e) {}
    window.location.href = 'login.html'; 
}

let sheetHeadersPerkara = [], sheetHeadersDetail = [], detailData = [], perkaraData = [], updateData = [], isEditMode = false, editId = null;

function parseDate(dateStr) {
    if (!dateStr || dateStr === '-') return '';
    if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) return dateStr;
    const parts = dateStr.split(/[\/\-]/);
    if (parts.length === 3) {
        if (parts[2].length === 4) return `${parts[2]}-${parts[1].padStart(2, '0')}-${parts[0].padStart(2, '0')}`;
        else if (parts[0].length === 4) return `${parts[0]}-${parts[1].padStart(2, '0')}-${parts[2].padStart(2, '0')}`;
    }
    const d = new Date(dateStr);
    return !isNaN(d.getTime()) ? d.toISOString().split('T')[0] : '';
}

window.toggleIsuLainnya = (id) => {
    const selectEl = document.getElementById(`${id}_select`);
    const otherEl = document.getElementById(`${id}_other`);
    const hiddenEl = document.getElementById(id);
    
    if(selectEl.value === 'Other') {
        otherEl.classList.remove('d-none');
        hiddenEl.value = otherEl.value;
        otherEl.focus();
    } else {
        otherEl.classList.add('d-none');
        hiddenEl.value = selectEl.value;
    }
};

window.updateIsuLainnya = (id) => {
    const otherEl = document.getElementById(`${id}_other`);
    const hiddenEl = document.getElementById(id);
    hiddenEl.value = otherEl.value;
};

function syncIsuSengketaForEdit(idPrefix, index, val) {
    const selectEl = document.getElementById(`${idPrefix}_${index}_select`);
    const otherEl = document.getElementById(`${idPrefix}_${index}_other`);
    const hiddenEl = document.getElementById(`${idPrefix}_${index}`);
    
    if (selectEl && otherEl && hiddenEl) {
        hiddenEl.value = val;
        const options = ["Regulasi", "Kinerja", "Anggaran", "HGU", "AMDAL", "Lingkungan"];
        if (options.includes(val)) {
            selectEl.value = val;
            otherEl.classList.add('d-none');
            otherEl.value = '';
        } else if (val && val !== '-' && val !== '') {
            selectEl.value = 'Other';
            otherEl.value = val;
            otherEl.classList.remove('d-none');
        } else {
            selectEl.value = '';
            otherEl.classList.add('d-none');
            otherEl.value = '';
        }
    }
}

function renderInput(headerText, idPrefix, index, isFirstDetail) {
    let label = headerText;
    if ((`${headerText}`).toLowerCase().trim() === 'sidang') label = 'Sidang Terakhir';
    if ((`${headerText}`).toLowerCase().trim() === 'rincian informasi') label = 'No Reg';

    const id = `${idPrefix}_${index}`;
    const lower = (`${label}`).toLowerCase().trim();
    const hint = isFirstDetail ? `<small class="text-danger d-block mt-1">Otomatis sinkron</small>` : '';

    // UPDATE: PENGGUNAAN TEXTAREA UNTUK SUMMERNOTE BS5
    if (lower === 'rincian permohonan' || lower === 'isi permohonan') {
        return `<div class="col-12 mb-3"><label class="form-label fw-bold">${label}</label><textarea id="${id}" class="form-control summernote-editor"></textarea></div>`;
    } 
    else if (lower === 'isu sengketa') {
        return `
            <div class="col-md-6 mb-3">
                <label class="form-label fw-bold">${label}</label>
                <select class="form-select shadow-sm" id="${id}_select" onchange="toggleIsuLainnya('${id}')">
                    <option value="" disabled selected>-- Pilih Isu Sengketa --</option>
                    <option value="Regulasi">Regulasi</option>
                    <option value="Kinerja">Kinerja</option>
                    <option value="Anggaran">Anggaran</option>
                    <option value="HGU">HGU</option>
                    <option value="AMDAL">AMDAL</option>
                    <option value="Lingkungan">Lingkungan</option>
                    <option value="Other">Other (Isi Manual)</option>
                </select>
                <input type="text" class="form-control mt-2 shadow-sm d-none" id="${id}_other" placeholder="Ketik Isu Sengketa..." oninput="updateIsuLainnya('${id}')">
                <input type="hidden" id="${id}">
                ${hint}
            </div>`;
    } 
    else if (lower === 'status sengketa') {
        return `<div class="col-md-6 mb-3"><label class="form-label fw-bold">${label}</label><select class="form-select status-dropdown shadow-sm" id="${id}" required><option value="" disabled selected>-- Pilih Status --</option><option value="Dalam Proses">Dalam Proses</option><option value="Selesai">Selesai</option></select>${hint}</div>`;
    } 
    else if (lower.includes('agenda')) {
        return `
            <div class="col-md-6 mb-3">
                <label class="form-label fw-bold">${label}</label>
                <select class="form-select shadow-sm" id="${id}">
                    <option value="" disabled selected>-- Pilih Opsi --</option>
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
    } 
    else if (lower.includes('tgl') || lower.includes('tanggal') || lower === 'sidang terakhir') {
        return `<div class="col-md-6 mb-3"><label class="form-label fw-bold">${label}</label><input type="date" class="form-control shadow-sm" id="${id}">${hint}</div>`;
    } 
    else if (lower === 'kehadiran para pihak') {
        return `
            <div class="col-md-6 mb-3">
                <label class="form-label fw-bold">${label}</label>
                <div class="d-flex gap-3 mt-2">
                    <div class="form-check">
                        <input class="form-check-input" type="checkbox" id="${id}_pemohon" value="Pemohon">
                        <label class="form-check-label" for="${id}_pemohon">Pemohon</label>
                    </div>
                    <div class="form-check">
                        <input class="form-check-input" type="checkbox" id="${id}_termohon" value="Termohon">
                        <label class="form-check-label" for="${id}_termohon">Termohon</label>
                    </div>
                </div>
                <input type="hidden" id="${id}" value="-">
                ${hint}
            </div>`;
    } else {
        return `<div class="col-md-6 mb-3"><label class="form-label fw-bold">${label}</label><input type="text" class="form-control shadow-sm" id="${id}" placeholder="Isi ${label}">${hint}</div>`;
    }
}

// UPDATE: INISIALISASI SUMMERNOTE
function initSummernote(headers, idPrefix) {
    headers.forEach((h, i) => {
        const lowerH = (`${h}`).toLowerCase().trim();
        if (lowerH === 'rincian permohonan' || lowerH === 'isi permohonan') {
            const id = `#${idPrefix}_${i}`;
            if (typeof $ !== 'undefined' && $(id).length) {
                $(id).summernote({
                    height: 150,
                    placeholder: 'Ketik isi permohonan di sini...',
                    toolbar: [
                        ['style', ['style']],
                        ['font', ['bold', 'italic', 'underline', 'strikethrough', 'superscript', 'subscript', 'clear']],
                        ['fontname', ['fontname']],
                        ['fontsize', ['fontsize']],
                        ['color', ['color']],
                        ['para', ['ul', 'ol', 'paragraph']],
                        ['height', ['height']],
                        ['table', ['table']],
                        ['insert', ['link', 'picture', 'video', 'hr']],
                        ['view', ['fullscreen', 'codeview', 'help']]
                    ],
                    callbacks: {
                        onChange: function(contents, $editable) {
                            $(id).val(contents); // Sinkronisasi realtime ke textarea
                        }
                    }
                });
            }
        }
    });
}

function attachStatusLogic() {
    let statusIds = [], putusanTargetIds = [], sidangTargetIds = [];
    
    const isPutusanHeader = (h) => {
        const low = (`${h}`).toLowerCase().trim();
        return low === 'link putusan' || low === 'nomor putusan' || low === 'tgl diputuskan' || low === 'tgl putusan' || low === 'tanggal putusan';
    };

    const isSidangHeader = (h) => {
        const low = (`${h}`).toLowerCase().trim();
        return low === 'sidang' || low === 'sidang terakhir' || low === 'tgl sidang selanjutnya' || low === 'tanggal sidang selanjutnya' || low === 'agenda sidang selanjutnya';
    };

    sheetHeadersPerkara.forEach((h, i) => { 
        if((`${h}`).toLowerCase().trim() === 'status sengketa') statusIds.push(`inputPerkara_${i}`); 
        if(isPutusanHeader(h)) putusanTargetIds.push(`inputPerkara_${i}`);
        if(isSidangHeader(h)) sidangTargetIds.push(`inputPerkara_${i}`);
    });
    sheetHeadersDetail.forEach((h, i) => { 
        if((`${h}`).toLowerCase().trim() === 'status sengketa') statusIds.push(`inputDetail_${i}`); 
        if(isPutusanHeader(h)) putusanTargetIds.push(`inputDetail_${i}`);
        if(isSidangHeader(h)) sidangTargetIds.push(`inputDetail_${i}`);
    });

    const lockField = (t, valIfText) => {
        if(!t) return;
        t.setAttribute('readonly', true);
        t.style.backgroundColor = '#e9ecef';
        
        if (t.tagName === 'SELECT') {
            t.disabled = true;
            t.value = valIfText; 
        } else {
            if (t.type === 'date' || t.dataset.wasDate === 'true') {
                t.dataset.wasDate = 'true';
                t.type = 'text';
            }
            t.disabled = true;
            t.value = valIfText;
        }
    };

    const unlockField = (t) => {
        if(!t) return;
        t.removeAttribute('readonly');
        t.style.backgroundColor = '';
        t.disabled = false;
        
        if (t.dataset.wasDate === 'true') {
            t.type = 'date';
        }
        
        if (t.value === '-') t.value = '';
    };

    window.applyStatusLogic = () => {
        statusIds.forEach(sId => {
            const s = document.getElementById(sId);
            if(!s) return;
            
            if(s.value === 'Dalam Proses') { 
                putusanTargetIds.forEach(tId => lockField(document.getElementById(tId), '-'));
                sidangTargetIds.forEach(tId => unlockField(document.getElementById(tId)));
            } else if (s.value === 'Selesai') { 
                putusanTargetIds.forEach(tId => unlockField(document.getElementById(tId)));
                sidangTargetIds.forEach(tId => lockField(document.getElementById(tId), '-'));
            }
        });
    };
    
    statusIds.forEach(sId => { 
        const el = document.getElementById(sId); 
        if(el) el.addEventListener('change', window.applyStatusLogic); 
    });
}

async function loadData() {
    const thead = document.getElementById('tableHeader'), tbody = document.getElementById('dataTable'), formContainer = document.getElementById('dynamicFormContainer');
    try {
        const res = await fetch(`/api/data?t=${new Date().getTime()}`, { cache: 'no-store' }); const data = await res.json();
        thead.innerHTML = ''; tbody.innerHTML = ''; formContainer.innerHTML = '';
        if (!data.perkara || data.perkara.length === 0) { tbody.innerHTML = '<tr><td colspan="8" class="text-center">Data kosong.</td></tr>'; return; }
        
        sheetHeadersPerkara = data.perkara[0]; sheetHeadersDetail = data.detail[0] || []; 
        perkaraData = data.perkara.slice(1); detailData = data.detail.slice(1) || [];
        updateData = data.update ? data.update.slice(1) : [];
        
        const skipIdx = sheetHeadersPerkara.findIndex(h => (`${h}`).toLowerCase().trim() === 'detail');
        const skipKetIdx = sheetHeadersPerkara.findIndex(h => (`${h}`).toLowerCase().trim() === 'keterangan tambahan');
        
        let theadHtml = '';
        sheetHeadersPerkara.forEach((h, i) => { if(i !== skipIdx && i !== skipKetIdx) theadHtml += `<th>${h}</th>`; });
        theadHtml += `<th>Aksi</th>`;
        thead.innerHTML = theadHtml;

        let formHtml = `<div class="card shadow-sm mb-4"><div class="card-header bg-secondary text-white fw-bold">Data Utama</div><div class="card-body row">`;
        sheetHeadersPerkara.forEach((h, i) => { if(i !== skipIdx && i !== skipKetIdx) formHtml += renderInput(h, 'inputPerkara', i, false); });
        const skipViewCountIdx = sheetHeadersDetail.findIndex(h => (`${h}`).toLowerCase().trim() === 'view count');
        const skipIsuIdx = sheetHeadersDetail.findIndex(h => (`${h}`).toLowerCase().trim() === 'isu sengketa');
        formHtml += `</div></div><div class="card shadow-sm"><div class="card-header bg-info text-white fw-bold">Data Lengkap</div><div class="card-body row">`;
        sheetHeadersDetail.forEach((h, i) => { if (i !== skipViewCountIdx && i !== skipIsuIdx) formHtml += renderInput(h, 'inputDetail', i, i === 0); });
        formHtml += `</div></div>`;
        formContainer.innerHTML = formHtml;

        // PANGGIL INITIALIZER SUMMERNOTE
        initSummernote(sheetHeadersPerkara, 'inputPerkara'); 
        initSummernote(sheetHeadersDetail, 'inputDetail'); 
        attachStatusLogic();

        if(document.getElementById('inputPerkara_0')) { document.getElementById('inputPerkara_0').addEventListener('input', (e) => { const d = document.getElementById('inputDetail_0'); if(d) d.value = e.target.value; }); }

        let allRowsHtml = '';
        perkaraData.forEach(row => {
            let rowHtml = `<tr>`;
            for (let i = 0; i < sheetHeadersPerkara.length; i++) { if(i !== skipIdx && i !== skipKetIdx) rowHtml += `<td>${row[i] || '-'}</td>`; }
            rowHtml += `<td><div class="d-flex gap-1 justify-content-center">
                <button type="button" class="btn btn-warning btn-sm text-dark py-0 shadow-sm" onclick="lihatDetail('${row[0]}')" title="Lihat Detail"><i class="bi bi-eye-fill"></i></button>
                <button type="button" class="btn btn-primary btn-sm py-0 shadow-sm" onclick="bukaModalEdit('${row[0]}')" title="Edit"><i class="bi bi-pencil-square"></i></button>
                <button type="button" class="btn btn-danger btn-sm py-0 shadow-sm" onclick="hapusData('${row[0]}')" title="Hapus"><i class="bi bi-trash3-fill"></i></button>
            </div></td></tr>`;
            allRowsHtml += rowHtml;
        });
        tbody.innerHTML = allRowsHtml;
    } catch (e) { tbody.innerHTML = `<tr><td colspan="8" class="text-danger text-center">Error: ${e.message}</td></tr>`; }
}

function filterTable() {
    const q = document.getElementById('searchInput').value.toLowerCase();
    const rows = document.querySelectorAll('#dataTable tr');
    const idxPem = sheetHeadersPerkara.findIndex(h => (`${h}`).toLowerCase().includes('pemohon'));
    const idxTerm = sheetHeadersPerkara.findIndex(h => (`${h}`).toLowerCase().includes('termohon'));
    const skipIdx = sheetHeadersPerkara.findIndex(h => (`${h}`).toLowerCase().trim() === 'detail');
    rows.forEach(r => {
        const cells = r.getElementsByTagName('td');
        if(cells.length <= 1) return;
        const pemohon = cells[idxPem > skipIdx ? idxPem - 1 : idxPem] ? cells[idxPem > skipIdx ? idxPem - 1 : idxPem].textContent.toLowerCase() : '';
        const termohon = cells[idxTerm > skipIdx ? idxTerm - 1 : idxTerm] ? cells[idxTerm > skipIdx ? idxTerm - 1 : idxTerm].textContent.toLowerCase() : '';
        r.style.display = (pemohon.includes(q) || termohon.includes(q)) ? '' : 'none';
    });
}
function clearSearch() { document.getElementById('searchInput').value = ''; filterTable(); }

document.getElementById('formTambahData').addEventListener('submit', (e) => {
    e.preventDefault();
    const tglModalEl = document.getElementById('tanggalUpdateModal');
    if(tglModalEl) {
        const tglModal = new bootstrap.Modal(tglModalEl);
        const today = new Date();
        const yyyy = today.getFullYear();
        const mm = String(today.getMonth() + 1).padStart(2, '0');
        const dd = String(today.getDate()).padStart(2, '0');
        document.getElementById('inputTanggalUpdate').value = `${yyyy}-${mm}-${dd}`;
        tglModal.show();
    }
});

const btnConfirmUpdate = document.getElementById('btnConfirmUpdate');
if(btnConfirmUpdate) {
    btnConfirmUpdate.addEventListener('click', async () => {
        const tglVal = document.getElementById('inputTanggalUpdate').value;
        if(!tglVal) { alert('Silakan pilih tanggal update!'); return; }
        
        const parts = tglVal.split('-');
        const formattedDate = `${parts[2]}/${parts[1]}/${parts[0]}`; 
        
        const m = bootstrap.Modal.getInstance(document.getElementById('tanggalUpdateModal'));
        if(m) m.hide();

        const btnSubmit = document.getElementById('btnSubmit'); 
        const originalText = btnSubmit.innerText;
        btnSubmit.innerText = "Memproses..."; btnSubmit.disabled = true;
        
        let barisPerkara = []; 
        sheetHeadersPerkara.forEach((_, i) => {
            const el = document.getElementById(`inputPerkara_${i}`);
            barisPerkara.push(el ? el.value : '-');
        });
        let barisDetail = []; 
        sheetHeadersDetail.forEach((h, i) => {
            const el = document.getElementById(`inputDetail_${i}`);
            let val = el ? el.value : '-';
            if ((`${h}`).toLowerCase().trim() === 'isu sengketa' && barisPerkara[4]) val = barisPerkara[4];
            if ((`${h}`).toLowerCase().trim() === 'kehadiran para pihak') {
                const cbPemohon = document.getElementById(`inputDetail_${i}_pemohon`);
                const cbTermohon = document.getElementById(`inputDetail_${i}_termohon`);
                const hadirArr = [];
                if (cbPemohon && cbPemohon.checked) hadirArr.push(cbPemohon.value);
                if (cbTermohon && cbTermohon.checked) hadirArr.push(cbTermohon.value);
                val = hadirArr.length > 0 ? hadirArr.join(', ') : '-';
            }
            
            barisDetail.push(val);
        });
        
        try {
            const res = await fetch(isEditMode ? `/api/data?id=${encodeURIComponent(editId)}` : '/api/data', {
                method: isEditMode ? 'PUT' : 'POST', headers: { 'Content-Type': 'application/json' }, 
                body: JSON.stringify({ barisPerkara, barisDetail, tanggalUpdate: formattedDate }) 
            });
            if(res.ok) { 
                alert(`Data berhasil ${isEditMode ? 'diupdate' : 'ditambahkan'}!`); 
                bootstrap.Modal.getInstance(document.getElementById('tambahDataModal')).hide(); 
                loadData(); 
            } 
            else { const err = await res.json(); alert('Gagal: ' + err.error); }
        } catch (e) { alert('Terjadi kesalahan koneksi.'); } finally { 
            btnSubmit.innerText = originalText; btnSubmit.disabled = false; 
        }
    });
}

function bukaModalTambah() {
    isEditMode = false; editId = null; document.getElementById('formTambahData').reset();
    
    // UPDATE: CLEAR SUMMERNOTE CONTENT
    if (typeof $ !== 'undefined') {
        $('.summernote-editor').each(function() {
            $(this).summernote('code', '');
            $(this).val('');
        });
    }

    document.getElementById('inputDetail_0').removeAttribute('readonly'); 
    
    document.querySelectorAll('select[id$="_select"]').forEach(s => s.value = '');
    document.querySelectorAll('input[id$="_other"]').forEach(o => { o.value = ''; o.classList.add('d-none'); });

    if(typeof window.applyStatusLogic === 'function') window.applyStatusLogic();
    
    document.getElementById('modalFormTitle').innerText = "Silahkan isi Sengketa Baru"; document.getElementById('modalFormHeader').className = "modal-header bg-success text-white";
    document.getElementById('btnSubmit').className = "btn btn-success w-100 mt-4 py-2 fw-bold"; document.getElementById('btnSubmit').innerText = "Simpan Data Baru";
    new bootstrap.Modal(document.getElementById('tambahDataModal')).show();
}

function bukaModalEdit(id) {
    isEditMode = true; editId = id;
    const rowP = perkaraData.find(r => r[0] === id) || [], rowD = detailData.find(r => r[0] === id) || [];
    
    sheetHeadersPerkara.forEach((h, i) => {
        const el = document.getElementById(`inputPerkara_${i}`); const val = rowP[i] || '';
        if (el) {
            // SET VALUE SUMMERNOTE ATAU INPUT BIASA
            if ($(el).hasClass('summernote-editor')) { 
                $(el).summernote('code', val); 
                $(el).val(val);
            } else if (el.type === 'date') {
                el.value = parseDate(val);
            } else {
                el.value = val;
            }
        }
        if ((`${h}`).toLowerCase().trim() === 'isu sengketa') syncIsuSengketaForEdit('inputPerkara', i, val);
    });
    
    sheetHeadersDetail.forEach((h, i) => {
        const el = document.getElementById(`inputDetail_${i}`); const val = rowD[i] || '';
        if (el) {
            if ((`${h}`).toLowerCase().trim() === 'kehadiran para pihak') {
                const cbPemohon = document.getElementById(`inputDetail_${i}_pemohon`);
                const cbTermohon = document.getElementById(`inputDetail_${i}_termohon`);
                const valStr = val || '';
                if (cbPemohon) cbPemohon.checked = valStr.includes('Pemohon');
                if (cbTermohon) cbTermohon.checked = valStr.includes('Termohon');
                el.value = valStr || '-';
            }
            // SET VALUE SUMMERNOTE ATAU INPUT BIASA
            else if ($(el).hasClass('summernote-editor')) { 
                $(el).summernote('code', val); 
                $(el).val(val);
            } else if (el.type === 'date') {
                el.value = parseDate(val);
            } else {
                el.value = val;
            }
        }
        if ((`${h}`).toLowerCase().trim() === 'isu sengketa') syncIsuSengketaForEdit('inputDetail', i, val);
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
    const pRow = perkaraData.find(r => r[0] === id);
    
    const getIndexPem = sheetHeadersPerkara.findIndex(h=>(`${h}`).toLowerCase().includes('pemohon'));
    const getIndexTerm = sheetHeadersPerkara.findIndex(h=>(`${h}`).toLowerCase().includes('termohon'));
    document.getElementById('detailModalTitle').innerText = pRow ? `${pRow[getIndexPem] || 'Pemohon'} vs ${pRow[getIndexTerm] || 'Termohon'}` : 'Detail Perkara';

    setTimeout(() => {
        const row = detailData.find(r => r[0] === id);
        const headerO = sheetHeadersDetail[13] ? sheetHeadersDetail[13].toLowerCase().trim() : null;
        const headerP = sheetHeadersDetail[14] ? sheetHeadersDetail[14].toLowerCase().trim() : null;
        
        const leftFields = ["no reg", "tgl register", "ketua majelis", "anggota 1", "anggota 2", "mediator", "panitera pengganti", "status sengketa"];
        if(headerO) leftFields.push(headerO);
        if(headerP) leftFields.push(headerP);
        leftFields.push("tgl sidang selanjutnya", "agenda sidang selanjutnya", "nomor putusan", "tgl diputuskan", "link putusan");
        
        let leftHtml = '<div class="col-md-6">';
        leftFields.forEach(f => {
            let fieldVal = '-', labelText = '';
            const findIdx = (headers) => headers.findIndex(h => { const val = (`${h}`).toLowerCase().trim(); return val === f || (f === 'no reg' && val === 'rincian informasi') || (f === 'sidang terakhir' && val === 'sidang'); });
            
            let idx = findIdx(sheetHeadersDetail);
            if(idx !== -1) { fieldVal = row ? (row[idx] || '-') : '-'; labelText = sheetHeadersDetail[idx]; } 
            else { idx = findIdx(sheetHeadersPerkara); if(idx !== -1) { fieldVal = pRow ? (pRow[idx] || '-') : '-'; labelText = sheetHeadersPerkara[idx]; } }

            if(idx !== -1) {
                if(f === 'no reg') labelText = 'No Reg'; if(f === 'sidang terakhir') labelText = 'Sidang Terakhir';
                if(f.includes('tgl') || f.includes('tanggal') || f.includes('sidang') || f === headerO) {
                    if (/^\d{4}-\d{2}-\d{2}$/.test(fieldVal)) { const p = fieldVal.split('-'); fieldVal = `${p[2]}/${p[1]}/${p[0]}`; }
                }
                if (f === 'link putusan' && fieldVal !== '-' && fieldVal !== '') fieldVal = `<a href="${!fieldVal.startsWith('http')?'https://'+fieldVal:fieldVal}" target="_blank" class="text-primary fw-bold text-decoration-none">Buka Putusan ↗</a>`;
                leftHtml += `<div class="card shadow-sm border-0 mb-2"><div class="card-body py-1 px-3"><div class="text-muted fw-bold d-block" style="font-size: 0.75rem;">${labelText}</div><div class="text-dark" style="font-size: 0.85rem;">${fieldVal}</div></div></div>`;
            }
        });
        leftHtml += '</div>';

        const pRowIndex = perkaraData.findIndex(r => r[0] === id);
        let latestUpdatedDate = '-';
        if (pRowIndex !== -1 && updateData[pRowIndex] && updateData[pRowIndex][0]) {
            latestUpdatedDate = updateData[pRowIndex][0];
        }
        if (document.getElementById('modalLastUpdated')) {
            document.getElementById('modalLastUpdated').innerText = "Data terakhir diperbarui tanggal: " + latestUpdatedDate;
        }

        const idxPermohonan = sheetHeadersDetail.findIndex(h => (`${h}`).toLowerCase().trim() === 'isi permohonan');
        let rightHtml = `<div class="col-md-6"><div class="card shadow-sm border-0"><div class="card-header bg-light fw-bold" style="font-size: 0.85rem;">Isi Permohonan</div><div class="card-body scrollable-box" style="font-size: 0.85rem;"><div class="text-dark">${idxPermohonan !== -1 ? (row ? row[idxPermohonan] || '-' : '-') : '-'}</div></div></div></div>`;
        document.getElementById('detailContent').innerHTML = leftHtml + rightHtml; document.getElementById('detailLoading').style.display = 'none';
    }, 500); 
}
function closeDetailModal() { const m = bootstrap.Modal.getInstance(document.getElementById('detailModal')); if(m) m.hide(); }
window.onload = loadData;

function bukaModalPassword() {
    const modal = new bootstrap.Modal(document.getElementById('ubahPasswordModal'));
    document.getElementById('formUbahPassword').reset();
    document.getElementById('passwordAlert').classList.add('d-none');
    modal.show();
}

async function submitUbahPassword(event) {
    event.preventDefault();
    const btn = document.getElementById('btnSubmitPassword');
    const alertBox = document.getElementById('passwordAlert');
    
    const currentPassword = document.getElementById('inputPasswordLama').value;
    const newPassword = document.getElementById('inputPasswordBaru').value;
    const confirmPassword = document.getElementById('inputKonfirmasiPassword').value;

    if (newPassword !== confirmPassword) {
        alertBox.className = 'alert alert-danger mt-3';
        alertBox.innerText = 'Password baru dan konfirmasi tidak cocok!';
        alertBox.classList.remove('d-none');
        return;
    }

    btn.disabled = true;
    btn.innerText = 'Menyimpan...';
    alertBox.classList.add('d-none');

    try {
        const response = await fetch('/api/auth/change-password', {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ currentPassword, newPassword })
        });

        const data = await response.json();

        if (response.ok) {
            alertBox.className = 'alert alert-success mt-3';
            alertBox.innerText = 'Password berhasil diubah! Silakan login kembali...';
            alertBox.classList.remove('d-none');
            
            setTimeout(() => {
                logout(); // Paksa user login ulang
            }, 2000);
        } else {
            alertBox.className = 'alert alert-danger mt-3';
            alertBox.innerText = data.error || 'Gagal mengubah password.';
            alertBox.classList.remove('d-none');
            btn.disabled = false;
            btn.innerText = 'Simpan Password Baru';
        }
    } catch (error) {
        alertBox.className = 'alert alert-danger mt-3';
        alertBox.innerText = 'Terjadi kesalahan jaringan.';
        alertBox.classList.remove('d-none');
        btn.disabled = false;
        btn.innerText = 'Simpan Password Baru';
    }
}



// ==== DASHBOARD LOGIC ====
function toggleSidebar() {
    document.getElementById('sidebar').classList.toggle('active');
}

function switchTab(tabName) {
    // Hide all sections
    document.getElementById('section-beranda').style.display = 'none';
    document.getElementById('section-manajemen').style.display = 'none';
    document.getElementById('section-pengaturan').style.display = 'none';
    
    // Remove active class from navs
    document.getElementById('nav-beranda').classList.remove('active');
    document.getElementById('nav-manajemen').classList.remove('active');
    document.getElementById('nav-pengaturan').classList.remove('active');
    
    // Show selected section
    document.getElementById('section-' + tabName).style.display = 'block';
    document.getElementById('nav-' + tabName).classList.add('active');
    
    if(tabName === 'beranda') {
        renderCharts();
    }
    
    // On mobile, close sidebar after clicking
    if(window.innerWidth <= 768) {
        document.getElementById('sidebar').classList.remove('active');
    }
}

let chartsRendered = false;
function renderCharts() {
    if(chartsRendered) return;
    
    // Dummy Data for Bar Chart
    const ctxBar = document.getElementById('barChart').getContext('2d');
    new Chart(ctxBar, {
        type: 'bar',
        data: {
            labels: ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agt', 'Sep', 'Okt', 'Nov', 'Des'],
            datasets: [{
                label: 'Jumlah Sengketa Masuk',
                data: [12, 19, 15, 25, 22, 30, 28, 15, 10, 18, 20, 31],
                backgroundColor: '#0d6efd',
                borderRadius: 4
            }]
        },
        options: {
            responsive: true,
            scales: {
                y: { beginAtZero: true }
            }
        }
    });

    // Dummy Data for Pie Chart
    const ctxPie = document.getElementById('pieChart').getContext('2d');
    new Chart(ctxPie, {
        type: 'doughnut',
        data: {
            labels: ['Selesai', 'Diproses', 'Ditolak'],
            datasets: [{
                data: [180, 42, 23],
                backgroundColor: ['#198754', '#ffc107', '#dc3545']
            }]
        },
        options: {
            responsive: true,
            plugins: {
                legend: { position: 'bottom' }
            }
        }
    });
    
    chartsRendered = true;
}

// Initial render
document.addEventListener('DOMContentLoaded', () => {
    if(document.getElementById('barChart')) {
        renderCharts();
    }
});



// ==== MAINTENANCE LOGIC ====
async function fetchMaintenanceStatus() {
    try {
        const res = await fetch('/api/settings/maintenance');
        const data = await res.json();
        const sw = document.getElementById('maintenanceSwitch');
        if(sw) {
            sw.checked = data.maintenance_mode;
        }
    } catch(e) {
        console.error('Failed to fetch maintenance status', e);
    }
}

let pendingMaintenanceStatus = null;

function toggleMaintenance(event) {
    const sw = document.getElementById('maintenanceSwitch');
    pendingMaintenanceStatus = sw.checked; // State already changed natively
    
    const confirmMsg = pendingMaintenanceStatus 
        ? 'Apakah Anda yakin ingin <b>MENYALAKAN</b> Mode Maintenance?<br><br>Pengunjung umum tidak akan bisa melihat data perkara dan akan dialihkan ke layar pemeliharaan.'
        : 'Apakah Anda yakin ingin <b>MEMATIKAN</b> Mode Maintenance?<br><br>Website akan kembali bisa diakses oleh publik secara normal.';

    document.getElementById('maintenanceModalBody').innerHTML = confirmMsg;
    new bootstrap.Modal(document.getElementById('maintenanceModal')).show();
}

function cancelMaintenanceToggle() {
    const sw = document.getElementById('maintenanceSwitch');
    if(pendingMaintenanceStatus !== null) {
        sw.checked = !pendingMaintenanceStatus; // Revert visually
        pendingMaintenanceStatus = null;
    }
}

async function executeMaintenanceToggle() {
    const sw = document.getElementById('maintenanceSwitch');
    if(pendingMaintenanceStatus === null) return;
    
    sw.disabled = true;
    const targetStatus = pendingMaintenanceStatus;
    const modalInstance = bootstrap.Modal.getInstance(document.getElementById('maintenanceModal'));
    
    try {
        const response = await fetch('/api/settings/maintenance', {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'same-origin',
            body: JSON.stringify({ status: targetStatus })
        });
        const data = await response.json();
        if(response.ok) {
            sw.checked = data.maintenance_mode;
            if(modalInstance) modalInstance.hide();
        } else {
            alert('Gagal mengubah status: ' + data.error);
            sw.checked = !targetStatus; // Revert visually
            if(modalInstance) modalInstance.hide();
        }
    } catch(e) {
        alert('Terjadi kesalahan jaringan.');
        sw.checked = !targetStatus; // Revert visually
        if(modalInstance) modalInstance.hide();
    } finally {
        sw.disabled = false;
        pendingMaintenanceStatus = null;
    }
}

document.addEventListener('DOMContentLoaded', fetchMaintenanceStatus);
