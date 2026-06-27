        let sheetHeadersPerkara = [], perkaraData = [], detailHeaders = [], detailData = [], updateData = [];
        
        let filteredData = [];
        let currentPage = 1;
        const rowsPerPage = 15;

        async function loadPublicData() {
            const container = document.getElementById('publicDataContainer');
            if (!container) return;
            try {
                container.innerHTML = '<div class="text-center py-5" id="loadingStatus"><div class="spinner-border text-primary" role="status"></div><p class="mt-3 text-muted fw-bold poppins-font">Memuat Data Sengketa...</p></div>';
                const response = await fetch('/api/data');
                if (!response.ok) throw new Error(`Gagal terhubung ke server (HTTP Status: ${response.status})`);
                const textData = await response.text();
                let data;
                try { data = JSON.parse(textData); } catch (e) { throw new Error("Format respons dari server tidak valid."); }
                
                if (!data || !data.perkara || data.perkara.length <= 1) { 
                    container.innerHTML = '<div class="text-center py-5 bg-white rounded-4 shadow-sm fade-in-up border"><p class="text-muted fw-bold mb-0 poppins-font fs-5"><i class="bi bi-inbox me-2"></i> Belum ada data sengketa yang tersedia.</p></div>'; return; 
                }

                sheetHeadersPerkara = data.perkara[0] || []; perkaraData = data.perkara.slice(1) || []; 
                detailHeaders = (data.detail && data.detail[0]) ? data.detail[0] : []; detailData = (data.detail && data.detail.length > 1) ? data.detail.slice(1) : [];
                updateData = (data.update && data.update.length > 1) ? data.update.slice(1) : [];
                
                filteredData = [...perkaraData];
                renderTable();

            } catch (error) { 
                container.innerHTML = `<div class="text-center py-5 my-4 border border-danger rounded-4 bg-white shadow-sm fade-in-up"><h5 class="text-danger fw-bold poppins-font"><i class="bi bi-exclamation-triangle-fill fs-3 d-block mb-2"></i> Gagal Memuat Data</h5><p class="text-muted mb-4">${error.message}</p><button class="btn btn-outline-danger px-4 fw-bold rounded-pill shadow-sm" onclick="loadPublicData()">Coba Muat Ulang</button></div>`; 
            }
        }

        function filterTable() {
            const query = document.getElementById('searchInput').value.toLowerCase().trim();
            const statusVal = document.getElementById('statusFilter').value.toLowerCase().trim();
            
            const idxPem = sheetHeadersPerkara.findIndex(h => (`${h}`).toLowerCase().includes('pemohon'));
            const idxTerm = sheetHeadersPerkara.findIndex(h => (`${h}`).toLowerCase().includes('termohon'));
            
            const idxStatusDetail = detailHeaders.findIndex(h => (`${h}`).toLowerCase().includes('status sengketa'));
            const statusColIndex = idxStatusDetail !== -1 ? idxStatusDetail : 7; 

            filteredData = perkaraData.filter(row => {
                const id = row[0]; 
                
                let matchText = false;
                if (query === '') {
                    matchText = true;
                } else if (idxPem !== -1 || idxTerm !== -1) {
                    const pemohon = (idxPem !== -1 && row[idxPem]) ? (`${row[idxPem]}`).toLowerCase() : '';
                    const termohon = (idxTerm !== -1 && row[idxTerm]) ? (`${row[idxTerm]}`).toLowerCase() : '';
                    matchText = pemohon.includes(query) || termohon.includes(query);
                } else {
                    matchText = row.some(cell => cell && (`${cell}`).toLowerCase().includes(query));
                }

                let matchStatus = false;
                if (statusVal === '') {
                    matchStatus = true;
                } else {
                    const detailRow = detailData.find(d => d[0] === id);
                    if (detailRow && detailRow[statusColIndex]) {
                        const status = (`${detailRow[statusColIndex]}`).toLowerCase();
                        matchStatus = status.includes(statusVal);
                    } else if (detailRow) {
                        matchStatus = detailRow.some(cell => cell && (`${cell}`).toLowerCase().includes(statusVal));
                    }
                }
                
                return matchText && matchStatus;
            });

            currentPage = 1;
            renderTable();
        }

        function clearSearch() { 
            document.getElementById('searchInput').value = ''; 
            document.getElementById('statusFilter').value = ''; 
            filterTable(); 
        }

        function renderTable() {
            const container = document.getElementById('publicDataContainer');
            const skipIdx = sheetHeadersPerkara.findIndex(h => (`${h}`).toLowerCase().trim() === 'detail');
            
            let tableHtml = `<div class="shadow-sm table-elegant-wrapper fade-in-up"><div class="table-responsive"><table class="table table-bordered table-hover mb-0 align-middle"><thead class="table-soft-header poppins-font"><tr>`;
            
            tableHtml += `<th class="py-3 px-3 text-center align-middle" style="width: 50px;">No.</th>`;
            sheetHeadersPerkara.forEach((h, i) => { if(i !== skipIdx) tableHtml += `<th class="py-3 px-3 align-middle">${h || '-'}</th>`; });
            tableHtml += `<th class="py-3 px-3 text-center align-middle">Tindakan</th></tr></thead><tbody id="dataTable">`;

            const startIndex = (currentPage - 1) * rowsPerPage;
            const endIndex = startIndex + rowsPerPage;

            if (filteredData.length === 0) {
                tableHtml += `<tr><td colspan="${sheetHeadersPerkara.length + 1}" class="text-center py-5 text-muted fw-bold"><i class="bi bi-search fs-3 d-block mb-2 text-secondary"></i>Tidak ada data yang sesuai dengan pencarian.</td></tr>`;
            } else {
                const pageData = filteredData.slice(startIndex, endIndex);

                pageData.forEach((row, index) => {
                    if (!row || row.length === 0) return; 
                    const absoluteIndex = startIndex + index + 1; 
                    tableHtml += `<tr>`;
                    tableHtml += `<td class="px-3 py-3 text-center fw-bold text-secondary">${absoluteIndex}</td>`;
                    
                    for (let i = 0; i < sheetHeadersPerkara.length; i++) { 
                        if(i !== skipIdx) {
                            let cellData = row[i] || '-';
                            const cellLower = cellData.toLowerCase().trim();
                            
                            const isStatusColumn = (sheetHeadersPerkara[i] && sheetHeadersPerkara[i].toLowerCase().includes('status'));
                            if (isStatusColumn || cellLower === 'selesai' || cellLower === 'dalam proses' || cellLower === 'proses') {
                                if (cellLower.includes('selesai')) cellData = `<span class="badge bg-success shadow-sm rounded-pill px-3 py-2 fw-semibold">${cellData}</span>`;
                                else if (cellLower.includes('proses')) cellData = `<span class="badge bg-warning text-dark shadow-sm rounded-pill px-3 py-2 fw-semibold">${cellData}</span>`;
                            }
                            tableHtml += `<td class="px-3 py-3 text-nowrap">${cellData}</td>`; 
                        }
                    }
                    tableHtml += `<td class="px-3 py-3 text-center"><button class="btn btn-info btn-sm text-dark fw-bold shadow-sm py-1 px-3 rounded-pill d-flex align-items-center justify-content-center mx-auto hover-lift" onclick="lihatDetail('${row[0] || ''}')"><i class="bi bi-eye-fill me-1"></i> Lihat</button></td></tr>`;
                });
            }
            
            tableHtml += `</tbody></table></div></div>`;

            const totalPages = Math.ceil(filteredData.length / rowsPerPage);
            if (totalPages > 1) {
                tableHtml += `
                <div class="d-flex justify-content-center justify-content-md-between align-items-center mt-4 flex-wrap gap-3 fade-in-up">
                    <div class="text-muted fs-7 poppins-font ms-1 fw-semibold text-center text-md-start w-100 w-md-auto">
                        Menampilkan baris ${filteredData.length > 0 ? startIndex + 1 : 0} - ${Math.min(endIndex, filteredData.length)} dari ${filteredData.length} data
                    </div>
                    <nav aria-label="Navigasi Halaman Data">
                        <ul class="pagination pagination-sm mb-0 shadow-sm rounded-pill overflow-hidden bg-white">
                            <li class="page-item ${currentPage === 1 ? 'disabled' : ''}">
                                <a class="page-link fw-bold px-3 py-2" href="javascript:void(0)" onclick="changePage(${currentPage - 1})">Sebelumnya</a>
                            </li>`;

                let startPage = Math.max(1, currentPage - 2);
                let endPage = Math.min(totalPages, startPage + 4);
                if (endPage - startPage < 4) { startPage = Math.max(1, endPage - 4); }

                for (let i = startPage; i <= endPage; i++) {
                    tableHtml += `<li class="page-item ${currentPage === i ? 'active' : ''}">
                                    <a class="page-link fw-bold px-3 py-2" href="javascript:void(0)" onclick="changePage(${i})">${i}</a>
                                  </li>`;
                }

                tableHtml += `      <li class="page-item ${currentPage === totalPages ? 'disabled' : ''}">
                                <a class="page-link fw-bold px-3 py-2" href="javascript:void(0)" onclick="changePage(${currentPage + 1})">Selanjutnya</a>
                            </li>
                        </ul>
                    </nav>
                </div>`;
            }

            container.innerHTML = tableHtml;
        }

        function changePage(page) {
            const totalPages = Math.ceil(filteredData.length / rowsPerPage);
            if (page < 1 || page > totalPages) return;
            currentPage = page;
            renderTable();
            
            const searchBox = document.getElementById('publicDataContainer');
            if (searchBox) {
                const y = searchBox.getBoundingClientRect().top + window.pageYOffset - 120;
                window.scrollTo({top: y, behavior: 'smooth'});
            }
        }

        function lihatDetail(id) {
            new bootstrap.Modal(document.getElementById('detailModal')).show();
            document.getElementById('detailLoading').style.display = 'block'; document.getElementById('detailContent').innerHTML = '';
            document.getElementById('detailModalSubtitle').innerHTML = '';

            const pRow = perkaraData.find(r => r[0] === id);
            const getIndexPem = sheetHeadersPerkara.findIndex(h=>(`${h}`).toLowerCase().includes('pemohon'));
            const getIndexTerm = sheetHeadersPerkara.findIndex(h=>(`${h}`).toLowerCase().includes('termohon'));
            
            setTimeout(() => {
                const row = detailData.find(r => r[0] === id);
                
                const headerO = detailHeaders[14] ? detailHeaders[14].toLowerCase().trim() : 'tgl sidang sebelumnya';
                const headerP = detailHeaders[15] ? detailHeaders[15].toLowerCase().trim() : 'agenda sidang sebelumnya';

                const getField = (f, forceDetailIdx = -1) => {
                    let fieldVal = '-', labelText = f;
                    const findIdx = (headers) => headers.findIndex(h => { 
                        if(!h) return false;
                        const val = (`${h}`).toLowerCase().trim(); 
                        return val === f || 
                               (f === 'status sengketa' && val.includes('status')) || 
                               (f === 'no reg' && val === 'rincian informasi') || 
                               (f === 'isi permohonan' && val === 'rincian permohonan') ||
                               (f === 'tgl register' && val === 'tanggal register'); 
                    });

                    let idx = findIdx(detailHeaders);
                    
                    if(idx !== -1) { 
                        fieldVal = row ? (row[idx] || '-') : '-'; 
                        labelText = detailHeaders[idx]; 
                    } else if (forceDetailIdx !== -1) {
                        idx = forceDetailIdx;
                        fieldVal = row ? (row[idx] || '-') : '-';
                        labelText = detailHeaders[idx] || f;
                    } else { 
                        idx = findIdx(sheetHeadersPerkara); 
                        if(idx !== -1) { 
                            fieldVal = pRow ? (pRow[idx] || '-') : '-'; 
                            labelText = sheetHeadersPerkara[idx]; 
                        } 
                    }

                    if(idx !== -1 || forceDetailIdx !== -1) {
                        if(f === 'no reg') labelText = 'No Register'; 
                        if(f === 'tgl register') labelText = 'Tgl Register';
                        
                        if(f.includes('tgl') || f.includes('tanggal') || f.includes('sidang') || f === headerO) {
                            if (/^\d{4}-\d{2}-\d{2}$/.test(fieldVal)) { const p = fieldVal.split('-'); fieldVal = `${p[2]}/${p[1]}/${p[0]}`; }
                        }
                        if (f === 'link putusan' && fieldVal !== '-' && fieldVal !== '') fieldVal = `<a href="${!fieldVal.startsWith('http')?'https://'+fieldVal:fieldVal}" target="_blank" class="text-primary fw-bold text-decoration-none">Buka Putusan <i class="bi bi-box-arrow-up-right"></i></a>`;
                        return { label: labelText, val: fieldVal };
                    }
                    return null;
                };

                const dataNoReg = getField('no reg');
                const dataTglReg = getField('tgl register');
                
                const titleText = pRow ? `<span class="text-dark poppins-font">${pRow[getIndexPem] || 'Pemohon'}</span> <span class="text-danger mx-1 poppins-font">vs</span> <span class="text-dark poppins-font">${pRow[getIndexTerm] || 'Termohon'}</span>` : 'Detail Perkara';
                document.getElementById('detailModalTitle').innerHTML = titleText;
                
                document.getElementById('detailModalSubtitle').innerHTML = `
                    <div class="d-flex flex-wrap justify-content-center px-2">
                        <span class="badge bg-white text-dark border shadow-sm rounded-pill d-flex align-items-center"><i class="bi bi-hash text-muted me-1"></i> Reg: ${dataNoReg ? dataNoReg.val : '-'}</span>
                        <span class="badge bg-white text-dark border shadow-sm rounded-pill d-flex align-items-center"><i class="bi bi-calendar3 text-muted me-1"></i> Tgl: ${dataTglReg ? dataTglReg.val : '-'}</span>
                    </div>`;

                const col1Groups = [
                    { class: "", fields: [{ key: "status sengketa" }] },
                    { class: "info-box-gray", fields: [{ key: headerO, idx: 14 }, { key: headerP, idx: 15 }] }, 
                    { class: "info-box-green", fields: [{ key: "tgl sidang selanjutnya" }, { key: "agenda sidang selanjutnya" }] },
                    { class: "", fields: [{ key: "nomor putusan" }, { key: "tgl diputuskan" }, { key: "link putusan" }] }
                ];
                
                const col2Groups = [
                    { class: "", fields: [{ key: "ketua majelis" }, { key: "anggota 1" }, { key: "anggota 2" }] },
                    { class: "", fields: [{ key: "mediator" }] },
                    { class: "", fields: [{ key: "panitera pengganti" }] }
                ];

                const col3Groups = [
                    { class: "", fields: [{ key: "isu sengketa" }] },
                    { class: "bg-transparent border-0 shadow-none px-0 text-start", fields: [{ key: "isi permohonan" }] }
                ];

                let htmlContent = '<div class="row">';

                let htmlCol1 = `<div class="col-lg-4 mb-4 mb-lg-0"><div class="card shadow-sm border-0 rounded-4 h-100"><div class="card-header bg-white border-bottom fw-bold text-center py-3 poppins-font" style="color: #002b5e; font-size: 1rem;"><i class="bi bi-calendar-check text-info me-2"></i>Agenda & Jadwal</div><div class="card-body d-flex flex-column justify-content-start text-center py-3 px-3">`;
                col1Groups.forEach(grp => {
                    let groupHtml = `<div class="info-group-wrapper ${grp.class}">`;
                    let hasValidField = false;
                    grp.fields.forEach(fObj => {
                        const data = getField(fObj.key, fObj.idx);
                        if (data) {
                            hasValidField = true;
                            let displayVal = data.val;
                            const fLower = fObj.key.toLowerCase().trim();

                            if (fLower === 'status sengketa') {
                                const statusStr = displayVal.toLowerCase();
                                if (statusStr.includes('selesai')) displayVal = `<span class="badge bg-success shadow-sm px-3 py-2 mt-1 fs-7 rounded-pill">${displayVal}</span>`;
                                else if (statusStr.includes('dalam proses')) displayVal = `<span class="badge bg-warning text-dark shadow-sm px-3 py-2 mt-1 fs-7 rounded-pill">${displayVal}</span>`;
                                else if (displayVal !== '-') displayVal = `<span class="badge bg-secondary shadow-sm px-3 py-2 mt-1 fs-7 rounded-pill">${displayVal}</span>`;
                            }
                            
                            groupHtml += `<div class="mb-2"><div class="info-label">${data.label}</div><div class="info-value">${displayVal}</div></div>`;
                        }
                    });
                    groupHtml += `</div>`;
                    if (hasValidField) htmlCol1 += groupHtml;
                });
                htmlCol1 += `</div></div></div>`;

                let htmlCol2 = `<div class="col-lg-4 mb-4 mb-lg-0"><div class="card shadow-sm border-0 rounded-4 h-100"><div class="card-header bg-white border-bottom fw-bold text-center py-3 poppins-font" style="color: #002b5e; font-size: 1rem;"><i class="bi bi-people text-info me-2"></i>Perangkat Persidangan</div><div class="card-body d-flex flex-column justify-content-start text-center py-3 px-3">`;
                col2Groups.forEach(grp => {
                    let groupHtml = `<div class="info-group-wrapper ${grp.class}">`;
                    let hasValidField = false;
                    grp.fields.forEach(fObj => {
                        const data = getField(fObj.key);
                        if(data) {
                            hasValidField = true;
                            groupHtml += `<div class="mb-2"><div class="info-label">${data.label}</div><div class="info-value">${data.val}</div></div>`;
                        }
                    });
                    groupHtml += `</div>`;
                    if(hasValidField) htmlCol2 += groupHtml;
                });
                htmlCol2 += `</div></div></div>`;

                let htmlCol3 = `<div class="col-lg-4 mb-0"><div class="card shadow-sm border-0 rounded-4 h-100"><div class="card-header bg-white border-bottom fw-bold text-center py-3 poppins-font" style="color: #002b5e; font-size: 1rem;"><i class="bi bi-file-earmark-text text-info me-2"></i>Rincian Sengketa</div><div class="card-body card-rincian d-flex flex-column justify-content-start text-center py-3 px-3">`;
                let foundCol3 = false;
                col3Groups.forEach((grp, index) => {
                    let groupHtml = `<div class="info-group-wrapper ${grp.class}">`;
                    let hasValidField = false;
                    grp.fields.forEach(fObj => {
                        const data = getField(fObj.key);
                        if(data && data.val !== '-') {
                            hasValidField = true;
                            foundCol3 = true;
                            if (index === 1) { 
                                groupHtml += `<div class="mb-1"><div class="info-label text-start" style="border-bottom: 1px dashed #dee2e6; padding-bottom: 6px; margin-bottom: 8px;">${data.label}</div><div class="info-value text-start fw-normal lh-base">${data.val}</div></div>`;
                            } else {
                                groupHtml += `<div class="mb-2"><div class="info-label">${data.label}</div><div class="info-value">${data.val}</div></div>`;
                            }
                        }
                    });
                    groupHtml += `</div>`;
                    if(hasValidField) htmlCol3 += groupHtml;
                });
                
                if(!foundCol3) htmlCol3 += `<div class="text-center text-muted mt-4"><i class="bi bi-inbox fs-1 d-block mb-2 text-light"></i><span style="font-size: 0.9rem;">Belum ada rincian data</span></div>`;
                htmlCol3 += `</div></div></div>`;

                htmlContent += htmlCol1 + htmlCol2 + htmlCol3 + '</div>';

                const dRowIndex = detailData.findIndex(r => r[0] === id);
                let currentViews = 0;
                
                if (dRowIndex !== -1 && detailData[dRowIndex][16]) {
                    currentViews = parseInt(detailData[dRowIndex][16]) || 0;
                }
                
                currentViews += 1;
                if (dRowIndex !== -1) detailData[dRowIndex][16] = currentViews;
                
                const viewCountEl = document.getElementById('modalViewCount');
                if (viewCountEl) viewCountEl.innerText = `Dilihat: ${currentViews} kali`;

                fetch(`/api/view/${encodeURIComponent(id)}`, { method: 'PATCH' })
                    .catch(err => console.log('Analytics Error:', err));

                const pRowIndex = perkaraData.findIndex(r => r[0] === id);
                let latestUpdatedDate = '-';
                if (pRowIndex !== -1 && updateData[pRowIndex] && updateData[pRowIndex][0]) latestUpdatedDate = updateData[pRowIndex][0];
                if (document.getElementById('modalLastUpdated')) document.getElementById('modalLastUpdated').innerText = "DIPERBARUI: " + latestUpdatedDate.toUpperCase();
                
                document.getElementById('detailContent').innerHTML = htmlContent; 
                document.getElementById('detailLoading').style.display = 'none';
            }, 500); 
        }

        function closeDetailModal() { bootstrap.Modal.getInstance(document.getElementById('detailModal')).hide(); }
        document.addEventListener('DOMContentLoaded', loadPublicData);

        const btnScrollTop = document.getElementById('btnScrollTop');
        window.addEventListener('scroll', () => {
            if (document.body.scrollTop > 300 || document.documentElement.scrollTop > 300) btnScrollTop.style.display = "flex";
            else btnScrollTop.style.display = "none";
        });
        function scrollToTop() { window.scrollTo({ top: 0, behavior: 'smooth' }); }
