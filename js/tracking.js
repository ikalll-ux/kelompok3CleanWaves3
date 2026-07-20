// ==========================================================================
// CleanWaves — js/tracking.js
// Logika khusus halaman Lacak Laundry (tracking.html): membaca nota yang
// diterbitkan admin/order (localStorage "laundry_orders") berdasarkan
// nomor struk, TANPA perlu login.
// ==========================================================================

function checkOrderStatus() {
    const trackIdInput = document.getElementById('trackInput').value.trim().toUpperCase();

    if (trackIdInput === "") {
        alert("Silakan masukkan nomor struk terlebih dahulu!");
        return;
    }

    const allOrders = JSON.parse(localStorage.getItem('laundry_orders') || '{}');
    const orderData = allOrders[trackIdInput];

    if (!orderData) {
        alert("Nomor struk tidak ditemukan! Pastikan format benar (Contoh: NOTA-1025), atau tanyakan ke petugas outlet.");
        document.getElementById('trackingResultBox').classList.add('hidden');
        document.getElementById('defaultTrackInfo').classList.remove('hidden');
        return;
    }

    // Render Detail Data Profil Order
    document.getElementById('resOrderId').innerText = orderData.id;
    document.getElementById('resOrderNama').innerText = orderData.customerName;
    document.getElementById('resOrderPaket').innerText = orderData.serviceType;

    // Render Visual Progres Linimasa Status Pemesanan (deskripsi ikut kode operator, bukan nama asli)
    updateTimelineVisual(orderData.status, orderData.operatorCode);

    document.getElementById('trackingResultBox').classList.remove('hidden');
    document.getElementById('defaultTrackInfo').classList.add('hidden');
}

// Mengatur status kelas CSS + teks deskripsi pada komponen timeline berdasarkan status nota
function updateTimelineVisual(status, operatorCode) {
    const steps = ['antrian', 'cuci', 'setrika', 'siap'];
    steps.forEach(s => {
        document.getElementById(`step-${s}`).classList.remove('step-active');
    });

    const opLabel = operatorCode || 'operator kami';

    // Deskripsi status: khusus tahap cuci & setrika menyebutkan kode operator (bukan nama asli)
    document.getElementById('desc-antrian').innerText =
        "Pesanan telah diterima outlet dan menunggu giliran proses pencucian.";
    document.getElementById('desc-cuci').innerText =
        `Pakaian Anda sedang dicuci dan ditangani oleh ${opLabel}.`;
    document.getElementById('desc-setrika').innerText =
        `Pakaian Anda sedang disetrika/dirapikan oleh ${opLabel}.`;
    document.getElementById('desc-siap').innerText =
        "Pakaian sudah di-packing rapi dalam plastik tersegel wangi dan siap diambil/diantar.";

    const order = ['antrian', 'cuci', 'setrika', 'siap'];
    const activeUntil = order.indexOf(status);
    for (let i = 0; i <= activeUntil; i++) {
        document.getElementById(`step-${order[i]}`).classList.add('step-active');
    }
}
