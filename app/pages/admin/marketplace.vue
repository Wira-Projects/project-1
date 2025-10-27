<template>
  <div>
    <h1 class="text-3xl font-bold text-slate-100 mb-8">Manajemen Marketplace AI</h1>

    <div class="border-b border-slate-700 mb-6">
       <nav class="-mb-px flex space-x-8" aria-label="Tabs">
         <button @click="activeTab = 'models'" :class="[ activeTab === 'models' ? 'border-amber-500 text-amber-400' : 'border-transparent text-slate-400 hover:text-slate-300 hover:border-slate-500', 'whitespace-nowrap py-3 px-1 border-b-2 font-semibold text-sm transition-colors duration-200 focus:outline-none' ]">
           Model AI
         </button>
         <button @click="activeTab = 'providers'" :class="[ activeTab === 'providers' ? 'border-amber-500 text-amber-400' : 'border-transparent text-slate-400 hover:text-slate-300 hover:border-slate-500', 'whitespace-nowrap py-3 px-1 border-b-2 font-semibold text-sm transition-colors duration-200 focus:outline-none' ]">
           Penyedia API
         </button>
       </nav>
     </div>


    <div v-if="pending && !response" class="text-center py-10">
      <i class="fas fa-spinner fa-spin text-amber-400 text-3xl"></i>
      <p class="mt-2 text-slate-400">Memuat data marketplace...</p>
    </div>

    <div v-else-if="errorResponse" class="error-panel card p-6 rounded-lg mb-6 bg-red-900/30 border border-red-700">
        <h2 class="text-xl font-bold text-red-400 mb-2">Gagal Memuat Data</h2>
        <p class="text-red-300">{{ errorResponse.error?.statusMessage || 'Terjadi kesalahan.' }} (Code: {{ errorResponse.error?.statusCode || 'N/A' }})</p>
        <details v-if="debugData" class="mt-4 text-left text-xs text-red-200 bg-red-800/30 p-3 rounded">
            <summary class="cursor-pointer font-semibold">Debug Info</summary>
            <pre class="mt-2 whitespace-pre-wrap break-words">{{ JSON.stringify(debugData, null, 2) }}</pre>
        </details>
     </div>


    <div v-else>
      <details v-if="debugData && !errorResponse" class="mb-4 text-left text-xs text-green-200 bg-green-800/30 p-3 rounded">
          <summary class="cursor-pointer font-semibold">Debug Info (Sukses)</summary>
          <pre class="mt-2 whitespace-pre-wrap break-words">{{ JSON.stringify(debugData, null, 2) }}</pre>
      </details>

      <div v-if="activeTab === 'models'">
        <div class="flex justify-end mb-4">
          <button @click="openAddModelModal" class="cta-button text-white font-semibold py-2 px-4 rounded-lg text-sm transition hover:opacity-90">
            <i class="fas fa-plus mr-2"></i> Tambah Model Baru (Database)
          </button>
        </div>
        <div class="card rounded-lg overflow-hidden">
          <div class="overflow-x-auto">
             <table class="w-full text-left text-sm whitespace-nowrap">
                <thead class="bg-slate-900/50 text-slate-400">
                 <tr>
                   <th class="p-4 font-semibold">Nama Model</th>
                   <th class="p-4 font-semibold">Penyedia</th>
                   <th class="p-4 font-semibold">Harga Beli (Input/Output per 1M)</th>
                   <th class="p-4 font-semibold">Harga Jual (Input/Output per 1M)</th>
                   <th class="p-4 font-semibold">Tersedia</th>
                   <th class="p-4 font-semibold">Aksi</th>
                 </tr>
               </thead>
               <tbody class="divide-y divide-slate-700">
                     <tr v-if="pending">
                        <td colspan="6" class="p-4 text-center text-slate-500">
                            <i class="fas fa-spinner fa-spin mr-2"></i> Memuat...
                        </td>
                     </tr>
                     <tr v-else-if="!marketplaceModels || marketplaceModels.length === 0">
                       <td colspan="6" class="p-4 text-center text-slate-500">
                         Tidak ada data model AI.
                       </td>
                     </tr>
                     <tr v-else v-for="model in marketplaceModels" :key="model.id">
                       <td class="p-4 font-medium">{{ model.display_name }}</td>
                       <td class="p-4 text-slate-300">{{ model.api_providers?.name || 'N/A' }}</td>
                       <td class="p-4 text-slate-400">
                         {{ formatCurrency(parseFloat(model.provider_cost_per_million_input), 'USD', 3) }} / {{ formatCurrency(parseFloat(model.provider_cost_per_million_output), 'USD', 3) }}
                       </td>
                       <td class="p-4">
                          {{ formatCurrency(parseFloat(model.selling_price_per_million_input), 'USD', 3) }} / {{ formatCurrency(parseFloat(model.selling_price_per_million_output), 'USD', 3) }}
                       </td>
                        <td class="p-4">
                           <label :for="`toggle-${model.id}`" class="flex items-center cursor-pointer">
                             <div class="relative">
                               <input type="checkbox" :id="`toggle-${model.id}`" class="sr-only" :checked="model.is_available" @change="toggleAvailability(model, $event)" :disabled="togglingStatus[model.id]">
                               <div class="block bg-slate-600 w-10 h-6 rounded-full transition duration-200 ease-in-out"></div>
                               <div :class="{ 'translate-x-4 bg-amber-400': model.is_available, 'bg-slate-300': !model.is_available }" class="dot absolute left-1 top-1 w-4 h-4 rounded-full transition-transform duration-200 ease-in-out"></div>
                             </div>
                             <i v-if="togglingStatus[model.id]" class="fas fa-spinner fa-spin text-slate-400 ml-2"></i>
                           </label>
                        </td>
                       <td class="p-4">
                         <button @click="editModel(model.id)" class="text-amber-400 hover:text-amber-300 transition disabled:opacity-50 disabled:cursor-not-allowed" :disabled="togglingStatus[model.id]">
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
         <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
           <div class="card p-6 rounded-lg">
             <h2 class="text-xl font-bold mb-4 text-amber-400">OpenRouter API Keys</h2>
              <p class="text-sm text-slate-400 mb-4">Buat API Key khusus untuk pengguna melalui API Provisioning OpenRouter.</p>
             <form @submit.prevent="submitNewOpenRouterKey">
                <div class="mb-3">
                     <label for="or_key_name" class="block text-sm font-medium text-slate-300 mb-1">Nama Key Baru <span class="text-red-400">*</span></label>
                     <input type="text" id="or_key_name" v-model="newOpenRouterKeyData.name" placeholder="Nama deskriptif (misal: Project X User)" required class="form-input w-full text-sm">
                 </div>
                 <div class="mb-4">
                     <label for="or_key_limit" class="block text-sm font-medium text-slate-300 mb-1">Limit Kredit (USD Cents, Opsional)</label>
                     <input type="number" id="or_key_limit" v-model.number="newOpenRouterKeyData.limit" placeholder="Kosongkan jika tanpa limit" min="0" class="form-input w-full text-sm">
                     <p class="text-xs text-slate-500 mt-1">Misal: 1000 untuk $10.00</p>
                 </div>
                 <p v-if="addOpenRouterKeyError" class="error-banner text-sm mb-4">{{ addOpenRouterKeyError }}</p>
                 <p v-if="addOpenRouterKeySuccess" class="success-banner text-sm mb-4">{{ addOpenRouterKeySuccess }} <code class="text-xs bg-slate-600 px-1 rounded">{{ lastCreatedKeyLabel }}</code></p>
                 <button type="submit" :disabled="isAddingOpenRouterKey" class="w-full cta-button text-white font-semibold py-2 px-4 rounded-lg text-sm transition hover:opacity-90 disabled:opacity-70 disabled:cursor-not-allowed">
                     <i v-if="isAddingOpenRouterKey" class="fas fa-spinner fa-spin mr-2"></i>
                     {{ isAddingOpenRouterKey ? 'Membuat Key...' : 'Buat OpenRouter Key' }}
                 </button>
             </form>
             <hr class="border-slate-700 my-6">
             <h3 class="text-lg font-semibold mb-3">Daftar Key (TBD)</h3>
             <p class="text-sm text-slate-400">Fitur untuk melihat, mengedit, dan menghapus key OpenRouter akan ditambahkan di sini.</p>
           </div>
           <div class="card p-6 rounded-lg">
              <h2 class="text-xl font-bold mb-4">Penyedia Lain</h2>
              <p class="text-sm text-slate-400">Manajemen untuk provider lain akan ditambahkan di sini.</p>
           </div>
         </div>
       </div>

    </div> <div v-if="showAddModelModal" class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black bg-opacity-70 backdrop-blur-sm">
          <div class="bg-slate-800 p-6 rounded-xl shadow-2xl z-50 max-w-lg w-full border border-slate-700 max-h-[90vh] overflow-y-auto">
            <div class="flex justify-between items-center mb-6">
                 <h3 class="text-xl font-bold text-amber-400">Tambah Model AI Baru (Database)</h3>
                 <button @click="closeAddModelModal" class="text-slate-400 hover:text-white transition text-xl">&times;</button>
            </div>
             <form @submit.prevent="submitNewModel">
                 <div class="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                    <div>
                        <label for="provider_name" class="block text-sm font-medium text-slate-300 mb-1">Nama Penyedia API <span class="text-red-400">*</span></label>
                        <input
                            type="text"
                            id="provider_name"
                            v-model="newModelData.provider_name"
                            placeholder="Ketik nama (contoh: OpenRouter)"
                            required
                            class="form-input w-full"
                            list="provider-list"
                        >
                        <datalist id="provider-list">
                             <option v-for="provider in apiProviders" :key="provider.id" :value="provider.name" />
                        </datalist>
                    </div>
                    <div>
                        <label for="provider_model_id" class="block text-sm font-medium text-slate-300 mb-1">ID Model Penyedia <span class="text-red-400">*</span></label>
                        <input type="text" id="provider_model_id" v-model="newModelData.provider_model_id" placeholder="misal: mistralai/mixtral-8x7b" required class="form-input w-full">
                    </div>
                     <div class="md:col-span-2"><label for="display_name" class="block text-sm font-medium text-slate-300 mb-1">Nama Tampilan <span class="text-red-400">*</span></label><input type="text" id="display_name" v-model="newModelData.display_name" placeholder="misal: Mixtral 8x7B Instruct" required class="form-input w-full"></div>
                    <div><label for="model_type" class="block text-sm font-medium text-slate-300 mb-1">Tipe Model <span class="text-red-400">*</span></label><select id="model_type" v-model="newModelData.model_type" required class="form-input w-full"><option disabled value="">Pilih Tipe</option><option value="text_generation">Text Generation</option><option value="image_generation">Image Generation</option><option value="embedding">Embedding</option><option value="multimodal">Multimodal</option><option value="other">Lainnya</option></select></div>
                    <div><label for="context_window" class="block text-sm font-medium text-slate-300 mb-1">Context Window (Token)</label><input type="number" id="context_window" v-model.number="newModelData.context_window" placeholder="misal: 32768" min="0" class="form-input w-full"></div>
                    <div class="md:col-span-2 border-t border-slate-700 pt-4 mt-2"><p class="text-sm font-medium text-slate-300 mb-2">Harga Beli (per 1M Token, USD)</p><div class="grid grid-cols-2 gap-4"><div><label for="provider_cost_in" class="block text-xs text-slate-400 mb-1">Input <span class="text-red-400">*</span></label><input type="number" step="0.001" id="provider_cost_in" v-model="newModelData.provider_cost_per_million_input" required min="0" class="form-input w-full"></div><div><label for="provider_cost_out" class="block text-xs text-slate-400 mb-1">Output <span class="text-red-400">*</span></label><input type="number" step="0.001" id="provider_cost_out" v-model="newModelData.provider_cost_per_million_output" required min="0" class="form-input w-full"></div></div></div>
                    <div class="md:col-span-2 border-t border-slate-700 pt-4 mt-2"><p class="text-sm font-medium text-slate-300 mb-2">Harga Jual (per 1M Token, USD)</p><div class="grid grid-cols-2 gap-4"><div><label for="selling_price_in" class="block text-xs text-slate-400 mb-1">Input <span class="text-red-400">*</span></label><input type="number" step="0.001" id="selling_price_in" v-model="newModelData.selling_price_per_million_input" required min="0" class="form-input w-full"></div><div><label for="selling_price_out" class="block text-xs text-slate-400 mb-1">Output <span class="text-red-400">*</span></label><input type="number" step="0.001" id="selling_price_out" v-model="newModelData.selling_price_per_million_output" required min="0" class="form-input w-full"></div></div></div>
                    <div class="md:col-span-2 mt-2"><label class="flex items-center space-x-2 cursor-pointer"><input type="checkbox" v-model="newModelData.is_available" class="form-checkbox h-5 w-5 rounded bg-slate-700 border-slate-600 text-amber-500 focus:ring-amber-500"><span class="text-sm font-medium text-slate-300">Tersedia untuk Pengguna</span></label></div>

                 </div>
                 <p v-if="addModelError" class="error-banner text-sm mb-4">{{ addModelError }}</p>
                 <div class="flex justify-end space-x-3 mt-6">
                     <button type="button" @click="closeAddModelModal" class="py-2 px-4 bg-slate-600 hover:bg-slate-500 rounded-lg text-slate-200 font-medium transition text-sm">Batal</button>
                     <button type="submit" :disabled="isAddingModel" class="py-2 px-5 cta-button text-white rounded-lg font-medium transition text-sm disabled:opacity-70 disabled:cursor-not-allowed"><i v-if="isAddingModel" class="fas fa-spinner fa-spin mr-2"></i>{{ isAddingModel ? 'Menyimpan...' : 'Simpan Model' }}</button>
                 </div>
             </form>
         </div>
     </div>

  </div>
