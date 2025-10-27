<template>
  <div>
    <h1 class="text-3xl font-bold text-slate-100 mb-8">Manajemen Marketplace AI</h1>

    <div class="border-b border-slate-700 mb-6">
      <nav class="-mb-px flex space-x-8" aria-label="Tabs">
        <button
          @click="activeTab = 'models'"
          :class="[
            activeTab === 'models'
              ? 'border-amber-500 text-amber-400'
              : 'border-transparent text-slate-400 hover:text-slate-300 hover:border-slate-500',
            'whitespace-nowrap py-3 px-1 border-b-2 font-semibold text-sm transition-colors duration-200 focus:outline-none'
          ]"
        >
          Model AI
        </button>
        <button
          @click="activeTab = 'providers'"
          :class="[
            activeTab === 'providers'
              ? 'border-amber-500 text-amber-400'
              : 'border-transparent text-slate-400 hover:text-slate-300 hover:border-slate-500',
            'whitespace-nowrap py-3 px-1 border-b-2 font-semibold text-sm transition-colors duration-200 focus:outline-none'
          ]"
        >
          Penyedia API
        </button>
      </nav>
    </div>

    <div v-if="pending" class="text-center py-10">
      <i class="fas fa-spinner fa-spin text-amber-400 text-3xl"></i>
      <p class="mt-2 text-slate-400">Memuat data marketplace...</p>
    </div>

    <div v-else-if="errorResponse" class="error-panel card p-6 rounded-lg mb-6 bg-red-900/30 border border-red-700">
      <h2 class="text-xl font-bold text-red-400 mb-2">Gagal Memuat Data Marketplace</h2>
      <p class="text-red-300">{{ errorResponse.error?.statusMessage || 'Terjadi kesalahan.' }} (Code: {{ errorResponse.error?.statusCode || 'N/A' }})</p>
      <details v-if="debugData" class="mt-4 text-left text-xs text-red-200 bg-red-800/30 p-3 rounded">
        <summary class="cursor-pointer font-semibold">Debug Info</summary>
        <pre class="mt-2 whitespace-pre-wrap break-words">{{ JSON.stringify(debugData, null, 2) }}</pre>
      </details>
    </div>

    <div v-else>
      <details v-if="debugData" class="mb-4 text-left text-xs text-green-200 bg-green-800/30 p-3 rounded">
        <summary class="cursor-pointer font-semibold">Debug Info (Sukses)</summary>
        <pre class="mt-2 whitespace-pre-wrap break-words">{{ JSON.stringify(debugData, null, 2) }}</pre>
      </details>

      <div v-if="activeTab === 'models'">
        <div class="flex justify-end mb-4">
          <button @click="addModel" class="cta-button text-white font-semibold py-2 px-4 rounded-lg text-sm">
            <i class="fas fa-plus mr-2"></i> Tambah Model Baru
          </button>
        </div>
        <div class="card rounded-lg overflow-hidden">
          <div class="overflow-x-auto">
            <table class="w-full text-left text-sm whitespace-nowrap">
              <thead class="bg-slate-900/50 text-slate-400">
                <tr>
                  <th class="p-4 font-semibold">Nama Model</th>
                  <th class="p-4 font-semibold">Penyedia</th>
                  <th class="p-4 font-semibold">Harga Beli (Input/Output)</th>
                  <th class="p-4 font-semibold">Harga Jual (Input/Output)</th>
                  <th class="p-4 font-semibold">Tersedia</th>
                  <th class="p-4 font-semibold">Aksi</th>
                </tr>
              </thead>
              <tbody class="divide-y divide-slate-700">
                <tr v-if="!marketplaceModels || marketplaceModels.length === 0">
                  <td colspan="6" class="p-4 text-center text-slate-500">
                    Tidak ada data model AI.
                  </td>
                </tr>
                <tr v-else v-for="model in marketplaceModels" :key="model.id">
                  <td class="p-4 font-medium">{{ model.display_name }}</td>
                  <td class="p-4 text-slate-300">{{ model.api_providers?.name || 'N/A' }}</td>
                  <td class="p-4 text-slate-400">
                    {{ formatRupiah(parseFloat(model.provider_cost_per_million_input), 3) }} / {{ formatRupiah(parseFloat(model.provider_cost_per_million_output), 3) }}
                  </td>
                  <td class="p-4">
                     {{ formatRupiah(parseFloat(model.selling_price_per_million_input), 3) }} / {{ formatRupiah(parseFloat(model.selling_price_per_million_output), 3) }}
                  </td>
                   <td class="p-4">
                      <label :for="`toggle-${model.id}`" class="flex items-center cursor-pointer">
                        <div class="relative">
                          <input
                            type="checkbox"
                            :id="`toggle-${model.id}`"
                            class="sr-only"
                            :checked="model.is_available"
                            @change="toggleAvailability(model, $event)"
                            :disabled="togglingStatus[model.id]"
                          >
                          <div class="block bg-slate-600 w-10 h-6 rounded-full transition duration-200 ease-in-out"></div>
                          <div
                            :class="{ 'translate-x-4 bg-amber-400': model.is_available, 'bg-slate-300': !model.is_available }"
                            class="dot absolute left-1 top-1 w-4 h-4 rounded-full transition-transform duration-200 ease-in-out">
                          </div>
                        </div>
                        <i v-if="togglingStatus[model.id]" class="fas fa-spinner fa-spin text-slate-400 ml-2"></i>
                      </label>
                   </td>
                  <td class="p-4">
                    <button @click="editModel(model.id)" class="text-amber-400 hover:text-amber-300 transition" :disabled="togglingStatus[model.id]">
                      <i class="fas fa-pencil-alt mr-1"></i> Edit
                    </button>
                    </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>

       <div v-if="activeTab === 'providers'">
        <div class="card p-6 rounded-lg text-center text-slate-400">
          <p>Tampilan untuk manajemen Penyedia API akan ditambahkan di sini.</p>
          </div>
      </div>

    </div> </div>
