// ==========================================================================
// CleanWaves — order.js
// Order tidak memerlukan login sama sekali.
//
// Begitu form dikirim, sistem langsung menerbitkan NOMOR STRUK ("NOTA-xxxx")
// yang sama formatnya dengan nota resmi admin, dan langsung menyimpannya ke
// localStorage "laundry_orders" — sumber data yang sama yang dibaca fitur
// "Lacak" di index.html. Artinya struk ini LANGSUNG BISA DILACAK tanpa
// perlu menunggu admin memproses apa pun.
//
// Data pengajuan juga tetap disimpan ke "laundry_pickup_requests" (id yang
// sama dengan nomor struk) supaya admin tetap bisa melihatnya di panel
// "Permintaan Online" dan melakukan penimbangan resmi.
// ==========================================================================

let lastReceiptId = null;

document.addEventListener('DOMContentLoaded', () => {
    renderServiceOptions();
});

// --- Opsi layanan diambil dari data yang sama dipakai admin (localStorage "laundry_services") ---
function getServiceList() {
    const stored = localStorage.getItem('laundry_services');
    if (stored) return JSON.parse(stored);

    return [
        { id: "reguler", name: "Cuci Kiloan Reguler", unit: "kg", price: 10000, eta: "2 - 3 Hari" },
        { id: "kilat", name: "Cuci Kiloan Kilat", unit: "kg", price: 18000, eta: "24 Jam" },
        { id: "satuan", name: "Cuci Satuan Kemeja", unit: "pcs", price: 15000, eta: "2 Hari" },
        { id: "jas", name: "Cuci Jas Premium", unit: "pcs", price: 65000, eta: "3 Hari" },
        { id: "bedcover", name: "Bed Cover Large", unit: "pcs", price: 35000, eta: "2 Hari" }
    ];
}

function renderServiceOptions() {
    const select = document.getElementById('orderLayanan');
    const services = getServiceList();
    select.innerHTML = services.map(s =>
        `<option value="${s.name}">${s.name} - Rp ${s.price.toLocaleString('id-ID')} / ${s.unit}</option>`
    ).join('');
}

// Generate nomor struk unik dengan format sama seperti yang diterbitkan admin (NOTA-xxxx),
// dicek dulu supaya tidak bentrok dengan struk yang sudah ada.
function generateUniqueReceiptId(existingOrders) {
    let id;
    do {
        id = "NOTA-" + Math.floor(1001 + Math.random() * 8999);
    } while (existingOrders[id]);
    return id;
}

// --- SUBMIT PENGAJUAN ORDER (kini tanpa login, dan langsung terbit struk) ---
function submitLaundryOrder(event) {
    event.preventDefault();

    const nama = document.getElementById('orderNama').value.trim();
    const wa = document.getElementById('orderWA').value.trim();
    const layanan = document.getElementById('orderLayanan').value;
    const jumlah = document.getElementById('orderJumlah').value.trim();
    const alamat = document.getElementById('orderAlamat').value.trim();

    // 1) Terbitkan struk resmi langsung ke "laundry_orders" agar bisa langsung dilacak
    const allOrders = JSON.parse(localStorage.getItem('laundry_orders') || '{}');
    const receiptId = generateUniqueReceiptId(allOrders);

    allOrders[receiptId] = {
        id: receiptId,
        customerName: nama,
        wa: wa,
        serviceType: layanan,
        estimasiJumlah: jumlah,
        alamat: alamat,
        operatorCode: "",           // belum ada operator — akan diisi admin saat proses
        status: "antrian",
        cost: null,                 // biaya final menyusul setelah timbangan resmi
        createdAt: new Date().toISOString()
    };
    localStorage.setItem('laundry_orders', JSON.stringify(allOrders));

    // 2) Tetap catat sebagai permintaan online agar tampil di panel admin (id disamakan dgn struk)
    const requests = JSON.parse(localStorage.getItem('laundry_pickup_requests') || '{}');
    requests[receiptId] = {
        id: receiptId,
        nama: nama,
        wa: wa,
        layanan: layanan,
        estimasiJumlah: jumlah,
        alamat: alamat,
        createdAt: new Date().toISOString()
    };
    localStorage.setItem('laundry_pickup_requests', JSON.stringify(requests));

    lastReceiptId = receiptId;

    // 3) Tampilkan notifikasi berisi nomor struk + pertanyaan download PDF
    document.getElementById('notifReceiptId').innerText = receiptId;
    document.getElementById('receiptNotifModal').classList.remove('hidden');
}

