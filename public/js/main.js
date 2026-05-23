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

// Fungsi Render Input Dinamis
function renderInput(headerText, idPrefix, index, isFirstDetail) {
    const id = `${idPrefix}_${index}`;
    const lowerHeader = headerText.toLowerCase();
    const hint = isFirstDetail ? `<small class="text-danger d-block mt-1">Otomatis sama dengan Utama</small>` : '';

    if (lowerHeader === 'rincian permohonan') {
        return `
            <div class="col-12 mb-3">
                <label class="form-label fw-bold">${headerText}</label>
                <div id="${id}_quill" style="height: 150px; background: white; border-radius:0 0 5px 5px;"></div>
                <input type="hidden" id="${id}">
            </div>`;
    } else if (lowerHeader.includes('tgl') || lowerHeader.includes('tanggal')) {
        return `
            <div class="col-md-6 mb-3">
                <label class="form-label fw-bold">${headerText}</label>
                <input type="date" class="form-control" id="${id}" required>
            </div>`;
    } else {
        return `
            <div class="col-md-6 mb-3">
                <label class="form-label fw-bold">${headerText}</label>
                <input type="text" class="form-control" id="${id}" required placeholder="Isi ${headerText}">
                ${hint}
            </div>`;
    }
}

// Inisialisasi Text Editor
function initQuill(headers, idPrefix) {
    headers.forEach((header, index) => {
        if (header.toLowerCase() === 'rincian permohonan') {
            const id = `${idPrefix}_${index}`;
            quillInstances[id] = new Quill(`#${id}_quill`, {
                theme: 'snow',
                modules: { toolbar: [['bold', 'italic', 'underline'], [{'list':'ordered'},{'list':'bullet'}]] }
            });
            quillInstances[id].on('text-change', () => {
                document.getElementById(id).value = quillInstances[id].root.innerHTML;
            });
        }
    });
}

async function loadData() {
    const thead = document.getElementById('tableHeader');
    const tbody = document.getElementById('dataTable');
    const formContainer = document.getElementById('dynamicFormContainer');
    
    try {
        const response = await fetch('/api/data');
        const data = await response.json();
        
        thead.innerHTML = ''; tbody.innerHTML = ''; formContainer.innerHTML = '';
        if (!data.perkara || data.perkara.length === 0) {
            tbody.innerHTML = '<tr><td colspan="8" class="text-center">Spreadsheet kosong.</td></tr>'; return;
        }

        sheetHeadersPerkara = data.perkara[0]; 
        sheetHeadersDetail = data.detail[0] || [];
        perkaraData = data.perkara.slice(1);
        detailData = data.detail.slice(1) || [];
        quillInstances = {}; 
        
        // --- BUAT HEADER ---
        sheetHeadersPerkara.forEach((h) => { const th = document.createElement('th'); th.textContent = h; thead.appendChild(th); });
        thead.innerHTML += `<th>Detail</th><th>Aksi</th>`;

        // --- BUAT FORM INPUT ---
        let formHtml = `<div class="card shadow-sm mb-4"><div class="card-header bg-secondary text-white fw-bold">Data Utama</div><div class="card-body row">`;
        sheetHeadersPerkara.forEach((h, i) => formHtml += renderInput(h, 'inputPerkara', i, false));
        formHtml += `</div></div><div class="card shadow-sm"><div class="card-header bg-info text-white fw-bold">Data Lengkap</div><div class="card-body row">`;
        sheetHeadersDetail.forEach((h, i) => formHtml += renderInput(h, 'inputDetail', i, i === 0));
        formHtml += `</div></div>`;
        formContainer.innerHTML = formHtml;

        initQuill(sheetHeadersPerkara, 'inputPerkara');
        initQuill(sheetHeadersDetail, 'inputDetail');

        // Khusus sinkronisasi ID otomatis pada form detail
        document.getElementById('inputPerkara_0').addEventListener('input', (e) => {
            const detailIdInput = document.getElementById('inputDetail_0');
            if(detailIdInput) detailIdInput.value = e.target.value;
        });

        // --- BUAT ISI TABEL ---
        if(perkaraData.length === 0) {
            tbody.innerHTML = `<tr><td colspan="${sheetHeadersPerkara.length + 2}" class="text-center text-muted">Belum ada data.</td></tr>`; return;
        }

        perkaraData.forEach(row => {
            let rowHtml = `<tr>`;
            for (let i = 0; i < sheetHeadersPerkara.length; i++) rowHtml += `<td>${row[i] || '-'}</td>`;
            const rowId = row[0] || '';
            
            // Perbaikan: Tombol lihat di admin kini aktif dan memanggil fungsi lihatDetail
            rowHtml += `<td><button class="btn btn-info btn-sm text-white py-0 shadow-sm" onclick="lihatDetail('${rowId}')">Lihat</button></td>`;
            
            // Tombol Edit dan Hapus
            rowHtml += `
                <td>
                    <button class="btn btn-warning btn-sm py-0 shadow-sm" onclick="bukaModalEdit('${rowId}')">Edit</button>
                    <button class="btn btn-danger btn-sm py-0 shadow-sm" onclick="hapusData('${rowId}')">Hapus</button>
                </td></tr>`;
            tbody.innerHTML += rowHtml;
        });
    } catch (error) { tbody.innerHTML = `<tr><td colspan="8" class="text-danger fw-bold text-center">Error: ${error.message}</td></tr>`; }
}

