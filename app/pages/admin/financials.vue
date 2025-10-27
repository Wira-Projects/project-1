<template>
  <div>
    <h1 class="text-3xl font-bold text-slate-100 mb-8">Manajemen Keuangan</h1>

    <div class="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
      <div class="card p-6 rounded-lg">
        <h2 class="text-slate-400">Total Pendapatan (All Time)</h2>
        <p class="text-3xl font-bold mt-1 text-green-400">{{ pendingStats ? '...' : formatRupiah(stats.total_revenue) }}</p>
      </div>
      <div class="card p-6 rounded-lg">
        <h2 class="text-slate-400">Volume Top Up (30 Hari)</h2>
        <p class="text-3xl font-bold mt-1">{{ pendingStats ? '...' : formatRupiah(stats.recent_topup_volume) }}</p>
      </div>
      <div class="card p-6 rounded-lg">
        <h2 class="text-slate-400">Total Saldo di Dompet Pengguna</h2>
        <p class="text-3xl font-bold mt-1">{{ pendingStats ? '...' : formatRupiah(stats.total_wallet_balance) }}</p>
      </div>
    </div>

    <div class="card rounded-lg overflow-hidden">
        <div class="p-6 flex flex-col md:flex-row justify-between md:items-center gap-4">
            <h2 class="text-xl font-bold">Pesanan Top Up</h2>
            <div class="flex items-center space-x-2">
                <label for="statusFilter" class="text-sm text-slate-300 whitespace-nowrap">Filter Status:</label>
                <select id="statusFilter" v-model="selectedStatus" class="form-input text-sm py-1">
                    <option value="all">Semua</option>
                    <option value="successful">Successful</option>
                    <option value="pending">Pending</option>
                    <option value="failed">Failed</option>
                    <option value="expired">Expired</option>
                </select>
            </div>
        </div>

        <div class="overflow-x-auto">
            <table class="w-full text-left text-sm whitespace-nowrap">
                <thead class="bg-slate-900/50 text-slate-400">
                    <tr>
                        <th class="p-4 font-semibold">Order ID</th>
                        <th class="p-4 font-semibold">Organisasi</th>
                        <th class="p-4 font-semibold">Jumlah</th>
                        <th class="p-4 font-semibold">Gateway</th>
                        <th class="p-4 font-semibold">Status</th>
                        <th class="p-4 font-semibold">Waktu</th>
                    </tr>
                </thead>
                <tbody class="divide-y divide-slate-700">
                     <tr v-if="pendingOrders">
                        <td colspan="6" class="p-4 text-center text-slate-500">
                            <i class="fas fa-spinner fa-spin mr-2"></i> Memuat pesanan...
                        </td>
                     </tr>
                     <tr v-else-if="filteredOrders.length === 0">
                        <td colspan="6" class="p-4 text-center text-slate-500">
                            {{ selectedStatus === 'all' ? 'Tidak ada data pesanan top up.' : 'Tidak ada pesanan dengan status yang dipilih.' }}
                        </td>
                     </tr>
                    <tr v-else v-for="order in filteredOrders" :key="order.id">
                        <td class="p-3 font-mono text-xs">{{ order.id }}</td>
                        <td class="p-3">{{ order.organizations?.name || 'N/A' }}</td>
                        <td class="p-3">{{ formatRupiah(order.amount) }}</td>
                        <td class="p-3 capitalize">{{ order.payment_gateway || '-' }}</td>
                        <td class="p-3">
                            <span :class="getStatusClasses(order.status)" class="text-xs font-semibold py-1 px-2 rounded-full capitalize">
                                {{ order.status }}
                            </span>
                        </td>
                        <td class="p-3 text-slate-400">{{ formatDateTime(order.created_at) }}</td>
                    </tr>
                </tbody>
            </table>
        </div>
         </div>

  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue';

// Definisikan tipe data yang diharapkan dari API
interface Organization { name: string; }
interface TopUpOrder {
    id: string;
    organization_id: number;
    amount: number | string; // Bisa string dari DB
    payment_gateway: string | null;
    status: 'successful' | 'pending' | 'failed' | 'expired';
    created_at: string;
    organizations: Organization | null; // Relasi
}
interface FinancialStats {
    total_revenue: number;
    recent_topup_volume: number;
    total_wallet_balance: number;
}
interface FinancialsApiResponse {
    stats: FinancialStats;
    orders: TopUpOrder[];
}

// 1. Meta Halaman & Middleware
definePageMeta({
  layout: 'admin',
  middleware: 'admin-auth'
});
useHead({ title: 'Manajemen Keuangan' });

// 2. State Management
const selectedStatus = ref<'all' | 'successful' | 'pending' | 'failed' | 'expired'>('all');

