<template>
  <div>
    <header class="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
      <h1 class="text-3xl font-bold text-slate-100">Manajemen Paket Langganan</h1>
      <button @click="openAddPlanModal" class="cta-button text-white font-semibold py-2 px-4 rounded-lg text-sm transition hover:opacity-90">
        <i class="fas fa-plus mr-2"></i> Tambah Paket Baru
      </button>
    </header>

    <div v-if="pending" class="text-center py-10">
      <i class="fas fa-spinner fa-spin text-amber-400 text-3xl"></i>
      <p class="mt-2 text-slate-400">Memuat data paket langganan...</p>
    </div>

    <div v-else-if="error" class="error-panel card p-6 rounded-lg mb-6 bg-red-900/30 border border-red-700">
      <h2 class="text-xl font-bold text-red-400 mb-2">Gagal Memuat Data</h2>
      <p class="text-red-300">{{ error.message || 'Terjadi kesalahan saat mengambil data.' }}</p>
    </div>

    <div v-else class="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-8">
      <div v-if="plansWithRates.length === 0" class="lg:col-span-2 xl:col-span-3 card p-6 rounded-lg text-center text-slate-500">
        Belum ada paket langganan yang dibuat.
      </div>

      <div v-for="plan in plansWithRates" :key="plan.id" class="card p-6 rounded-xl flex flex-col">
        <div class="flex-grow">
          <div class="flex justify-between items-start mb-4">
              <h2 class="text-2xl font-bold text-amber-400">{{ plan.name }}</h2>
              <button @click="editPlan(plan)" class="text-slate-400 hover:text-amber-300 text-sm">
                  <i class="fas fa-pencil-alt"></i> Edit
              </button>
          </div>
          <p class="text-3xl font-extrabold mb-4">{{ formatRupiah(plan.base_price_monthly) }} <span class="text-base font-normal text-slate-400">/ bulan</span></p>

          <h3 class="text-sm font-semibold text-slate-300 mb-2 uppercase tracking-wider">Termasuk Dalam Paket:</h3>
          <ul class="space-y-2 text-sm text-slate-400 mb-6">
            <li><i class="fas fa-check w-5 text-green-400"></i> {{ formatNumber(plan.included_managed_apps) }} Aplikasi Terkelola</li>
            <li><i class="fas fa-check w-5 text-green-400"></i> {{ formatNumber(plan.included_build_minutes) }} Menit Build</li>
            <li><i class="fas fa-check w-5 text-green-400"></i> {{ formatNumber(plan.included_ai_training_seconds) }} Detik Training AI</li>
            <li><i class="fas fa-check w-5 text-green-400"></i> {{ formatNumber(plan.included_api_tokens, true) }} Token API Gateway</li>
          </ul>

          <h3 class="text-sm font-semibold text-slate-300 mb-2 uppercase tracking-wider">Harga Pemakaian Tambahan:</h3>
           <div v-if="plan.usage_rates && plan.usage_rates.length > 0" class="space-y-1 text-sm text-slate-400">
             <div v-for="rate in plan.usage_rates" :key="rate.id" class="flex justify-between border-b border-slate-700/50 py-1 last:border-b-0">
               <span class="capitalize">{{ formatServiceName(rate.service_type) }}</span>
               <span class="font-semibold text-slate-300">{{ formatRate(rate.rate, rate.unit) }}</span>
             </div>
           </div>
           <p v-else class="text-sm text-slate-500 italic">Belum ada harga tambahan diatur.</p>
        </div>
      </div>
    </div>

    </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue';

// Definisikan tipe data berdasarkan PDF 
interface SubscriptionPlan {
  id: number;
  name: string;
  base_price_monthly: string | number;
  included_ai_training_seconds: number | null;
  included_api_tokens: number | null;
  included_managed_apps: number | null;
  included_build_minutes: number | null;
}

interface UsageRate {
  id: number;
  plan_id: number;
  service_type: string;
  unit: string;
  rate: string | number;
}

// Tipe gabungan untuk template
interface PlanWithRates extends SubscriptionPlan {
  usage_rates?: UsageRate[];
}

// 1. Meta Halaman & Middleware
definePageMeta({
  layout: 'admin',
  middleware: 'admin-auth' //
});
useHead({ title: 'Manajemen Paket Langganan' });

// 2. State Management (Modal, dll - bisa ditambahkan nanti)
// const showModal = ref(false);
// const planToEdit = ref<PlanWithRates | null>(null);

