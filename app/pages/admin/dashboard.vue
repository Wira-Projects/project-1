<template>
  <div>
    <h1 class="text-3xl font-bold text-slate-100 mb-8">Dasbor Admin</h1>

    <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
      <div class="card p-6 rounded-lg">
        <h2 class="text-slate-400">Total Pengguna</h2>
        <p class="text-3xl font-bold mt-1">1,420</p>
      </div>
      <div class="card p-6 rounded-lg">
        <h2 class="text-slate-400">Total Organisasi</h2>
        <p class="text-3xl font-bold mt-1">1,510</p>
      </div>
      <div class="card p-6 rounded-lg">
        <h2 class="text-slate-400">Pendapatan (Bulan Ini)</h2>
        <p class="text-3xl font-bold mt-1">Rp 25.750.000</p>
      </div>
      <div class="card p-6 rounded-lg">
        <h2 class="text-slate-400">VPS Aktif</h2>
        <p class="text-3xl font-bold mt-1">256</p>
      </div>
    </div>

    <div class="grid grid-cols-1 lg:grid-cols-3 gap-8">
      <div class="lg:col-span-2 card p-6 rounded-lg">
        <h2 class="text-xl font-bold mb-4">Pesanan Top Up Terbaru</h2>
        <table class="w-full text-left text-sm">
          <thead class="text-slate-400 border-b border-slate-700">
            <tr>
              <th class="py-2">Order ID</th>
              <th>Pengguna</th>
              <th>Jumlah</th>
              <th>Status</th>
              <th>Waktu</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-slate-800">
            <tr>
              <td class="py-3">TOPUP-XYZ123</td>
              <td>Proyek Pribadi Budi</td>
              <td>Rp 500.000</td>
              <td><span class="text-xs font-semibold bg-green-500/30 text-green-400 py-1 px-2 rounded-full">Successful</span></td>
              <td>2 jam lalu</td>
            </tr>
            <tr>
              <td class="py-3">TOPUP-ABC789</td>
              <td>Tim Riset Keren</td>
              <td>Rp 1.000.000</td>
              <td><span class="text-xs font-semibold bg-yellow-500/30 text-yellow-400 py-1 px-2 rounded-full">Pending</span></td>
              <td>5 jam lalu</td>
            </tr>
            <tr>
              <td class="py-3">TOPUP-DEF456</td>
              <td>PT Inovasi Digital</td>
              <td>Rp 250.000</td>
              <td><span class="text-xs font-semibold bg-red-500/30 text-red-400 py-1 px-2 rounded-full">Failed</span></td>
              <td>1 hari lalu</td>
            </tr>
          </tbody>
        </table>
      </div>

      <div class="card p-6 rounded-lg">
        <h2 class="text-xl font-bold mb-4">Deployment Terakhir</h2>
        <ul class="space-y-3 text-sm">
          <li class="flex justify-between"><span>user-a/app-frontend</span><span class="text-green-400">Success</span></li>
          <li class="flex justify-between"><span>budi/api-backend</span><span class="text-red-400">Failed</span></li>
          <li class="flex justify-between"><span>user-c/worker-bg</span><span class="text-green-400">Success</span></li>
          <li class="flex justify-between"><span>user-d/web-static</span><span class="text-green-400">Success</span></li>
        </ul>
      </div>
    </div>
  </div>
</template>

<script setup>
// 1. Definisikan layout yang akan digunakan
definePageMeta({
  layout: 'admin',
  // 3. Terapkan Middleware untuk perlindungan rute admin
  middleware: 'admin-auth' 
});

// 4. Tambahkan styling untuk kartu (card)
// Menggunakan 'useHead' Nuxt untuk menambahkan tag <style> ke <head>
useHead({
  style: [
    {
      children: `
        .card { background-color: #1e293b; border: 1px solid #334155; }
        .bg-green-500\/30 { background-color: rgba(34, 197, 94, 0.3); }
        .bg-yellow-500\/30 { background-color: rgba(245, 158, 11, 0.3); }
        .bg-red-500\/30 { background-color: rgba(239, 68, 68, 0.3); }
        .text-green-900 { color: #064e3b; }
        .text-yellow-900 { color: #78350f; }
        .text-red-900 { color: #7f1d1d; }
      `,
      tagPriority: 'high'
    }
  ]
});
</script>