// --- AKSI PADA MODAL NOTIFIKASI ---
function handleNotifDownload() {
    downloadReceiptPdf();
    closeNotifAndShowSuccess();
}

function handleNotifDismiss() {
    closeNotifAndShowSuccess();
}

function closeNotifAndShowSuccess() {
    document.getElementById('receiptNotifModal').classList.add('hidden');

    document.getElementById('reqIdDisplay').innerText = lastReceiptId;
    document.getElementById('orderFormWrap').classList.add('hidden');
    document.getElementById('orderSuccessWrap').classList.remove('hidden');
}

// --- GENERATE STRUK PDF (client-side, langsung terdownload ke perangkat customer) ---
function downloadReceiptPdf() {
    if (!lastReceiptId) return;

    const allOrders = JSON.parse(localStorage.getItem('laundry_orders') || '{}');
    const order = allOrders[lastReceiptId];
    if (!order) return;

    const { jsPDF } = window.jspdf;
    const doc = new jsPDF({ unit: 'mm', format: 'a5' });

    const pageWidth = doc.internal.pageSize.getWidth();
    let y = 18;

    // Header
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(18);
    doc.setTextColor(2, 132, 199); // sky-600
    doc.text('CleanWaves.', 14, y);

    doc.setFontSize(10);
    doc.setTextColor(100);
    doc.setFont('helvetica', 'normal');
    doc.text('Struk Bukti Pengajuan Laundry', 14, y + 6);

    doc.setDrawColor(220);
    y += 12;
    doc.line(14, y, pageWidth - 14, y);
    y += 10;

    // Nomor Struk
    doc.setFontSize(11);
    doc.setTextColor(30);
    doc.setFont('helvetica', 'bold');
    doc.text('Nomor Struk', 14, y);
    doc.setFontSize(16);
    doc.setTextColor(2, 132, 199);
    doc.text(order.id, 14, y + 7);

    y += 18;
    doc.setDrawColor(230);
    doc.line(14, y, pageWidth - 14, y);
    y += 10;

    // Detail Pelanggan & Order
    const rows = [
        ['Nama Pelanggan', order.customerName || '-'],
        ['No. WhatsApp', order.wa || '-'],
        ['Jenis Layanan', order.serviceType || '-'],
        ['Estimasi Berat/Jumlah', order.estimasiJumlah || '-'],
        ['Alamat Penjemputan', order.alamat || '-'],
        ['Status Saat Ini', 'Antrean (menunggu penjemputan & penimbangan)'],
        ['Tanggal Pengajuan', new Date(order.createdAt).toLocaleString('id-ID')]
    ];

    doc.setFontSize(10);
    rows.forEach(([label, value]) => {
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(80);
        doc.text(label, 14, y);

        doc.setFont('helvetica', 'normal');
        doc.setTextColor(30);
        const wrapped = doc.splitTextToSize(String(value), pageWidth - 28);
        doc.text(wrapped, 14, y + 5);

        y += 5 + (wrapped.length * 5) + 3;
    });

    y += 4;
    doc.setDrawColor(230);
    doc.line(14, y, pageWidth - 14, y);
    y += 8;

    doc.setFontSize(9);
    doc.setTextColor(120);
    doc.text('Berat & biaya final mengikuti hasil timbangan resmi kurir/outlet.', 14, y);
    y += 5;
    doc.text('Lacak status cucian Anda kapan saja di CleanWaves - tanpa perlu login.', 14, y);

    doc.save(`Struk-${order.id}.pdf`);
}
