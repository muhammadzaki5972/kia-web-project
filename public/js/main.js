if (window.location.pathname.includes('admin.html') && !sessionStorage.getItem('isLoggedIn')) {
    window.location.href = 'login.html';
}

function logout() {
    sessionStorage.removeItem('isLoggedIn');
    window.location.href = 'login.html';
}

let sheetHeadersPerkara = [];
let sheetHeadersDetail = [];
let detailData = [];
let perkaraData = [];
let quillInstances = {}; 
let isEditMode = false;
let editId = null;

// Fungsi untuk membaca format tanggal dari Spreadsheet agar tidak kosong saat di-Edit
function parseDate(dateStr) {
    if (!dateStr || dateStr === '-') return '';
    if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) return dateStr; // Sudah format kalender (YYYY-MM-DD)
    
    const parts = dateStr.split(/[\/\-]/);
    if (parts.length === 3) {
        if (parts[2].length === 4) { // Format DD/MM/YYYY
            return `${parts[2]}-${parts[1].padStart(2, '0')}-${parts[0].padStart(2, '0')}`;
        } else if (parts[0].length === 4) { // Format YYYY/MM/DD
            return `${parts[0]}-${parts[1].padStart(2, '0')}-${parts[2].padStart(2, '0')}`;
        }
    }
    
    // Fallback sistem pembaca waktu otomatis
    const d = new Date(dateStr);
    if (!isNaN(d.getTime())) {
        const yyyy = d.getFullYear();
        const mm = String(d.getMonth() + 1).padStart(2, '0');
        const dd = String(d.getDate()).padStart(2, '0');
        return `${yyyy}-${mm}-${dd}`;
    }
    return ''; 
}

function renderInput(headerText, idPrefix, index, isFirstDetail) {
    // Override Nama Visual tanpa mengubah Spreadsheet aslinya
    let label = headerText;
    if (headerText.toLowerCase().trim() === 'sidang') label = 'Sidang Terakhir';
    if (headerText.toLowerCase().trim() === 'rincian informasi') label = 'No Reg';

    const id = `${idPrefix}_${index}`;
    const lowerHeader = label.toLowerCase().trim();
    const hint = isFirstDetail ? `<small class="text-danger d-block mt-1">Otomatis sinkron</small>` : '';

    if (lowerHeader === 'rincian permohonan' || lowerHeader === 'isi permohonan') {
        return `
            <div class="col-12 mb-3">
                <label class="form-label fw-bold">${label}</label>
                <div id="${id}_quill" style="height: 150px; background: white;"></div>
                <input type="hidden" id="${id}">
            </div>`;
    } else if (lowerHeader === 'status sengketa') {
        return `
            <div class="col-md-6 mb-3">
                <label class="form-label fw-bold">${label}</label>
                <select class="form-select status-dropdown" id="${id}" required>
                    <option value="" disabled selected>-- Pilih Status --</option>
                    <option value="Dalam Proses">Dalam Proses</option>
                    <option value="Selesai">Selesai</option>
                </select>
                ${hint}
            </div>`;
    } else if (lowerHeader.includes('tgl') || lowerHeader.includes('tanggal') || lowerHeader === 'sidang terakhir') {
        return `
            <div class="col-md-6 mb-3">
                <label class="form-label fw-bold">${label}</label>
                <input type="date" class="form-control" id="${id}" required>
                ${hint}
            </div>`;
    } else {
        return `
            <div class="col-md-6 mb-3">
                <label class="form-label fw-bold">${label}</label>
                <input type="text" class="form-control" id="${id}" required placeholder="Isi ${label}">
                ${hint}
            </div>`;
    }
}

function initQuill(headers, idPrefix) {
    headers.forEach((header, index) => {
        const lower = header.toLowerCase().trim();
        if (lower === 'rincian permohonan' || lower === 'isi permohonan') {
            const id = `${idPrefix}_${index}`;
            const el = document.getElementById(`${id}_quill`);
            if (el) {
                quillInstances[id] = new Quill(`#${id}_quill`, {
                    theme: 'snow',
                    modules: { toolbar: [['bold', 'italic', 'underline'], [{'list':'ordered'},{'list':'bullet'}]] }
                });
                quillInstances[id].on('text-change', () => {
                    document.getElementById(id).value = quillInstances[id].root.innerHTML;
                });
            }
        }
    });
}

