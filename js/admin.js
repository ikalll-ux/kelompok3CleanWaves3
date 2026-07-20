// ==========================================================================
// CleanWaves Admin — admin.js
// Simulasi database memakai localStorage (belum backend sungguhan).
//
// localStorage keys yang dipakai bersama antar halaman:
//   laundry_members          -> daftar member & riwayat cuci
//   laundry_orders           -> nota resmi (terbit setelah ditimbang admin
//                                ATAU langsung saat customer order online),
//                                dibaca juga oleh tracking.js untuk pelacakan
//   laundry_income           -> akumulasi pemasukan harian
//   laundry_services         -> data master Layanan & Harga,
//                                dibaca juga oleh harga.js & order.js
//   laundry_pickup_requests  -> pengajuan penjemputan online dari order.js
// ==========================================================================

// --- GLOBAL STATE ---
let members = JSON.parse(localStorage.getItem('laundry_members')) || [
    { id: "MEM-001", name: "Haikal", historyCount: 5 },
    { id: "MEM-002", name: "Ahmad Dani", historyCount: 2 },
    { id: "MEM-003", name: "Dewi Lestari", historyCount: 0 }
];

let orders = JSON.parse(localStorage.getItem('laundry_orders')) || {};
let dailyIncome = parseInt(localStorage.getItem('laundry_income')) || 0;

let services = JSON.parse(localStorage.getItem('laundry_services')) || [
    { id: "reguler", name: "Cuci Kiloan Reguler", unit: "kg", price: 10000, eta: "2 - 3 Hari" },
    { id: "kilat", name: "Cuci Kiloan Kilat", unit: "kg", price: 18000, eta: "24 Jam" },
    { id: "satuan", name: "Cuci Satuan Kemeja", unit: "pcs", price: 15000, eta: "2 Hari" },
    { id: "jas", name: "Cuci Jas Premium", unit: "pcs", price: 65000, eta: "3 Hari" },
    { id: "bedcover", name: "Bed Cover Large", unit: "pcs", price: 35000, eta: "2 Hari" }
];
if (!localStorage.getItem('laundry_services')) {
    localStorage.setItem('laundry_services', JSON.stringify(services));
}

// Render semua panel saat halaman admin dibuka
document.addEventListener('DOMContentLoaded', () => {
    renderQueueList();
    updateIncomeDisplay();
    renderServiceOptions();
    renderServiceTable();
    renderPickupRequests();
});

// --------------------------------------------------------------------------
// AUTO-REFRESH: dengarkan perubahan localStorage dari tab/halaman lain
// (mis. customer submit order baru dari order.html di tab berbeda), lalu
// sinkronkan ulang state & render ulang panel terkait — supaya admin tidak
// perlu reload manual untuk melihat orderan/permintaan terbaru.
// --------------------------------------------------------------------------
window.addEventListener('storage', (e) => {
    if (e.key === 'laundry_orders') {
        orders = JSON.parse(localStorage.getItem('laundry_orders')) || {};
        renderQueueList();
        updateIncomeDisplay();
    }
    if (e.key === 'laundry_pickup_requests') {
        renderPickupRequests();
    }
    if (e.key === 'laundry_members') {
        members = JSON.parse(localStorage.getItem('laundry_members')) || members;
    }
    if (e.key === 'laundry_services') {
        services = JSON.parse(localStorage.getItem('laundry_services')) || services;
        renderServiceOptions();
        renderServiceTable();
    }
});

// Fallback: saat tab admin kembali aktif/difokuskan, sinkronkan lagi.
document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') {
        orders = JSON.parse(localStorage.getItem('laundry_orders')) || {};
        members = JSON.parse(localStorage.getItem('laundry_members')) || members;
        renderQueueList();
        updateIncomeDisplay();
        renderPickupRequests();
    }
});

// ==========================================================================
// MEMBER REGISTRATION
// ==========================================================================
function registerMember(e) {
    e.preventDefault();
    const name = document.getElementById('regNama').value.trim();
    const cardId = document.getElementById('regKartu').value.trim().toUpperCase();

    if (members.some(m => m.id === cardId)) {
        alert("Nomor Kartu Member sudah terdaftar!");
        return;
    }

    members.push({ id: cardId, name: name, historyCount: 0 });
    localStorage.setItem('laundry_members', JSON.stringify(members));

    alert(`Member Baru Berhasil Terdaftar!\nNama: ${name}\nID Kartu: ${cardId}`);
    document.getElementById('regMemberForm').reset();
}

