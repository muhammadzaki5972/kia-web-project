// Cek status login hanya jika pengguna berada di halaman admin.html
if (window.location.pathname.includes('admin.html')) {
    if(!sessionStorage.getItem('isLoggedIn')) {
        window.location.href = 'login.html';
    }
}

function logout() {
    sessionStorage.removeItem('isLoggedIn');
    window.location.href = 'login.html';
}

// ... (Sisa kode fetch loadData dan formTambahData tetap sama seperti sebelumnya) ...
// Fungsi Load Data dari Backend
async function loadData() {
    const thead = document.getElementById('tableHeader');
    const tbody = document.getElementById('dataTable');
    
    try {
        const response = await fetch('/api/data');
        const data = await response.json();
        
        thead.innerHTML = '';
        tbody.innerHTML = '';

        if(data.length === 0) {
            tbody.innerHTML = '<tr><td colspan="5" class="text-center">Belum ada data</td></tr>';
            return;
        }

        // 1. BUAT HEADER DARI BARIS PERTAMA SPREADSHEET (Indeks 0)
        const headers = data[0]; 
        headers.forEach(headerText => {
            const th = document.createElement('th');
            th.textContent = headerText;
            thead.appendChild(th);
        });
        
        // Tambahkan kolom 'Aksi' di ujung header
        const thAksi = document.createElement('th');
        thAksi.textContent = 'Aksi';
        thead.appendChild(thAksi);

        // 2. BUAT ISI TABEL DARI BARIS KEDUA DAN SETERUSNYA
        const rows = data.slice(1);
        
        if(rows.length === 0) {
            tbody.innerHTML = `<tr><td colspan="${headers.length + 1}" class="text-center">Belum ada data</td></tr>`;
            return;
        }

        rows.forEach(row => {
            const tr = document.createElement('tr');
            let rowHtml = '';
            
            // Looping isi baris menyesuaikan jumlah kolom header
            for (let i = 0; i < headers.length; i++) {
                // Jika ini adalah kolom status (asumsi indeks ke-3 / kolom ke-4), berikan badge
                if (i === 3) {
                    rowHtml += `<td><span class="badge bg-info">${row[i] || '-'}</span></td>`;
                } else {
                    rowHtml += `<td>${row[i] || '-'}</td>`;
                }
            }
            
            // Tambahkan tombol aksi di ujung baris
            rowHtml += `
                <td>
                    <button class="btn btn-warning btn-sm">Edit</button>
                    <button class="btn btn-danger btn-sm">Hapus</button>
                </td>
            `;
            
            tr.innerHTML = rowHtml;
            tbody.appendChild(tr);
        });
    } catch (error) {
        tbody.innerHTML = `<tr><td colspan="5" class="text-danger">Gagal memuat data: ${error.message}</td></tr>`;
    }
}