</template>

<script setup lang="ts">
import { ref, computed, reactive } from 'vue';

// --- Interfaces (Sama) ---
interface ApiProvider { id: number; name: string; }
interface MarketplaceModel { /* ... */
    id: number; provider_id: number; provider_model_id: string; display_name: string;
    model_type: string; context_window: number | null; provider_cost_per_million_input: string;
    provider_cost_per_million_output: string; selling_price_per_million_input: string;
    selling_price_per_million_output: string; is_available: boolean;
    api_providers: Pick<ApiProvider, 'id' | 'name'> | null;
}
interface DebugInfo { /* ... */ }
interface ApiResponse { models: MarketplaceModel[]; providers: ApiProvider[]; debug: DebugInfo; }
interface ApiErrorResponse { error: { statusCode: number; statusMessage: string; data?: any }; debug: DebugInfo; }
interface OpenRouterKey { hash: string; label: string; name: string; limit: number | null; created_at: string; }


// --- Meta & Middleware (Sama) ---
definePageMeta({ layout: 'admin', middleware: 'admin-auth' });
useHead({ title: 'Marketplace AI' });

// --- State ---
const activeTab = ref<'models' | 'providers'>('models');
const togglingStatus = reactive<Record<number, boolean>>({});
const showAddModelModal = ref(false);
const isAddingModel = ref(false);
const addModelError = ref<string | null>(null);
// ✅ Ubah state form tambah model: ganti provider_id dengan provider_name
const newModelData = reactive({
    provider_name: '', // <-- Ganti dari provider_id
    provider_model_id: '',
    display_name: '',
    model_type: '',
    context_window: null,
    provider_cost_per_million_input: '0.000',
    provider_cost_per_million_output: '0.000',
    selling_price_per_million_input: '0.000',
    selling_price_per_million_output: '0.000',
    is_available: true,
});