// ==========================================================================
// SEARCH MEMBER WITH SUGGESTIONS (INISIAL NAMA / NOMOR KARTU)
// ==========================================================================
function searchMember() {
    const input = document.getElementById('searchMemberInput').value.toLowerCase();
    const suggestionBox = document.getElementById('memberSuggestions');

    if (input === "") {
        suggestionBox.classList.add('hidden');
        return;
    }

    const filtered = members.filter(m => m.name.toLowerCase().includes(input) || m.id.toLowerCase().includes(input));

    if (filtered.length === 0) {
        suggestionBox.innerHTML = `<div class="p-2 text-xs text-slate-400 italic">Member tidak ditemukan</div>`;
        suggestionBox.classList.remove('hidden');
        return;
    }

    suggestionBox.innerHTML = filtered.map(m => `
        <div onclick="selectMemberForTransaction('${m.id}', '${m.name}', ${m.historyCount})" class="suggestion-item">
            <span class="font-medium">${m.name} (${m.id})</span>
            <span class="text-slate-400">Riwayat: ${m.historyCount}x cuci</span>
        </div>
    `).join('');

    suggestionBox.classList.remove('hidden');
}

function selectMemberForTransaction(id, name, historyCount) {
    document.getElementById('selectedCustomer').value = `${name} (${id})`;
    document.getElementById('selectedCustomerId').value = id;
    document.getElementById('memberSuggestions').classList.add('hidden');
    document.getElementById('searchMemberInput').value = "";

    calculateDiscountLogic();
}

// ==========================================================================
// PERMINTAAN PENJEMPUTAN ONLINE (dari order.html, belum ditimbang)
// ==========================================================================
function renderPickupRequests() {
    const container = document.getElementById('pickupRequestList');
    if (!container) return;
    const requests = JSON.parse(localStorage.getItem('laundry_pickup_requests') || '{}');
    const keys = Object.keys(requests);

    if (keys.length === 0) {
        container.innerHTML = `<p class="text-xs text-slate-400 italic text-center py-2">Belum ada permintaan online masuk.</p>`;
        return;
    }

    container.innerHTML = keys.map(key => {
        const r = requests[key];
        return `
            <div class="pickup-request-item">
                <div>
                    <span class="font-mono font-bold">${r.id}</span> — <span class="font-semibold">${r.nama}</span>
                    <p class="text-slate-500 mt-0.5">${r.layanan} • ${r.estimasiJumlah} • WA: ${r.wa}</p>
                </div>
                <div class="flex gap-1 shrink-0">
                    <button onclick="usePickupRequest('${r.id}')" class="bg-sky-600 hover:bg-sky-700 text-white px-2 py-1 rounded-lg">Proses</button>
                    <button onclick="removePickupRequest('${r.id}')" class="bg-slate-200 hover:bg-slate-300 text-slate-700 px-2 py-1 rounded-lg">Hapus</button>
                </div>
            </div>
        `;
    }).join('');
}

// Isi form transaksi dari permintaan online. originalRequestId disimpan supaya
// saat transaksi disimpan, nomor struknya SAMA dengan yang sudah dipegang
// pelanggan (bukan bikin struk baru) — jadi pelacakan tetap nyambung.
function usePickupRequest(reqId) {
    const requests = JSON.parse(localStorage.getItem('laundry_pickup_requests') || '{}');
    const r = requests[reqId];
    if (!r) return;

    document.getElementById('selectedCustomer').value = r.nama;
    document.getElementById('selectedCustomerId').value = "";
    document.getElementById('originalRequestId').value = reqId;
    document.getElementById('transaksiForm').scrollIntoView({ behavior: 'smooth', block: 'center' });
    calculateDiscountLogic();
}

function removePickupRequest(reqId) {
    const requests = JSON.parse(localStorage.getItem('laundry_pickup_requests') || '{}');
    delete requests[reqId];
    localStorage.setItem('laundry_pickup_requests', JSON.stringify(requests));
    renderPickupRequests();
}

