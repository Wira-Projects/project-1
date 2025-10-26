<template>
  <div>
    <h1 class="text-3xl font-bold text-slate-100 mb-8">Dasbor Admin</h1>

    <div v-if="error" class="error-panel p-6 rounded-lg text-center bg-red-900/30 border border-red-700">
      <h2 class="text-xl font-bold text-red-400 mb-2">Gagal Memuat Data</h2>
      <p class="text-red-300">Terjadi kesalahan saat mengambil data dashboard. Silakan muat ulang halaman atau periksa
        koneksi dan izin Supabase Anda.</p>
      <p v-if="error.message" class="text-sm text-red-500 mt-2">Detail Error: {{ error.message }}</p>
    </div>

    <div v-else>

      <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">

        <div class="card p-6 rounded-lg">
          <h2 class="text-slate-400">Total Pengguna</h2>
          <p class="text-3xl font-bold mt-1">{{ pending ? '...' : formatNumber(stats.user_count) }}</p>
        </div>

        <div class="card p-6 rounded-lg">
          <h2 class="text-slate-400">Total Organisasi</h2>
          <p class="text-3xl font-bold mt-1">{{ pending ? '...' : formatNumber(stats.org_count) }}</p>
        </div>

        <div class="card p-6 rounded-lg">
          <h2 class="text-slate-400">Pendapatan (Bulan Ini)</h2>
          <p class="text-3xl font-bold mt-1">{{ pending ? '...' : formatRupiah(stats.monthly_revenue) }}</p>
        </div>

        <div class="card p-6 rounded-lg">
          <h2 class="text-slate-400">VPS Aktif</h2>
          <p class="text-3xl font-bold mt-1">{{ pending ? '...' : formatNumber(stats.vps_active_count) }}</p>
        </div>
      </div>

      <div class="grid grid-cols-1 lg:grid-cols-3 gap-8">

        <div class="lg:col-span-2 card p-6 rounded-lg">
          <h2 class="text-xl font-bold mb-4">Pesanan Top Up Terbaru</h2>

          <p v-if="pending" class="text-slate-400">Memuat data pesanan...</p>

          <div v-else class="overflow-x-auto">
            <table class="w-full text-left text-sm whitespace-nowrap">
              <thead class="text-slate-400 border-b border-slate-700">
                <tr>
                  <th class="py-2">Order ID</th>
                  <th>Organisasi</th>
                  <th>Jumlah</th>
                  <th>Status</th>
                  <th>Waktu</th>
                </tr>
              </thead>
              <tbody class="divide-y divide-slate-800">
                <tr v-for="order in topUpOrders" :key="order.id">
                  <td class="py-3">{{ order.id }}</td>
                  <td>{{ order.organizations?.name || 'N/A' }}</td>
                  <td>{{ formatRupiah(order.amount) }}</td>
                  <td>
                    <span :class="getStatusClasses(order.status)"
                      class="text-xs font-semibold py-1 px-2 rounded-full capitalize">
                      {{ order.status }}
                    </span>
                  </td>
                  <td>{{ formatDate(order.created_at) }}</td>
                </tr>
                <tr v-if="topUpOrders.length === 0">
                  <td colspan="5" class="py-4 text-center text-slate-500">Tidak ada pesanan top up terbaru.</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        <div class="card p-6 rounded-lg">
          <h2 class="text-xl font-bold mb-4">Penggunaan AI Terakhir</h2>

          <p v-if="pending" class="text-slate-400">Memuat log penggunaan...</p>

          <ul v-else class="space-y-3 text-sm">
            <li v-for="log in aiUsageLogs" :key="log.id" class="flex justify-between">
              <span class="truncate pr-2">
                {{ log.marketplace_models?.display_name || 'Model Tidak Dikenal' }} ({{ log.prompt_tokens +
                  log.completion_tokens }} tok)
              </span>
              <span class="font-semibold" :class="log.total_selling_price > 0 ? 'text-red-400' : 'text-green-400'">
                {{ formatRupiah(log.total_selling_price) }}
              </span>
            </li>
            <li v-if="aiUsageLogs.length === 0" class="text-center text-slate-500">Tidak ada log penggunaan AI terbaru.
            </li>
          </ul>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
// Gunakan import 'vue' jika Anda tidak menggunakan <script setup lang="ts">
// import { computed } from 'vue';

// ----------------------------------------------------
// 1. Definisikan Meta Halaman dan Middleware
// ----------------------------------------------------
definePageMeta({
  layout: 'admin',
  middleware: 'admin-auth'
});

// ----------------------------------------------------
// 2. Setup Supabase & Ambil Data
// ----------------------------------------------------
const supabase = useSupabaseClient();