// 3. Data Fetching
const { data, pending, error, refresh: refreshData } = await useAsyncData<{ plans: SubscriptionPlan[], rates: UsageRate[] }>(
    'adminSubscriptionPlans',
    async () => {
        const { $client } = useNuxtApp(); // Gunakan Supabase client

        // Ambil semua plans dan rates secara paralel
        const [plansRes, ratesRes] = await Promise.all([
            $client.from('subscription_plans').select('*').order('base_price_monthly', { ascending: true }),
            $client.from('usage_rates').select('*').order('plan_id').order('id')
        ]);

        if (plansRes.error) throw plansRes.error;
        if (ratesRes.error) throw ratesRes.error;

        // Konversi harga ke number jika perlu
        const plans = (plansRes.data || []).map(p => ({
            ...p,
            base_price_monthly: parseFloat(p.base_price_monthly || '0')
        }));
         const rates = (ratesRes.data || []).map(r => ({
             ...r,
             rate: parseFloat(r.rate || '0')
         }));

        return { plans, rates };
    },
    { default: () => ({ plans: [], rates: [] }) }
);

// 4. Computed Properties
const allPlans = computed(() => data.value?.plans || []);
const allRates = computed(() => data.value?.rates || []);

// Gabungkan plans dengan rates yang sesuai
const plansWithRates = computed((): PlanWithRates[] => {
    return allPlans.value.map(plan => ({
        ...plan,
        usage_rates: allRates.value.filter(rate => rate.plan_id === plan.id)
    }));
});

// Handle error (contoh sederhana)
if (error.value) { console.error('Error fetching subscription plans data:', error.value); }

// 5. Methods (Placeholder)
const openAddPlanModal = () => {
    // planToEdit.value = null;
    // showModal.value = true;
    alert('TODO: Buka modal untuk tambah paket baru.');
};

const editPlan = (plan: PlanWithRates) => {
    // planToEdit.value = { ...plan }; // Salin data plan
    // showModal.value = true;
    alert(`TODO: Buka modal untuk edit paket: ${plan.name}`);
};

// const closeModal = () => {
//     showModal.value = false;
//     planToEdit.value = null;
// };

// 6. Utility Functions
const formatRupiah = (amount: number | string | undefined | null): string => {
    const num = typeof amount === 'string' ? parseFloat(amount) : amount;
    if (num === null || num === undefined || isNaN(num)) return 'Rp 0';
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0 // Tidak pakai desimal untuk harga paket
  }).format(num);
};

const formatNumber = (num: number | null | undefined, isToken = false): string => {
    if (num === null || num === undefined) return '0';
    if (isToken && num >= 1000000) return `${(num / 1000000).toLocaleString('id-ID')} Juta`;
    if (isToken && num >= 1000) return `${(num / 1000).toLocaleString('id-ID')} Ribu`;
    return num.toLocaleString('id-ID');
};

const formatServiceName = (serviceType: string): string => {
    // Ubah snake_case ke format yang lebih enak dibaca
    return (serviceType || '').replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
};

const formatRate = (rate: number | string | undefined | null, unit: string | undefined | null): string => {
    const numRate = typeof rate === 'string' ? parseFloat(rate) : rate;
    if (numRate === null || numRate === undefined || isNaN(numRate)) return '-';

    const formattedRate = new Intl.NumberFormat('id-ID', {
        style: 'currency',
        currency: 'IDR',
        minimumFractionDigits: (unit?.includes('token') || unit?.includes('second')) ? 2 : 0, // Desimal untuk token/detik
        maximumFractionDigits: 3 // Maks 3 desimal
    }).format(numRate);

    // Format unit
    let formattedUnit = unit || '';
    if (unit === 'per_gpu_second') formattedUnit = '/detik GPU';
    else if (unit === 'per_1000_tokens') formattedUnit = '/1k token';
    else if (unit === 'per_app_per_month') formattedUnit = '/app/bulan';
    else if (unit === 'per_minute') formattedUnit = '/menit';
    else if (unit === 'per_gb') formattedUnit = '/GB';
    else if (unit) formattedUnit = `/${unit.replace('per_', '')}`; // Fallback

    return `${formattedRate}${formattedUnit}`;
};

</script>

<style scoped>
.error-panel { background-color: rgba(220, 38, 38, 0.2); border-color: rgba(239, 68, 68, 0.5); }
.text-red-400 { color: #f87171; }
.text-red-300 { color: #fca5a5; }
.text-green-400 { color: #4ade80; }
.text-amber-400 { color: #facc15; }
.fa-check { vertical-align: middle; margin-right: 0.5rem;}
</style>