// 3. Data Fetching
// Pisahkan fetch untuk stats dan orders agar bisa refresh independen jika perlu
const { data: statsData, pending: pendingStats, error: errorStats } = await useAsyncData<FinancialStats>(
    'adminFinancialStats',
    async () => {
        const { $client } = useNuxtApp(); // Gunakan Supabase client dari NuxtApp
        // TODO: Ganti dengan panggilan RPC atau query agregat yang sesungguhnya
        // Contoh data dummy:
        const { data: totalRevenueData, error: revErr } = await $client.from('invoices').select('amount').eq('status', 'paid');
        if (revErr) throw revErr;
        const totalRevenue = totalRevenueData?.reduce((sum, inv) => sum + parseFloat(inv.amount || '0'), 0) ?? 0;

        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
        const { data: recentTopupData, error: topupErr } = await $client.from('top_up_orders').select('amount').eq('status', 'successful').gte('created_at', thirtyDaysAgo.toISOString());
        if (topupErr) throw topupErr;
        const recentTopupVolume = recentTopupData?.reduce((sum, order) => sum + parseFloat(order.amount || '0'), 0) ?? 0;

        const { data: balanceData, error: balErr } = await $client.from('organization_wallets').select('balance');
        if (balErr) throw balErr;
        const totalWalletBalance = balanceData?.reduce((sum, wallet) => sum + parseFloat(wallet.balance || '0'), 0) ?? 0;


        return {
            total_revenue: totalRevenue, // Dummy
            recent_topup_volume: recentTopupVolume, // Dummy
            total_wallet_balance: totalWalletBalance // Dummy
        };
    },
    { default: () => ({ total_revenue: 0, recent_topup_volume: 0, total_wallet_balance: 0 }) } // Default value
);

const { data: ordersData, pending: pendingOrders, error: errorOrders, refresh: refreshOrders } = await useAsyncData<TopUpOrder[]>(
    'adminTopUpOrders',
     async () => {
        const { $client } = useNuxtApp();
        const { data, error } = await $client
            .from('top_up_orders')
            .select('*, organizations(name)') // Ambil nama organisasi terkait
            .order('created_at', { ascending: false })
            .limit(50); // Ambil 50 data terbaru, sesuaikan jika perlu pagination
        if (error) throw error;
        // Pastikan amount adalah number
        return (data || []).map(order => ({
            ...order,
            amount: parseFloat(order.amount || '0') // Konversi amount ke number
        }));
    },
    { default: () => [] } // Default value
);


// Computed property untuk data (agar lebih aman dari null/undefined)
const stats = computed(() => statsData.value || { total_revenue: 0, recent_topup_volume: 0, total_wallet_balance: 0 });
const allOrders = computed(() => ordersData.value || []);

// Computed property untuk filtering
const filteredOrders = computed(() => {
    if (selectedStatus.value === 'all') {
        return allOrders.value;
    }
    return allOrders.value.filter(order => order.status === selectedStatus.value);
});

// Handle error (contoh sederhana)
if (errorStats.value) { console.error('Error fetching stats:', errorStats.value); }
if (errorOrders.value) { console.error('Error fetching orders:', errorOrders.value); }


// 4. Utility Functions
const formatRupiah = (amount: number | string | undefined | null): string => {
    const num = typeof amount === 'string' ? parseFloat(amount) : amount;
    if (num === null || num === undefined || isNaN(num)) return 'Rp 0';
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0
  }).format(num);
};

const formatDateTime = (dateString: string | undefined | null): string => {
  if (!dateString) return '-';
  try {
      return new Date(dateString).toLocaleString('id-ID', {
          day: '2-digit', month: 'short', year: 'numeric',
          hour: '2-digit', minute: '2-digit'
        });
    } catch(e) {
        return '-';
    }
};

const getStatusClasses = (status: TopUpOrder['status'] | undefined | null): string => {
  switch (status) {
    case 'successful': return 'bg-green-500/30 text-green-400';
    case 'pending': return 'bg-yellow-500/30 text-yellow-400';
    case 'failed': return 'bg-red-500/30 text-red-400';
    case 'expired': return 'bg-slate-500/30 text-slate-400'; // Mungkin style beda untuk expired
    default: return 'bg-slate-600/30 text-slate-300';
  }
};

</script>

<style scoped>
/* Styling tambahan jika diperlukan */
.form-input {
    background-color: #334155; /* slate-700 */
    border-color: #475569; /* slate-600 */
    color: #e2e8f0; /* slate-200 */
}
.form-input:focus {
     border-color: #f59e0b; /* amber-500 */
     box-shadow: 0 0 0 2px rgba(245, 158, 11, 0.3);
     outline: none;
}
.bg-green-500\/30 { background-color: rgba(34, 197, 94, 0.3); }
.bg-yellow-500\/30 { background-color: rgba(245, 158, 11, 0.3); }
.bg-red-500\/30 { background-color: rgba(239, 68, 68, 0.3); }
.bg-slate-500\/30 { background-color: rgba(100, 116, 139, 0.3); }
.bg-slate-600\/30 { background-color: rgba(71, 85, 105, 0.3); }
.text-green-400 { color: #4ade80; }
.text-yellow-400 { color: #facc15; }
.text-red-400 { color: #f87171; }
.text-slate-400 { color: #94a3b8; }
.text-slate-300 { color: #cbd5e1; }
</style>