const isAddingOpenRouterKey = ref(false);
const addOpenRouterKeyError = ref<string | null>(null);
const addOpenRouterKeySuccess = ref<string | null>(null);
const lastCreatedKeyLabel = ref<string | null>(null);
const newOpenRouterKeyData = reactive({ name: '', limit: null as number | null });

// --- Data Fetching (Sama) ---
const { data: response, pending, error: fetchError, refresh } = await useAsyncData<ApiResponse | ApiErrorResponse>(
    'adminMarketplace',
    () => $fetch<ApiResponse | ApiErrorResponse>('/api/admin/marketplace'),
);

// --- Computed Properties (Sama) ---
const marketplaceModels = computed(() => (response.value && !('error' in response.value)) ? (response.value as ApiResponse).models : []);
const apiProviders = computed(() => (response.value && !('error' in response.value)) ? (response.value as ApiResponse).providers : []);
const errorResponse = computed(() => { /* ... sama ... */
    if (fetchError.value) { /* ... */
         const statusCode = fetchError.value?.statusCode || 500;
         const statusMessage = fetchError.value?.statusMessage || fetchError.value?.message || 'Error fetching data';
         return { error: { statusCode, statusMessage, data: fetchError.value?.data }, debug: {} } as ApiErrorResponse;
    }
    if (response.value && 'error' in response.value) { return response.value as ApiErrorResponse; }
    return null;
});
const debugData = computed(() => { /* ... sama ... */
    if (response.value && !('error' in response.value)) { return (response.value as ApiResponse).debug; }
    return errorResponse.value?.debug || null;
});