// ==========================================================================
// DATA MASTER: LAYANAN & HARGA
// ==========================================================================
function renderServiceOptions() {
    const select = document.getElementById('serviceSelect');
    if (!select) return;
    select.innerHTML = services.map(s =>
        `<option value="${s.id}">${s.name} - Rp ${s.price.toLocaleString('id-ID')} / ${s.unit}</option>`
    ).join('');
    calculateDiscountLogic();
}

function renderServiceTable() {
    const tbody = document.getElementById('serviceTableBody');
    if (!tbody) return;
    tbody.innerHTML = services.map(s => `
        <tr>
            <td class="p-2.5 font-medium">${s.name}</td>
            <td class="p-2.5">${s.unit}</td>
            <td class="p-2.5">Rp ${s.price.toLocaleString('id-ID')}</td>
            <td class="p-2.5">${s.eta}</td>
            <td class="p-2.5 text-right"><button onclick="removeService('${s.id}')" class="text-rose-500 hover:underline text-[11px]">Hapus</button></td>
        </tr>
    `).join('');
}

function addService(e) {
    e.preventDefault();
    const name = document.getElementById('svcName').value.trim();
    const unit = document.getElementById('svcUnit').value;
    const price = parseInt(document.getElementById('svcPrice').value);
    const eta = document.getElementById('svcEta').value.trim();

    const id = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '') || ("svc-" + Date.now());

    services.push({ id, name, unit, price, eta });
    localStorage.setItem('laundry_services', JSON.stringify(services));

    renderServiceOptions();
    renderServiceTable();
    document.getElementById('serviceForm').reset();
}

function removeService(id) {
    services = services.filter(s => s.id !== id);
    localStorage.setItem('laundry_services', JSON.stringify(services));
    renderServiceOptions();
    renderServiceTable();
}

// ==========================================================================
// TAB NAVIGASI: MANAJEMEN DATA MASTER
// ==========================================================================
function switchAdminTab(tabId) {
    document.querySelectorAll('.admin-tab-panel').forEach(panel => panel.classList.add('hidden'));
    document.querySelectorAll('.admin-tab-btn').forEach(btn => btn.classList.remove('active'));

    document.getElementById(tabId).classList.remove('hidden');
    document.getElementById('btn-' + tabId).classList.add('active');
}

// ==========================================================================
// KALKULASI DISKON (KELIPATAN 5 KALI CUCI, KHUSUS LAYANAN SATUAN KG)
// ==========================================================================
function calculateDiscountLogic() {
    const custId = document.getElementById('selectedCustomerId').value;
    const weight = parseFloat(document.getElementById('weightInput').value) || 0;
    const payWeightField = document.getElementById('payWeightInput');
    const discountAlert = document.getElementById('discountAlert');
    const weightLabel = document.getElementById('weightLabel');
    const payWeightLabel = document.getElementById('payWeightLabel');

    const svcId = document.getElementById('serviceSelect').value;
    const svc = services.find(s => s.id === svcId) || services[0];
    const unit = svc ? svc.unit : 'kg';

    weightLabel.innerText = `Berat/Jumlah Asli (${unit})`;
    payWeightLabel.innerText = `Berat/Jumlah Dibayar (${unit})`;

    // Diskon riwayat 5x cuci hanya relevan untuk layanan bersatuan kg
    if (!custId || unit !== 'kg') {
        discountAlert.classList.add('hidden');
        payWeightField.value = weight;
        return;
    }

    const member = members.find(m => m.id === custId);
    const isEligibleHistory = member && member.historyCount > 0 && member.historyCount % 5 === 0;

    // Syarat: kelipatan 5x cuci berhak potongan 2 kg, minimal cucian 5 kg
    if (isEligibleHistory && weight >= 5) {
        discountAlert.classList.remove('hidden');
        discountAlert.innerHTML = `🎉 Member berhak GRATIS potongan 2 kg (transaksi ke-${member.historyCount + 1}, syarat minimal 5 kg terpenuhi)!`;
        payWeightField.value = Math.max(0, weight - 2);
    } else if (isEligibleHistory && weight < 5) {
        discountAlert.classList.remove('hidden');
        discountAlert.innerHTML = `⚠️ Member berhak GRATIS 2 kg di transaksi ke-${member.historyCount + 1}, namun syarat minimal cucian 5 kg belum terpenuhi (saat ini ${weight || 0} kg).`;
        payWeightField.value = weight;
    } else {
        discountAlert.classList.add('hidden');
        payWeightField.value = weight;
    }
}

