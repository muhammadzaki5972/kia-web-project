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