// --- Utility Functions (Sama) ---
const formatCurrency = (amount: number | null | undefined, currency = 'USD', maximumFractionDigits = 2): string => { /* ... sama ... */
  if (amount === null || amount === undefined || isNaN(amount)) return `${currency} 0`;
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: currency, minimumFractionDigits: 2, maximumFractionDigits: maximumFractionDigits }).format(amount);
};


// --- Actions ---
const editModel = (modelId: number) => alert(`TODO: Edit model ID: ${modelId}`);

const openAddModelModal = () => {
  // ✅ Reset form (gunakan provider_name)
  Object.assign(newModelData, {
    provider_name: '', provider_model_id: '', display_name: '', model_type: '', context_window: null,
    provider_cost_per_million_input: '0.000', provider_cost_per_million_output: '0.000',
    selling_price_per_million_input: '0.000', selling_price_per_million_output: '0.000',
    is_available: true,
  });
  addModelError.value = null;
  showAddModelModal.value = true;
};

const closeAddModelModal = () => { showAddModelModal.value = false; };

// ✅ Update fungsi submit model baru
const submitNewModel = async () => {
    isAddingModel.value = true;
    addModelError.value = null;

    // Payload sekarang mengirim provider_name, bukan provider_id
    const payload = {
        provider_name: newModelData.provider_name, // <-- Kirim nama
        provider_model_id: newModelData.provider_model_id,
        display_name: newModelData.display_name,
        model_type: newModelData.model_type,
        context_window: newModelData.context_window ? Number(newModelData.context_window) : null,
        provider_cost_per_million_input: String(newModelData.provider_cost_per_million_input),
        provider_cost_per_million_output: String(newModelData.provider_cost_per_million_output),
        selling_price_per_million_input: String(newModelData.selling_price_per_million_input),
        selling_price_per_million_output: String(newModelData.selling_price_per_million_output),
        is_available: newModelData.is_available,
    };

    try {
        const result = await $fetch('/api/admin/marketplace', {
            method: 'POST',
            body: payload,
        });

        // @ts-ignore
        if (result && result.success) { closeAddModelModal(); await refresh(); alert(result.message || 'Model baru berhasil ditambahkan!'); }
        else { /* @ts-ignore */ throw new Error(result?.error?.statusMessage || 'Gagal menyimpan model.'); }
    } catch (err: any) {
        // Tangkap error spesifik jika provider tidak ditemukan
        if (err.statusCode === 400 && err.data?.message?.toLowerCase().includes('provider not found')) {
            addModelError.value = `Penyedia API "${newModelData.provider_name}" tidak ditemukan. Pastikan nama sudah benar atau tambahkan penyedia baru terlebih dahulu.`;
        } else {
             addModelError.value = err.data?.message || err.message || 'Terjadi kesalahan saat menyimpan model.';
        }
        console.error("Error adding model:", err);
    } finally {
        isAddingModel.value = false;
    }
};

