// Cek status login sederhana
if(!sessionStorage.getItem('isLoggedIn')) {
    window.location.href = 'login.html';
}

function logout() {
    sessionStorage.removeItem('isLoggedIn');
    window.location.href = 'login.html';
}

// Fungsi Load Data dari Backend
async function loadData() {
    const tbody = document.getElementById('dataTable');
    try {
        const response = await fetch('/api/data');
        const data = await response.json();
        
        tbody.innerHTML = '';
        if(data.length === 0) {
            tbody.innerHTML = '<tr><td colspan="5" class="text-center">Belum ada data</td></tr>';
            return;
        }

        data.forEach(row => {
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td>${row[0] || '-'}</td>
                <td>${row[1] || '-'}</td>
                <td>${row[2] || '-'}</td>
                <td><span class="badge bg-info">${row[3] || '-'}</span></td>
                <td>
                    <button class="btn btn-warning btn-sm">Edit</button>
                    <button class="btn btn-danger btn-sm">Hapus</button>
                </td>
            `;
            tbody.appendChild(tr);
        });
    } catch (error) {
        tbody.innerHTML = `<tr><td colspan="5" class="text-danger">Gagal memuat data: ${error.message}</td></tr>`;
    }
}

// Fungsi Submit Data Baru
document.getElementById('formTambahData').addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const newData = {
        id: document.getElementById('inputId').value,
        nama: document.getElementById('inputNama').value,
        instansi: document.getElementById('inputInstansi').value,
        status: document.getElementById('inputStatus').value
    };

    try {
        const response = await fetch('/api/data', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(newData)
        });

        if(response.ok) {
            alert('Data berhasil disimpan ke Google Sheets!');
            document.getElementById('formTambahData').reset();
            // Tutup modal bootstrap
            const modal = bootstrap.Modal.getInstance(document.getElementById('tambahDataModal'));
            modal.hide();
            loadData(); // Refresh tabel
        }
    } catch (error) {
        alert('Terjadi kesalahan: ' + error.message);
    }
});

// Panggil fungsi saat halaman dimuat
window.onload = loadData;