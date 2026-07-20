// ==========================================================================
// CleanWaves — js/harga.js
// Logika khusus halaman Daftar Harga (harga.html): merender tabel harga
// dari data layanan yang sama dipakai admin (localStorage "laundry_services").
// ==========================================================================

document.addEventListener('DOMContentLoaded', () => {
    renderHargaTable();
});

function getServiceList() {
    const stored = localStorage.getItem('laundry_services');
    if (stored) return JSON.parse(stored);

    // Data layanan default (dipakai juga oleh admin.js & order.js jika localStorage kosong)
    return [
        { id: "reguler", name: "Cuci Kiloan Reguler", unit: "kg", price: 10000, eta: "2 - 3 Hari" },
        { id: "kilat", name: "Cuci Kiloan Kilat", unit: "kg", price: 18000, eta: "24 Jam" },
        { id: "satuan", name: "Cuci Satuan Kemeja", unit: "pcs", price: 15000, eta: "2 Hari" },
        { id: "jas", name: "Cuci Jas Premium", unit: "pcs", price: 65000, eta: "3 Hari" },
        { id: "bedcover", name: "Bed Cover Large", unit: "pcs", price: 35000, eta: "2 Hari" }
    ];
}

function renderHargaTable() {
    const tbody = document.getElementById('hargaTableBody');
    if (!tbody) return;
    const services = getServiceList();

    tbody.innerHTML = services.map(s => `
        <tr>
            <td class="p-4">${s.name}</td>
            <td class="p-4">${s.eta}</td>
            <td class="p-4 text-right font-medium text-sky-600">Rp ${s.price.toLocaleString('id-ID')} / ${s.unit}</td>
        </tr>
    `).join('');
}
