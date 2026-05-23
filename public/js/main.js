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
// Fungsi Load Data dari Backend
async function loadData() {
    const thead = document.getElementById('tableHeader');
    const tbody = document.getElementById('dataTable');
    
    try {
        const response = await fetch('/api/data');
        const data = await response.json();
        
        // PENTING: Cek apakah server mengembalikan pesan error
        if (!response.ok || data.error) {
            throw new Error(data.error || 'Terjadi kesalahan saat mengambil data API');
        }

        thead.innerHTML = '';
        tbody.innerHTML = '';

        // Cek apakah data benar-benar kosong
        if (!data || data.length === 0) {
            tbody.innerHTML = '<tr><td colspan="5" class="text-center">Belum ada data di Spreadsheet</td></tr>';
            return;
        }

        // 1. BUAT HEADER
        const headers = data[0]; 
        if (!headers) {
             throw new Error('Baris pertama di Spreadsheet kosong. Harap isi judul kolom!');
        }

        headers.forEach(headerText => {
            const th = document.createElement('th');
            th.textContent = headerText;
            thead.appendChild(th);
        });
        
        const thAksi = document.createElement('th');
        thAksi.textContent = 'Aksi';
        thead.appendChild(thAksi);

        // 2. BUAT ISI TABEL
        const rows = data.slice(1);
        
        if(rows.length === 0) {
            tbody.innerHTML = `<tr><td colspan="${headers.length + 1}" class="text-center">Belum ada baris data di bawah header</td></tr>`;
            return;
        }

        rows.forEach(row => {
            const tr = document.createElement('tr');
            let rowHtml = '';
            
            for (let i = 0; i < headers.length; i++) {
                if (i === 3) {
                    rowHtml += `<td><span class="badge bg-info">${row[i] || '-'}</span></td>`;
                } else {
                    rowHtml += `<td>${row[i] || '-'}</td>`;
                }
            }
            
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
        // Tampilkan error aslinya di dalam tabel agar kita tahu masalahnya
        thead.innerHTML = '';
        tbody.innerHTML = `<tr><td colspan="5" class="text-danger fw-bold text-center">Gagal memuat: ${error.message}</td></tr>`;
        console.error("Detail Error:", error);
    }
}
