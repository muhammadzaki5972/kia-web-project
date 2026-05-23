// Proteksi Halaman
if (window.location.pathname.includes('admin.html') && !sessionStorage.getItem('isLoggedIn')) {
    window.location.href = 'login.html';
}

function logout() {
    sessionStorage.removeItem('isLoggedIn');
    window.location.href = 'login.html';
}

// Variabel Global untuk menyimpan nama kolom dari Sheet A1:F1
let sheetHeaders = [];

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

        if (!data || data.length === 0) {
            tbody.innerHTML = '<tr><td colspan="7" class="text-center">Spreadsheet kosong.</td></tr>';
            return;
        }

        // 1. BUAT HEADER TABEL & FORM INPUT (Dari baris 1)
        sheetHeaders = data[0]; 
        
        sheetHeaders.forEach((headerText, index) => {
            // Generate Table Header
            const th = document.createElement('th');
            th.textContent = headerText;
            thead.appendChild(th);

            // Generate Form Input secara dinamis
            formContainer.innerHTML += `
                <div class="mb-3">
                    <label class="form-label fw-bold">${headerText}</label>
                    <input type="text" class="form-control" id="inputCol_${index}" required placeholder="Masukkan ${headerText}">
                </div>
            `;
        });
        
        // Kolom aksi tambahan untuk tabel
        const thAksi = document.createElement('th');
        thAksi.textContent = 'Aksi';
        thead.appendChild(thAksi);

        // 2. BUAT ISI TABEL (Dari baris 2 dst)
        const rows = data.slice(1);
        
        if(rows.length === 0) {
            tbody.innerHTML = `<tr><td colspan="${sheetHeaders.length + 1}" class="text-center">Belum ada data perkara</td></tr>`;
            return;
        }

        rows.forEach(row => {
            const tr = document.createElement('tr');
            let rowHtml = '';
            
            for (let i = 0; i < sheetHeaders.length; i++) {
                rowHtml += `<td>${row[i] || '-'}</td>`;
            }
            
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
        tbody.innerHTML = `<tr><td colspan="7" class="text-danger fw-bold text-center">Error: ${error.message}</td></tr>`;
        console.error(error);
    }
}

// Menangani Submit Form Dinamis
document.getElementById('formTambahData').addEventListener('submit', async (e) => {
    e.preventDefault();
    const btnSubmit = document.getElementById('btnSubmit');
    btnSubmit.innerText = "Menyimpan...";
    btnSubmit.disabled = true;

    // Kumpulkan data dari 6 form input yang dibuat dinamis tadi
    let barisBaru = [];
    for (let i = 0; i < sheetHeaders.length; i++) {
        barisBaru.push(document.getElementById(`inputCol_${i}`).value);
    }

    try {
        const response = await fetch('/api/data', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ barisData: barisBaru }) // Kirim sebagai array
        });

        if(response.ok) {
            alert('Data Perkara berhasil ditambahkan!');
            document.getElementById('formTambahData').reset();
            const modal = bootstrap.Modal.getInstance(document.getElementById('tambahDataModal'));
            modal.hide();
            loadData(); // Refresh Data
        } else {
            const errData = await response.json();
            alert('Gagal: ' + errData.error);
        }
    } catch (error) {
        alert('Terjadi kesalahan koneksi.');
    } finally {
        btnSubmit.innerText = "Simpan ke Spreadsheet";
        btnSubmit.disabled = false;
    }
});

if (window.location.pathname.includes('admin.html')) {
    window.onload = loadData;
}