</template>

<script setup lang="ts">
import { ref, computed, reactive } from 'vue';

// Definisikan tipe data sesuai dengan API route
interface ApiProvider {
    id: number;
    name: string;
}

interface MarketplaceModel {
    id: number;
    provider_id: number;
    provider_model_id: string;
    display_name: string;
    model_type: string;
    context_window: number | null;
    provider_cost_per_million_input: string; // Tipe DECIMAL di DB sering dibaca sebagai string
    provider_cost_per_million_output: string;
    selling_price_per_million_input: string;
    selling_price_per_million_output: string;
    is_available: boolean;
    api_providers: ApiProvider | null; // Objek hasil join
}

interface DebugInfo { /* ... Definisi DebugInfo ... */ }

interface ApiResponse {
    models: MarketplaceModel[];
    debug: DebugInfo;
}

interface ApiErrorResponse {
    error: { statusCode: number; statusMessage: string; data?: any };
    debug: DebugInfo;
}

// Meta Halaman & Middleware
definePageMeta({
  layout: 'admin',
  middleware: 'admin-auth'
});

useHead({
  title: 'Marketplace AI', // Judul akan menjadi "Marketplace AI | Admin"
});

// State
const activeTab = ref<'models' | 'providers'>('models'); // Default tab
const togglingStatus = reactive<Record<number, boolean>>({}); // Untuk status loading per toggle

// Data Fetching
const { data: response, pending, error: fetchError, refresh } = await useAsyncData<ApiResponse | ApiErrorResponse>(
  'adminMarketplace',
  () => $fetch<ApiResponse | ApiErrorResponse>('/api/admin/marketplace'),
);

// Computed properties untuk data dan error
const marketplaceModels = computed(() => {
  if (response.value && !('error' in response.value)) {
    return (response.value as ApiResponse).models;
  }
  return [];
});

const errorResponse = computed(() => {
    // Logika error handling sama seperti di admin/users.vue
     if (fetchError.value) {
     const statusCode = fetchError.value.statusCode || 500;
     const statusMessage = fetchError.value.statusMessage || fetchError.value.message || 'Error fetching data';
     const debugFallback = { errorMessage: statusMessage, step: 'useAsyncData fetch failed' };
     return {
         error: { statusCode, statusMessage, data: fetchError.value.data },
         debug: (fetchError.value.data as any)?.debug || debugFallback
     } as ApiErrorResponse;
  }
  if (response.value && 'error' in response.value) {
    return response.value as ApiErrorResponse;
  }
  return null;
});