const fetchAdminData = async () => {
  // A. Ambil Data Statistik (Count)
  // Menggunakan Promise.all untuk mengambil semua data secara paralel
  const [
    // Panggil fungsi RPC 'get_user_count' untuk mendapatkan jumlah pengguna
    userCountRes,
    orgCountRes,
    vpsActiveCountRes,
    monthlyRevenueRes,
    topUpOrdersRes,
    aiUsageLogsRes
  ] = await Promise.all([
    // ✅ PERBAIKAN: Memanggil fungsi database 'get_user_count' via RPC
    supabase.rpc('get_user_count'),

    // Query lainnya tetap sama
    supabase.from('organizations').select('*', { count: 'exact', head: true }),
    supabase.from('vps_instances').select('*', { count: 'exact', head: true }).eq('status', 'running'),
    supabase.from('invoices')
      .select('amount')
      .eq('status', 'paid')
      .gte('issued_at', new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString()),
    supabase.from('top_up_orders')
      .select('*, organizations(name)')
      .order('created_at', { ascending: false })
      .limit(5),
    supabase.from('gateway_usage_logs')
      .select('*, marketplace_models(display_name)')
      .order('timestamp', { ascending: false })
      .limit(5)
  ]);

  // Handle potensi error dari pemanggilan RPC
  if (userCountRes.error) {
    console.error('Error fetching user count via RPC:', userCountRes.error);
    // Lempar error agar ditangkap oleh useAsyncData
    throw userCountRes.error;
  }

  // B. Hitung Total Pendapatan
  const monthlyRevenueTotal = monthlyRevenueRes.data
    ? monthlyRevenueRes.data.reduce((sum, invoice) => sum + parseFloat(invoice.amount), 0)
    : 0;

  // C. Return Data yang Sudah Terstruktur
  return {
    stats: {
      // ✅ PERBAIKAN: Ambil jumlah pengguna dari data hasil RPC
      user_count: userCountRes.data ?? 0, // Gunakan nullish coalescing untuk default 0 jika data null/undefined
      org_count: orgCountRes.count || 0,
      vps_active_count: vpsActiveCountRes.count || 0,
      monthly_revenue: monthlyRevenueTotal,
    },
    top_up_orders: topUpOrdersRes.data || [],
    ai_usage_logs: aiUsageLogsRes.data || []
  };
};

// Gunakan useAsyncData untuk menjalankan fungsi fetch dan menangani loading/error
const { data, pending, error } = useAsyncData('adminDashboard', fetchAdminData);

// Memecah data untuk digunakan di template (computed agar reaktif)
const stats = computed(() => data.value?.stats || { user_count: 0, org_count: 0, vps_active_count: 0, monthly_revenue: 0 }); // Beri nilai default
const topUpOrders = computed(() => data.value?.top_up_orders || []);
const aiUsageLogs = computed(() => data.value?.ai_usage_logs || []);

// ----------------------------------------------------
// 3. Fungsi Utility untuk Formatting
// ----------------------------------------------------

const formatNumber = (num) => {
    // Tambahkan pengecekan jika num null atau undefined
    if (num === null || num === undefined) return '0';
  return new Intl.NumberFormat('id-ID').format(num);
};

const formatRupiah = (amount) => {
    // Tambahkan pengecekan jika amount null atau undefined
    if (amount === null || amount === undefined) return 'Rp 0';
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0
  }).format(amount);
};

const formatDate = (dateString) => {
  if (!dateString) return '-'; // Handle jika dateString null
  return new Date(dateString).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });
};

const getStatusClasses = (status) => {
  switch (status) {
    case 'successful':
      return 'bg-green-500/30 text-green-400';
    case 'pending':
      return 'bg-yellow-500/30 text-yellow-400';
    case 'failed':
    case 'expired':
      return 'bg-red-500/30 text-red-400';
    default:
      return 'bg-slate-500/30 text-slate-400';
  }
};

// ----------------------------------------------------
// 4. Styling Kustom (jika diperlukan, bisa dipindah ke CSS global)
// ----------------------------------------------------
// useHead bisa dihapus jika styling sudah ada di file CSS terpisah
useHead({
  style: [
    {
      children: `
        .card { background-color: #1e293b; border: 1px solid #334155; }
        .bg-green-500\\/30 { background-color: rgba(34, 197, 94, 0.3); }
        .bg-yellow-500\\/30 { background-color: rgba(245, 158, 11, 0.3); }
        .bg-red-500\\/30 { background-color: rgba(239, 68, 68, 0.3); }
        .text-green-400 { color: #4ade80; }
        .text-yellow-400 { color: #facc15; }
        .text-red-400 { color: #f87171; }
        .text-slate-400 { color: #94a3b8; }
      `,
      tagPriority: 'high' // Pastikan style ini diterapkan
    }
  ]
});
</script>

<style scoped>
/* Styling tambahan untuk tabel agar barisnya tidak wrap */
.whitespace-nowrap {
  white-space: nowrap;
}

/* Style untuk panel error */
.error-panel {
  /* Anda bisa sesuaikan style error panelnya */
  background-color: rgba(220, 38, 38, 0.2); /* bg-red-700/20 */
  border-color: rgba(239, 68, 68, 0.5); /* border-red-500/50 */
}
.text-red-400 { color: #f87171; }
.text-red-300 { color: #fca5a5; }
.text-red-500 { color: #ef4444; }

/* Tambahan: Pastikan text color default di scope ini sesuai */
div {
  color: #e2e8f0; /* text-slate-200 */
}
.text-slate-100 { color: #f1f5f9; }
.text-slate-300 { color: #cbd5e1; }
.text-slate-400 { color: #94a3b8; }
.text-slate-500 { color: #64748b; }
.border-slate-700 { border-color: #334155; }
.border-slate-800 { border-color: #1e293b; }

</style>