// Fungsi Otomatis Mengunci/Membuka Kolom Link Putusan
function attachStatusLogic() {
    let statusIds = [], linkIds = [];
    
    sheetHeadersPerkara.forEach((h, i) => {
        if(h.toLowerCase().trim() === 'status sengketa') statusIds.push(`inputPerkara_${i}`);
        if(h.toLowerCase().trim() === 'link putusan') linkIds.push(`inputPerkara_${i}`);
    });
    sheetHeadersDetail.forEach((h, i) => {
        if(h.toLowerCase().trim() === 'status sengketa') statusIds.push(`inputDetail_${i}`);
        if(h.toLowerCase().trim() === 'link putusan') linkIds.push(`inputDetail_${i}`);
    });

    window.applyStatusLogic = () => {
        statusIds.forEach(sId => {
            const statusEl = document.getElementById(sId);
            if (!statusEl) return;
            
            linkIds.forEach(lId => {
                const linkEl = document.getElementById(lId);
                if (!linkEl) return;
                
                if(statusEl.value === 'Dalam Proses') {
                    linkEl.value = '-';
                    linkEl.setAttribute('readonly', true);
                    linkEl.removeAttribute('required');
                } else if (statusEl.value === 'Selesai') {
                    if(linkEl.value === '-') linkEl.value = '';
                    linkEl.removeAttribute('readonly');
                }
            });
        });
    };
    
    statusIds.forEach(sId => {
        const el = document.getElementById(sId);
        if(el) el.addEventListener('change', window.applyStatusLogic);
    });
}

async function loadData() {
    const thead = document.getElementById('tableHeader');
    const tbody = document.getElementById('dataTable');
    const formContainer = document.getElementById('dynamicFormContainer');
    
    try {
        const response = await fetch('/api/data');
        if (!response.ok) throw new Error('Gagal mengambil data dari server');
        const data = await response.json();
        
        thead.innerHTML = ''; tbody.innerHTML = ''; formContainer.innerHTML = '';

        if (!data.perkara || data.perkara.length === 0) {
            tbody.innerHTML = '<tr><td colspan="8" class="text-center">Spreadsheet kosong.</td></tr>'; 
            return;
        }

        sheetHeadersPerkara = data.perkara[0]; 
        sheetHeadersDetail = data.detail[0] || [];
        perkaraData = data.perkara.slice(1);
        detailData = data.detail.slice(1) || [];
        quillInstances = {}; 

        // Sembunyikan kolom Detail dari tabel utama
        const skipIdx = sheetHeadersPerkara.findIndex(h => h.toLowerCase().trim() === 'detail');
        
        sheetHeadersPerkara.forEach((h, i) => { 
            if(i !== skipIdx) { const th = document.createElement('th'); th.textContent = h; thead.appendChild(th); }
        });
        thead.innerHTML += `<th>Detail</th><th>Aksi</th>`;

        let formHtml = `<div class="card shadow-sm mb-4"><div class="card-header bg-secondary text-white fw-bold">Data Utama</div><div class="card-body row">`;
        sheetHeadersPerkara.forEach((h, i) => formHtml += renderInput(h, 'inputPerkara', i, false));
        formHtml += `</div></div><div class="card shadow-sm"><div class="card-header bg-info text-white fw-bold">Data Lengkap</div><div class="card-body row">`;
        sheetHeadersDetail.forEach((h, i) => formHtml += renderInput(h, 'inputDetail', i, i === 0));
        formHtml += `</div></div>`;
        formContainer.innerHTML = formHtml;

        initQuill(sheetHeadersPerkara, 'inputPerkara');
        initQuill(sheetHeadersDetail, 'inputDetail');
        attachStatusLogic(); 

        if(document.getElementById('inputPerkara_0')) {
            document.getElementById('inputPerkara_0').addEventListener('input', (e) => {
                const detailIdInput = document.getElementById('inputDetail_0');
                if(detailIdInput) detailIdInput.value = e.target.value;
            });
        }

        perkaraData.forEach(row => {
            let rowHtml = `<tr>`;
            for (let i = 0; i < sheetHeadersPerkara.length; i++) {
                if(i !== skipIdx) rowHtml += `<td>${row[i] || '-'}</td>`;
            }
            const rowId = row[0] || '';
            rowHtml += `<td><button type="button" class="btn btn-info btn-sm text-white py-0 shadow-sm" onclick="lihatDetail('${rowId}')">Lihat</button></td>`;
            rowHtml += `
                <td>
                    <button type="button" class="btn btn-warning btn-sm py-0 shadow-sm" onclick="bukaModalEdit('${rowId}')">Edit</button>
                    <button type="button" class="btn btn-danger btn-sm py-0 shadow-sm" onclick="hapusData('${rowId}')">Hapus</button>
                </td></tr>`;
            tbody.innerHTML += rowHtml;
        });
    } catch (error) { 
        console.error("Error loading data:", error);
        tbody.innerHTML = `<tr><td colspan="8" class="text-danger fw-bold text-center">Error: ${error.message}</td></tr>`; 
    }
}