const debugData = computed(() => {
    if (response.value && !('error' in response.value)) {
        return (response.value as ApiResponse).debug;
    }
    return errorResponse.value?.debug || null;
});

// Utility Functions
const formatRupiah = (amount: number | null | undefined, maximumFractionDigits = 0): string => {
  if (amount === null || amount === undefined || isNaN(amount)) return 'Rp 0';
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0,
    maximumFractionDigits: maximumFractionDigits // Tambahkan opsi ini
  }).format(amount);
};


// Actions
const editModel = (modelId: number) => {
  alert(`TODO: Implement edit functionality for model ID: ${modelId}`);
};

const addModel = () => {
    alert('TODO: Implement add new model functionality.');
};

const toggleAvailability = async (model: MarketplaceModel, event: Event) => {
    const target = event.target as HTMLInputElement;
    const newAvailability = target.checked;
    const modelId = model.id;

    // Set loading state untuk model ini
    togglingStatus[modelId] = true;

    // Optimistic UI update (opsional tapi bagus untuk UX)
    // Cari model di array dan update statusnya
    const modelIndex = marketplaceModels.value.findIndex(m => m.id === modelId);
    if (modelIndex !== -1) {
       // Buat salinan objek untuk menghindari mutasi langsung state proxy
       // Meskipun kita akan refresh, ini mencegah error sementara
       const updatedModel = { ...marketplaceModels.value[modelIndex], is_available: newAvailability };
       // Jika menggunakan state management atau ref langsung, update seperti ini:
       // marketplaceModels.value[modelIndex] = updatedModel;
       // Karena marketplaceModels adalah computed, kita tidak bisa langsung assign.
       // Kita akan mengandalkan refresh() setelah API call berhasil.
    }


    try {
        await $fetch(`/api/admin/marketplace/${modelId}`, {
            method: 'PATCH',
            body: { is_available: newAvailability },
        });
        // Jika sukses, refresh data untuk mendapatkan state terbaru dari server
        await refresh();
        // Beri sedikit jeda agar refresh selesai sebelum menghapus loading
         await new Promise(resolve => setTimeout(resolve, 100));
    } catch (err: any) {
        console.error('Failed to update model availability:', err);
        alert(`Gagal mengubah status model: ${err.data?.message || err.message}`);
        // Rollback UI jika menggunakan optimistic update
         if (modelIndex !== -1) {
            // Jika kita bisa memutasi (misal jika data ada di ref, bukan computed dari useAsyncData):
            // marketplaceModels.value[modelIndex].is_available = !newAvailability;
            // Atau, setidaknya reset checkbox
            target.checked = !newAvailability;
         }
         // Kita bisa juga refresh() di sini untuk memastikan data konsisten setelah error
         await refresh();
         await new Promise(resolve => setTimeout(resolve, 100));


    } finally {
        // Hapus loading state
        delete togglingStatus[modelId];
    }
};

</script>

<style scoped>
/* Scoped styles for toggle, tabs, etc. */
.tab-link.active {
    border-bottom-color: #f59e0b; /* amber-500 */
    color: #fcd34d; /* amber-300 atau sesuaikan */
}
.tab-link:not(.active) {
    border-bottom-color: transparent;
}
/* Style untuk toggle switch */
.dot {
    transition: transform 0.2s ease-in-out, background-color 0.2s ease-in-out;
}
/* Error panel styling (bisa disalin dari admin/users.vue) */
.error-panel { background-color: rgba(220, 38, 38, 0.2); border-color: rgba(239, 68, 68, 0.5); }
.text-red-400 { color: #f87171; }
.text-red-300 { color: #fca5a5; }
/* Debug info styling (bisa disalin dari admin/users.vue) */
details > summary { list-style: none; }
details > summary::-webkit-details-marker { display: none; }
pre { font-family: monospace; font-size: 0.75rem; line-height: 1.25; }
</style>