const toggleAvailability = async (model: MarketplaceModel, event: Event) => { /* ... sama ... */
     const target = event.target as HTMLInputElement; const newAvailability = target.checked; const modelId = model.id;
    togglingStatus[modelId] = true;
    try {
        await $fetch(`/api/admin/marketplace/${modelId}`, { method: 'PATCH', body: { is_available: newAvailability } });
        await refresh(); await new Promise(resolve => setTimeout(resolve, 100));
    } catch (err: any) {
        console.error('Failed update:', err); alert(`Gagal: ${err.data?.message || err.message}`); target.checked = !newAvailability;
        await refresh(); await new Promise(resolve => setTimeout(resolve, 100));
    } finally { delete togglingStatus[modelId]; }
};

const submitNewOpenRouterKey = async () => { /* ... sama ... */
     isAddingOpenRouterKey.value = true; addOpenRouterKeyError.value = null; addOpenRouterKeySuccess.value = null; lastCreatedKeyLabel.value = null;
    const payload = { name: newOpenRouterKeyData.name, limit: newOpenRouterKeyData.limit && newOpenRouterKeyData.limit > 0 ? newOpenRouterKeyData.limit : undefined, };
    try {
        const result = await $fetch<ApiSuccessResponse>('/api/admin/openrouter/keys', { method: 'POST', body: payload });
        if (result && result.success) { addOpenRouterKeySuccess.value = result.message + " Key: "; lastCreatedKeyLabel.value = result.newKeyData.label; newOpenRouterKeyData.name = ''; newOpenRouterKeyData.limit = null; }
        else { /* @ts-ignore */ throw new Error(result?.error?.statusMessage || 'Gagal.'); }
    } catch (err: any) { addOpenRouterKeyError.value = err.data?.message || err.message || 'Terjadi kesalahan.'; }
    finally { isAddingOpenRouterKey.value = false; }
};

