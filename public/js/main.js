// ... (Bagian atas file sama dengan sebelumnya)

function renderInput(headerText, idPrefix, index, isFirstDetail) {
    const id = `${idPrefix}_${index}`;
    const lowerHeader = headerText.toLowerCase();
    const hint = isFirstDetail ? `<small class="text-danger d-block mt-1">Otomatis sama dengan Utama</small>` : '';

    // Deteksi Header untuk Quill
    if (lowerHeader === 'rincian permohonan' || lowerHeader === 'isi permohonan') {
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

function initQuill(headers, idPrefix) {
    headers.forEach((header, index) => {
        const lower = header.toLowerCase();
        if (lower === 'rincian permohonan' || lower === 'isi permohonan') {
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

// ... (Sisa fungsi loadData, bukaModal, hapusData, dll tetap sama)