document.getElementById('formTambahData').addEventListener('submit', async (e) => {
    e.preventDefault();
    const btnSubmit = document.getElementById('btnSubmit');
    btnSubmit.innerText = "Memproses..."; btnSubmit.disabled = true;

    let barisPerkara = [];
    sheetHeadersPerkara.forEach((_, i) => barisPerkara.push(document.getElementById(`inputPerkara_${i}`).value));

    let barisDetail = [];
    sheetHeadersDetail.forEach((_, i) => barisDetail.push(document.getElementById(`inputDetail_${i}`).value));

    const url = isEditMode ? `/api/data?id=${encodeURIComponent(editId)}` : '/api/data';
    const method = isEditMode ? 'PUT' : 'POST';

    try {
        const response = await fetch(url, {
            method: method,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ barisPerkara, barisDetail }) 
        });
        if(response.ok) {
            alert(`Data berhasil ${isEditMode ? 'diupdate' : 'ditambahkan'}!`);
            bootstrap.Modal.getInstance(document.getElementById('tambahDataModal')).hide();
            loadData(); 
        } else { const err = await response.json(); alert('Gagal: ' + err.error); }
    } catch (error) { alert('Terjadi kesalahan koneksi.'); } 
    finally { btnSubmit.innerText = isEditMode ? "Simpan Perubahan" : "Simpan Data Baru"; btnSubmit.disabled = false; }
});

function bukaModalTambah() {
    isEditMode = false; editId = null;
    document.getElementById('formTambahData').reset();
    Object.values(quillInstances).forEach(q => q.setContents([]));
    document.getElementById('inputDetail_0').removeAttribute('readonly'); 
    
    if(typeof window.applyStatusLogic === 'function') window.applyStatusLogic();
    new bootstrap.Modal(document.getElementById('tambahDataModal')).show();
}

function bukaModalEdit(id) {
    isEditMode = true; editId = id;
    const rowP = perkaraData.find(r => r[0] === id) || [];
    const rowD = detailData.find(r => r[0] === id) || [];

    sheetHeadersPerkara.forEach((h, i) => {
        const inputId = `inputPerkara_${i}`;
        const val = rowP[i] || '';
        const el = document.getElementById(inputId);
        if(quillInstances[inputId]) {
            quillInstances[inputId].clipboard.dangerouslyPasteHTML(val);
            document.getElementById(inputId).value = val;
        } else if (el) {
            if (el.type === 'date') el.value = parseDate(val);
            else el.value = val;
        }
    });

    sheetHeadersDetail.forEach((h, i) => {
        const inputId = `inputDetail_${i}`;
        const val = rowD[i] || '';
        const el = document.getElementById(inputId);
        if(quillInstances[inputId]) {
            quillInstances[inputId].clipboard.dangerouslyPasteHTML(val);
            document.getElementById(inputId).value = val;
        } else if (el) {
            if (el.type === 'date') el.value = parseDate(val);
            else el.value = val;
        }
    });

    document.getElementById('inputDetail_0').setAttribute('readonly', true); 
    if(typeof window.applyStatusLogic === 'function') window.applyStatusLogic();
    
    document.getElementById('modalFormTitle').innerText = `Edit Data Perkara: ${id}`;
    document.getElementById('modalFormHeader').className = "modal-header bg-warning text-dark";
    document.getElementById('btnSubmit').className = "btn btn-warning w-100 mt-4 py-2 fw-bold text-dark";
    document.getElementById('btnSubmit').innerText = "Simpan Perubahan";

    new bootstrap.Modal(document.getElementById('tambahDataModal')).show();
}