// ==========================================================================
// TRANSACTION PROCESSING
// ==========================================================================
function processTransaction(e) {
    e.preventDefault();
    const custNameVal = document.getElementById('selectedCustomer').value;
    const custId = document.getElementById('selectedCustomerId').value;
    const originalRequestId = document.getElementById('originalRequestId').value;
    const weight = parseFloat(document.getElementById('weightInput').value);
    const payWeight = parseFloat(document.getElementById('payWeightInput').value);

    const svcId = document.getElementById('serviceSelect').value;
    const svc = services.find(s => s.id === svcId);

    const opData = document.getElementById('operatorSelect').value.split('|');
    const realOperatorName = opData[0];
    const anonymizedOperatorCode = opData[1];

    if (!custNameVal) {
        alert("Silakan pilih pelanggan/member terlebih dahulu melalui form pencarian, atau proses dari daftar permintaan online!");
        return;
    }
    if (!svc) {
        alert("Jenis layanan tidak valid. Silakan cek data master Layanan & Harga.");
        return;
    }

    // Jika transaksi berasal dari "Permintaan Penjemputan Online" (tombol Proses),
    // PAKAI ULANG nomor struk yang sudah terbit & sudah dipegang pelanggan supaya
    // pelacakan tetap nyambung ke order yang sama. Kalau input manual/walk-in,
    // baru terbitkan nomor struk baru.
    const receiptId = originalRequestId || ("NOTA-" + Math.floor(1001 + Math.random() * 8999));

    const totalCost = payWeight * svc.price;

    // Pertahankan data asal (wa, alamat, createdAt) jika struk ini sudah pernah
    // ada dari pengajuan online, lalu timpa dengan hasil timbangan & transaksi resmi.
    const existingOrder = orders[receiptId] || {};

    orders[receiptId] = {
        ...existingOrder,
        id: receiptId,
        customerName: custNameVal,
        weight: weight,
        payWeight: payWeight,
        serviceType: svc.name,
        unit: svc.unit,
        operatorRealName: realOperatorName,
        operatorCode: anonymizedOperatorCode,
        status: "antrian",
        cost: totalCost
    };

    // Update riwayat cuci member jika transaksi menggunakan keanggotaan terdaftar
    if (custId) {
        const memberIdx = members.findIndex(m => m.id === custId);
        if (memberIdx !== -1) members[memberIdx].historyCount += 1;
        localStorage.setItem('laundry_members', JSON.stringify(members));
    }

    // Tambah kas pemasukan
    dailyIncome += totalCost;
    localStorage.setItem('laundry_income', dailyIncome.toString());
    localStorage.setItem('laundry_orders', JSON.stringify(orders));

    // Jika berasal dari permintaan online, hapus dari daftar "Permintaan Online" karena sudah diproses
    if (originalRequestId) {
        const requests = JSON.parse(localStorage.getItem('laundry_pickup_requests') || '{}');
        delete requests[originalRequestId];
        localStorage.setItem('laundry_pickup_requests', JSON.stringify(requests));
        renderPickupRequests();
    }

    const receiptNote = originalRequestId
        ? "Nomor struk ini SAMA dengan yang sudah dipegang pelanggan — mereka bisa langsung cek status terbaru tanpa perlu diberi nomor baru."
        : "Berikan nomor struk ini ke pelanggan — bisa langsung dipakai melacak status di landing page tanpa login.";

    alert(`Transaksi Berhasil Dirilis!\nNomor Struk: ${receiptId}\nTotal Bayar: Rp ${totalCost.toLocaleString('id-ID')}\n\n${receiptNote}`);

    // Jika pelanggan belum member, tawarkan pembuatan kartu (opsional, boleh dibatalkan)
    if (!custId) {
        offerMembershipCard(custNameVal);
    }

    // Reset form
    document.getElementById('transaksiForm').reset();
    document.getElementById('selectedCustomer').value = "";
    document.getElementById('selectedCustomerId').value = "";
    document.getElementById('originalRequestId').value = "";
    document.getElementById('discountAlert').classList.add('hidden');
    renderServiceOptions();

    renderQueueList();
    updateIncomeDisplay();
}

