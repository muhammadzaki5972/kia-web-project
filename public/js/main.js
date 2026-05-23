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

async function loadData() {
    const thead = document.getElementById('tableHeader');
    const tbody = document.getElementById('dataTable');
    const formContainer = document.getElementById('dynamicFormContainer');
    
    try {
        const response = await fetch('/api/data');
        const data = await response.json();
        
        if (!response.ok || data.error) throw new Error(data.error || 'Terjadi kesalahan API');

        thead.innerHTML = '';
        tbody.innerHTML = '';
        formContainer.innerHTML = '';

        if (!data.perkara || data.perkara.length === 0) {
            tbody.innerHTML = '<tr><td colspan="8" class="text-center">Spreadsheet kosong.</td></tr>';
            return;
        }

        // Simpan Data Global
        sheetHeadersPerkara = data.perkara[0]; 
        sheetHeadersDetail = data.detail[0] || [];
        detailData = data.detail.slice(1) || [];
        
        // --- 1. GENERATE TABLE HEADER ---
        sheetHeadersPerkara.forEach((headerText) => {
            const th = document.createElement('th');
            th.textContent = headerText;
            thead.appendChild(th);
        });
        const thDetail = document.createElement('th'); thDetail.textContent = 'Detail'; thead.appendChild(thDetail);
        const thAksi = document.createElement('th'); thAksi.textContent = 'Aksi'; thead.appendChild(thAksi);

        // --- 2. GENERATE FORM INPUT MULTIPLE SHEET ---
        // Form Utama (DataPerkara)
        let formHtml = `<div class="card shadow-sm mb-4"><div class="card-header bg-secondary text-white fw-bold">Data Utama (Tabel Depan)</div><div class="card-body row">`;
        sheetHeadersPerkara.forEach((headerText, index) => {
            formHtml += `
                <div class="col-md-6 mb-3">
                    <label class="form-label fw-bold">${headerText}</label>
                    <input type="text" class="form-control" id="inputPerkara_${index}" required placeholder="Isi ${headerText}">
                </div>`;
        });
        formHtml += `</div></div>`;

        // Form Detail (detail)
        formHtml += `<div class="card shadow-sm"><div class="card-header bg-info text-white fw-bold">Data Lengkap (Pop Up Detail)</div><div class="card-body row">`;
        sheetHeadersDetail.forEach((headerText, index) => {
            // Berikan petunjuk khusus untuk kolom pertama agar sama dengan DataPerkara
            let hint = index === 0 ? `<small class="text-danger d-block">Wajib sama persis dengan ${sheetHeadersPerkara[0]} di atas</small>` : '';
            formHtml += `
                <div class="col-md-6 mb-3">
                    <label class="form-label fw-bold">${headerText}</label>
                    <input type="text" class="form-control border-info" id="inputDetail_${index}" required placeholder="Isi ${headerText}">
                    ${hint}
                </div>`;
        });
        formHtml += `</div></div>`;
        formContainer.innerHTML = formHtml;

        // --- 3. GENERATE TABLE BODY ---
        const rows = data.perkara.slice(1);
        if(rows.length === 0) {
            tbody.innerHTML = `<tr><td colspan="${sheetHeadersPerkara.length + 2}" class="text-center text-muted">Belum ada data.</td></tr>`;
            return;
        }

        rows.forEach(row => {
            const tr = document.createElement('tr');
            let rowHtml = '';
            
            for (let i = 0; i < sheetHeadersPerkara.length; i++) {
                rowHtml += `<td>${row[i] || '-'}</td>`;
            }
            
            // Tombol Lihat
            const rowId = row[0] || '';
            rowHtml += `<td><button class="btn btn-info btn-sm text-white fw-bold shadow-sm" onclick="lihatDetail('${rowId}')">Lihat</button></td>`;
            
            // Tombol Edit/Hapus
            rowHtml += `
                <td>
                    <button class="btn btn-warning btn-sm disabled">Edit</button>
                    <button class="btn btn-danger btn-sm disabled">Hapus</button>
                </td>
            `;
            tr.innerHTML = rowHtml;
            tbody.appendChild(tr);
        });
    } catch (error) {
        tbody.innerHTML = `<tr><td colspan="8" class="text-danger fw-bold text-center">Error: ${error.message}</td></tr>`;
    }
}

// Menangani Submit 2 Array
document.getElementById('formTambahData').addEventListener('submit', async (e) => {
    e.preventDefault();
    const btnSubmit = document.getElementById('btnSubmit');
    btnSubmit.innerText = "Menyimpan ke 2 Sheet...";
    btnSubmit.disabled = true;

    let barisPerkara = [];
    for (let i = 0; i < sheetHeadersPerkara.length; i++) barisPerkara.push(document.getElementById(`inputPerkara_${i}`).value);

    let barisDetail = [];
    for (let i = 0; i < sheetHeadersDetail.length; i++) barisDetail.push(document.getElementById(`inputDetail_${i}`).value);

    try {
        const response = await fetch('/api/data', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ barisPerkara, barisDetail }) 
        });

        if(response.ok) {
            alert('Data Perkara Utama & Detail berhasil ditambahkan!');
            document.getElementById('formTambahData').reset();
            const modal = bootstrap.Modal.getInstance(document.getElementById('tambahDataModal'));
            modal.hide();
            loadData(); 
        } else {
            const errData = await response.json();
            alert('Gagal: ' + errData.error);
        }
    } catch (error) {
        alert('Terjadi kesalahan koneksi.');
    } finally {
        btnSubmit.innerText = "Simpan ke Google Sheets";
        btnSubmit.disabled = false;
    }
});

// --- FUNGSI MODAL DETAIL UNTUK ADMIN ---
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
                            <small class="text-muted fw-bold d-block">${header}</small>
                            <span class="fs-6">${row[i] || '-'}</span>
                        </div>
                    </div>
                </div>`;
            });
        } else {
            html = '<div class="col-12 text-center text-muted py-5">Data detail belum diinput.</div>';
        }
        document.getElementById('detailContent').innerHTML = html;
        document.getElementById('detailLoading').style.display = 'none';
    }, 600); 
}

function closeDetailModal() {
    document.getElementById('detailLoading').style.display = 'flex';
    setTimeout(() => {
        const modal = bootstrap.Modal.getInstance(document.getElementById('detailModal'));
        if(modal) modal.hide();
        document.getElementById('detailLoading').style.display = 'none';
    }, 400); 
}

if (window.location.pathname.includes('admin.html')) {
    window.onload = loadData;
}