async function hapusData(id) {
    if(!confirm(`Yakin ingin menghapus ${id}?`)) return;
    const res = await fetch(`/api/data?id=${encodeURIComponent(id)}`, { method: 'DELETE' });
    if(res.ok) loadData(); else alert("Gagal");
}

function lihatDetail(id) {
    const modalEl = document.getElementById('detailModal');
    const modal = new bootstrap.Modal(modalEl);
    modal.show();
    
    document.getElementById('detailLoading').style.display = 'flex';
    document.getElementById('detailContent').innerHTML = '';

    const pRow = perkaraData.find(r => r[0] === id);
    const idxPemohon = sheetHeadersPerkara.findIndex(h => h.toLowerCase().includes('pemohon'));
    const idxTermohon = sheetHeadersPerkara.findIndex(h => h.toLowerCase().includes('termohon'));
    document.getElementById('detailModalTitle').innerText = pRow ? `${pRow[idxPemohon] || 'Pemohon'} vs ${pRow[idxTermohon] || 'Termohon'}` : 'Detail Perkara';

    setTimeout(() => {
        const row = detailData.find(r => r[0] === id);
        if(!row) {
            document.getElementById('detailContent').innerHTML = '<div class="col-12 text-center text-muted">Data detail tidak ditemukan.</div>';
            document.getElementById('detailLoading').style.display = 'none';
            return;
        }

        const leftFields = ["rincian informasi", "no reg", "ketua majelis", "anggota 1", "anggota 2", "mediator", "panitera pengganti", "status sengketa", "sidang", "sidang terakhir", "link putusan"];
        
        let leftHtml = '<div class="col-md-6">';

        leftFields.forEach(f => {
            const idx = sheetHeadersDetail.findIndex(h => h.toLowerCase().trim() === f);
            if(idx !== -1) {
                let fieldVal = row ? (row[idx] || '-') : '-';
                
                let labelText = sheetHeadersDetail[idx];
                if(labelText.toLowerCase().trim() === 'sidang') labelText = 'Sidang Terakhir';
                if(labelText.toLowerCase().trim() === 'rincian informasi') labelText = 'No Reg';

                if (f === 'link putusan' && fieldVal !== '-') {
                    let linkUrl = fieldVal;
                    if (!linkUrl.startsWith('http')) linkUrl = 'https://' + linkUrl;
                    fieldVal = `<a href="${linkUrl}" target="_blank" class="text-primary fw-bold text-decoration-none">Buka Putusan ↗</a>`;
                }

                leftHtml += `
                <div class="card shadow-sm border-0 mb-2">
                    <div class="card-body py-1 px-3">
                        <div class="text-muted fw-bold d-block" style="font-size: 0.75rem;">${labelText}</div>
                        <div class="text-dark" style="font-size: 0.85rem;">${fieldVal}</div>
                    </div>
                </div>`;
            }
        });
        leftHtml += '</div>';

        const idxPermohonan = sheetHeadersDetail.findIndex(h => h.toLowerCase().trim() === 'isi permohonan');
        let rightHtml = `
            <div class="col-md-6">
                <div class="card shadow-sm border-0">
                    <div class="card-header bg-light fw-bold" style="font-size: 0.85rem;">Isi Permohonan</div>
                    <div class="card-body scrollable-box" style="font-size: 0.85rem;">
                        <div class="text-dark">${idxPermohonan !== -1 ? (row[idxPermohonan] || '-') : '-'}</div>
                    </div>
                </div>
            </div>`;

        document.getElementById('detailContent').innerHTML = leftHtml + rightHtml;
        document.getElementById('detailLoading').style.display = 'none';
    }, 500); 
}

function closeDetailModal() {
    const modal = bootstrap.Modal.getInstance(document.getElementById('detailModal'));
    if(modal) modal.hide();
}

window.onload = loadData;