// ==========================================================================
// TAWARKAN KARTU MEMBER SETELAH TRANSAKSI (khusus pelanggan yang belum member)
// ==========================================================================
function offerMembershipCard(customerName) {
    const wantMember = confirm(
        `Pelanggan "${customerName}" belum terdaftar sebagai member.\n\n` +
        `Apakah pelanggan ingin dibuatkan Kartu Member CleanWaves?\n` +
        `(Keuntungan: GRATIS potongan 2 kg setiap kelipatan 5x transaksi cuci, dengan minimal cucian 5 kg per transaksi)`
    );

    if (!wantMember) return;

    let cardId = "MEM-" + Math.floor(100 + Math.random() * 899);
    while (members.some(m => m.id === cardId)) {
        cardId = "MEM-" + Math.floor(100 + Math.random() * 899);
    }

    members.push({ id: cardId, name: customerName, historyCount: 1 });
    localStorage.setItem('laundry_members', JSON.stringify(members));

    alert(`Kartu Member berhasil dibuat!\nNama: ${customerName}\nID Kartu: ${cardId}\n\nSampaikan nomor kartu ini ke pelanggan untuk dipakai pada transaksi berikutnya.`);
}

// ==========================================================================
// QUEUE & INCOME MANAGEMENT VIEW
// ==========================================================================
function renderQueueList() {
    const queueList = document.getElementById('adminQueueList');
    const orderKeys = Object.keys(orders);

    if (orderKeys.length === 0) {
        queueList.innerHTML = `<p class="text-xs text-slate-400 italic text-center py-4">Belum ada antrean masuk hari ini.</p>`;
        return;
    }

    // Urutkan terbaru di atas supaya order baru langsung terlihat.
    const sortedKeys = orderKeys.slice().sort((a, b) => {
        const ta = orders[a].createdAt ? new Date(orders[a].createdAt).getTime() : 0;
        const tb = orders[b].createdAt ? new Date(orders[b].createdAt).getTime() : 0;
        return tb - ta;
    });

    queueList.innerHTML = sortedKeys.map(key => {
        const item = orders[key];
        return `
            <div class="pt-3 first:pt-0 space-y-2">
                <div class="flex justify-between items-start">
                    <div>
                        <span class="text-xs font-mono font-bold bg-slate-100 px-1.5 py-0.5 rounded">${item.id}</span>
                        <h5 class="text-xs font-semibold text-slate-800 mt-1">${item.customerName}</h5>
                        <p class="text-[11px] text-slate-500">Layanan: ${item.serviceType} | Pekerja: <strong class="text-slate-700">${item.operatorRealName || 'Belum diproses'}</strong>${item.operatorCode ? ` <span class="text-slate-400">(${item.operatorCode})</span>` : ''}</p>
                    </div>
                    <select onchange="updateStatus('${item.id}', this.value)" class="text-xs border p-1 rounded-lg bg-slate-50">
                        <option value="antrian" ${item.status === 'antrian' ? 'selected' : ''}>Antrean</option>
                        <option value="cuci" ${item.status === 'cuci' ? 'selected' : ''}>Cuci</option>
                        <option value="setrika" ${item.status === 'setrika' ? 'selected' : ''}>Setrika</option>
                        <option value="siap" ${item.status === 'siap' ? 'selected' : ''}>Siap Diambil</option>
                    </select>
                </div>
            </div>
        `;
    }).join('');
}

function updateStatus(id, newStatus) {
    if (orders[id]) {
        orders[id].status = newStatus;
        localStorage.setItem('laundry_orders', JSON.stringify(orders));
        alert(`Status Nota ${id} berhasil diubah menjadi: ${newStatus.toUpperCase()}\nPelanggan bisa langsung cek perubahan ini di halaman pelacakan.`);
    }
}

function updateIncomeDisplay() {
    document.getElementById('incomeDisplay').innerText = `Rp ${dailyIncome.toLocaleString('id-ID')}`;
}