</script>

<style scoped>
/* --- Style scoped (Sama) --- */
.tab-link.active { border-bottom-color: #f59e0b; color: #fcd34d; }
.tab-link:not(.active) { border-bottom-color: transparent; }
.dot { transition: transform 0.2s ease-in-out, background-color 0.2s ease-in-out; }
.error-panel { background-color: rgba(220, 38, 38, 0.2); border-color: rgba(239, 68, 68, 0.5); }
.text-red-400 { color: #f87171; }
.text-red-300 { color: #fca5a5; }
details > summary { list-style: none; }
details > summary::-webkit-details-marker { display: none; }
pre { font-family: monospace; font-size: 0.75rem; line-height: 1.25; }

.form-input, .form-select, .form-checkbox { background-color: rgba(51, 65, 85, 0.7); border: 1px solid rgba(71, 85, 105, 0.8); color: #e2e8f0; border-radius: 0.5rem; padding: 0.5rem 0.75rem; transition: border-color 0.2s ease, box-shadow 0.2s ease; font-size: 0.875rem; }
.form-input:focus, .form-select:focus, .form-checkbox:focus { outline: none; border-color: #f59e0b; box-shadow: 0 0 0 2px rgba(245, 158, 11, 0.3); }
.form-select { padding-right: 2.5rem; background-image: url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3e%3cpath stroke='%2394a3b8' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' d='M6 8l4 4 4-4'/%3e%3c/svg%3e"); background-position: right 0.5rem center; background-repeat: no-repeat; background-size: 1.5em 1.5em; -webkit-appearance: none; -moz-appearance: none; appearance: none; }
.form-checkbox { padding: 0; height: 1.25rem; width: 1.25rem; flex-shrink: 0; }
.error-banner { background-color: #7f1d1d; color: #fecaca; padding: 0.75rem 1rem; border-radius: 0.5rem; text-align: center; }
.success-banner { background-color: #064e3b; color: #d1fae5; padding: 0.75rem 1rem; border-radius: 0.5rem; text-align: center; }

input[type=number]::-webkit-inner-spin-button,
input[type=number]::-webkit-outer-spin-button { -webkit-appearance: none; margin: 0; opacity: 1; }
input[type=number] { -moz-appearance: textfield; }
</style>