// Buka Modal Tambah
function bukaModalTambah() {
    isEditMode = false; editId = null;
    document.getElementById('formTambahData').reset();
    Object.values(quillInstances).forEach(q => q.setContents([])); 
    
    document.getElementById('modalFormTitle').innerText = "Input Data Perkara Baru";
    document.getElementById('modalFormHeader').className = "modal-header bg-success text-white";
    document.getElementById('btnSubmit').className = "btn btn-success w-100 mt-4 py-2 fw-bold";
    document.getElementById('btnSubmit').innerText = "Simpan Data Baru";
    
    // Perbaikan: Membuat input detail 0 tidak bisa diketik manual (otomatis ikut form utama)
    document.getElementById('inputDetail_0').setAttribute('readonly', true);
    
    new bootstrap.Modal(document.getElementById('tambahDataModal')).show();
}

// Buka Modal Edit dan Isi Form
function bukaModalEdit(id) {
    isEditMode = true; editId = id;
    const rowP = perkaraData.find(r => r[0] === id) || [];
    const rowD = detailData.find(r => r[0] === id) || [];

    sheetHeadersPerkara.forEach((h, i) => {
        const inputId = `inputPerkara_${i}`;
        if(quillInstances[inputId]) {
            quillInstances[inputId].clipboard.dangerouslyPasteHTML(rowP[i] || '');
            document.getElementById(inputId).value = rowP[i] || ''; // Trigger hidden input
        } else { document.getElementById(inputId).value = rowP[i] || ''; }
    });

    sheetHeadersDetail.forEach((h, i) => {
        const inputId = `inputDetail_${i}`;
        if(quillInstances[inputId]) {
            quillInstances[inputId].clipboard.dangerouslyPasteHTML(rowD[i] || '');
            document.getElementById(inputId).value = rowD[i] || ''; // Trigger hidden input
        } else { document.getElementById(inputId).value = rowD[i] || ''; }
    });

    document.getElementById('modalFormTitle').innerText = `Edit Data Perkara: ${id}`;
    document.getElementById('modalFormHeader').className = "modal-header bg-warning text-dark";
    document.getElementById('btnSubmit').className = "btn btn-warning w-100 mt-4 py-2 fw-bold text-dark";
    document.getElementById('btnSubmit').innerText = "Simpan Perubahan";
    document.getElementById('inputDetail_0').setAttribute('readonly', true);
    
    new bootstrap.Modal(document.getElementById('tambahDataModal')).show();
}

// Hapus Data
async function hapusData(id) {
    if(!confirm(`PERINGATAN: Apakah Anda yakin ingin menghapus data dengan Register "${id}" secara permanen?`)) return;
    try {
        // Perbaikan encodeURIComponent agar kebal terhadap slash (/)
        const response = await fetch(`/api/data?id=${encodeURIComponent(id)}`, { method: 'DELETE' });
        if(response.ok) { alert('Data berhasil dihapus!'); loadData(); } 
        else { const err = await response.json(); alert('Gagal menghapus: ' + err.error); }
    } catch (error) { alert('Terjadi kesalahan koneksi.'); }
}

// Submit Form (Tambah atau Edit)
document.getElementById('formTambahData').addEventListener('submit', async (e) => {
    e.preventDefault();
    const btnSubmit = document.getElementById('btnSubmit');
    const originalText = btnSubmit.innerText;
    btnSubmit.innerText = "Memproses..."; btnSubmit.disabled = true;

    let barisPerkara = [];
    for (let i = 0; i < sheetHeadersPerkara.length; i++) barisPerkara.push(document.getElementById(`inputPerkara_${i}`).value);

    let barisDetail = [];
    for (let i = 0; i < sheetHeadersDetail.length; i++) barisDetail.push(document.getElementById(`inputDetail_${i}`).value);

    // Perbaikan URI Component
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
    finally { btnSubmit.innerText = originalText; btnSubmit.disabled = false; }
});

// --- FUNGSI MODAL DETAIL (Dikombalikan agar bisa ditutup) ---
function lihatDetail(id) {
    const modalEl = document.getElementById('detailModal');
    const modal = new bootstrap.Modal(modalEl);
    modal.show();
    
    document.getElementById('detailLoading').style.display = 'flex';
    document.getElementById('detailContent').innerHTML = '';

    setTimeout(() => {
        const row = detailData.find(r => r[0] === id);
        let html = '';
        if(row) {
            sheetHeadersDetail.forEach((header, i) => {
                html += `
                <div class="col-md-6 mb-3">
                    <div class="card shadow-sm border-0 h-100">
                        <div class="card-body py-2">
                            <small class="text-muted fw-bold d-block mb-1">${header}</small>
                            <div class="text-dark" style="font-size: 0.9rem;">${row[i] || '-'}</div>
                        </div>
                    </div>
                </div>`;
            });
        } else {
            html = '<div class="col-12 text-center text-muted py-5">Data detail belum diinput.</div>';
        }
        document.getElementById('detailContent').innerHTML = html;
        document.getElementById('detailLoading').style.display = 'none';
    }, 500); 
}

function closeDetailModal() {
    document.getElementById('detailLoading').style.display = 'flex';
    setTimeout(() => {
        const modal = bootstrap.Modal.getInstance(document.getElementById('detailModal'));
        if(modal) modal.hide();
        document.getElementById('detailLoading').style.display = 'none';
    }, 300); 
}

if (window.location.pathname.includes('admin.html')) window.onload = loadData;
