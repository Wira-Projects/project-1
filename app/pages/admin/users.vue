<template>
  <div>
    <header class="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
      <h1 class="text-3xl font-bold text-slate-100">Manajemen Pengguna</h1>
      <div class="w-full md:w-auto">
        <input
          type="text"
          v-model="searchQuery"
          placeholder="Cari pengguna by email/nama..."
          class="w-full md:w-64 px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg focus:ring-amber-500 focus:border-amber-500 text-slate-200"
        />
      </div>
    </header>

    <div v-if="pending" class="text-center py-10">
      <i class="fas fa-spinner fa-spin text-amber-400 text-3xl"></i>
      <p class="mt-2 text-slate-400">Memuat data pengguna...</p>
    </div>

    <div v-else-if="errorResponse" class="error-panel card p-6 rounded-lg mb-6 bg-red-900/30 border border-red-700">
      <h2 class="text-xl font-bold text-red-400 mb-2">Gagal Memuat Data Pengguna</h2>
      <p class="text-red-300">{{ errorResponse.error?.statusMessage || 'Terjadi kesalahan.' }} (Code: {{ errorResponse.error?.statusCode || 'N/A' }})</p>
      <details v-if="errorResponse.debug" class="mt-4 text-left text-xs text-red-200 bg-red-800/30 p-3 rounded">
        <summary class="cursor-pointer font-semibold">Debug Info</summary>
        <pre class="mt-2 whitespace-pre-wrap break-words">{{ JSON.stringify(errorResponse.debug, null, 2) }}</pre>
      </details>
    </div>

    <div v-else class="card rounded-lg overflow-hidden">
      <details v-if="debugData" class="m-4 text-left text-xs text-green-200 bg-green-800/30 p-3 rounded">
        <summary class="cursor-pointer font-semibold">Debug Info (Sukses)</summary>
        <pre class="mt-2 whitespace-pre-wrap break-words">{{ JSON.stringify(debugData, null, 2) }}</pre>
      </details>

      <div class="overflow-x-auto">
        <table class="w-full text-left text-sm whitespace-nowrap">
          <thead class="bg-slate-900/50 text-slate-400">
            <tr>
              <th class="p-4 font-semibold">Nama Pengguna</th>
              <th class="p-4 font-semibold">Email</th>
              <th class="p-4 font-semibold">Organisasi Aktif</th>
              <th class="p-4 font-semibold">Tanggal Daftar</th>
              <th class="p-4 font-semibold">Status</th>
              <th class="p-4 font-semibold">Aksi</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-slate-700">
            <tr v-if="!filteredUsers || filteredUsers.length === 0">
              <td colspan="6" class="p-4 text-center text-slate-500">
                {{ searchQuery ? 'Tidak ada pengguna yang cocok dengan pencarian.' : 'Tidak ada data pengguna.' }}
              </td>
            </tr>
            <tr v-else v-for="user in filteredUsers" :key="user.id">
              <td class="p-4">{{ user.profile?.full_name || user.email?.split('@')[0] || 'N/A' }}</td>
              <td class="p-4">{{ user.email }}</td>
              <td class="p-4">{{ user.profile?.organization?.name || '-' }}</td>
              <td class="p-4">{{ formatDate(user.created_at) }}</td>
              <td class="p-4">
                <span :class="getStatusClasses(user.email_confirmed_at)"
                      class="text-xs font-semibold py-1 px-2 rounded-full capitalize">
                  {{ user.email_confirmed_at ? 'Active' : 'Pending' }}
                </span>
              </td>
              <td class="p-4 space-x-2">
                <button @click="editUser(user)" class="text-amber-400 hover:text-amber-300 transition">
                  <i class="fas fa-pencil-alt mr-1"></i> Edit
                </button>
                <button @click="confirmSuspend(user)" class="text-red-400 hover:text-red-300 transition">
                  <i class="fas fa-ban mr-1"></i> Suspend
                </button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <div v-if="userToSuspend" class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black bg-opacity-70 backdrop-blur-sm">
       <div class="bg-slate-800 p-6 rounded-xl shadow-2xl z-50 max-w-sm w-full border border-slate-700">
            <h3 class="text-xl font-bold text-red-400 mb-4 flex items-center">
                <i class="fas fa-triangle-exclamation mr-3"></i> Konfirmasi Hapus Pengguna
            </h3>
            <p class="text-slate-300 mb-6">
                Apakah Anda yakin ingin menghapus pengguna <strong class="text-white">{{ userToSuspend.email }}</strong> secara permanen? Tindakan ini tidak dapat dibatalkan dan akan menghapus data terkait pengguna ini dari sistem autentikasi.
            </p>
            <div class="flex justify-end space-x-3">
                <button @click="userToSuspend = null" class="py-2 px-4 bg-slate-700 hover:bg-slate-600 rounded-lg text-slate-300 font-medium transition">
                    Batal
                </button>
                <button @click="suspendUser()" :disabled="suspending" class="py-2 px-4 bg-red-600 hover:bg-red-700 rounded-lg text-white font-medium transition disabled:opacity-50">
                    <i v-if="suspending" class="fas fa-spinner fa-spin mr-2"></i>
                    <i v-else class="fas fa-trash-alt mr-2"></i> {{ suspending ? 'Memproses...' : 'Ya, Hapus Pengguna' }}
                </button>
            </div>
             <p v-if="suspendError" class="text-red-400 text-sm mt-4">{{ suspendError }}</p>
        </div>
    </div>

    <div v-if="showEditModal && userToEdit" class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black bg-opacity-70 backdrop-blur-sm">
       <div class="bg-slate-800 p-6 rounded-xl shadow-2xl z-50 max-w-md w-full border border-slate-700">
            <h3 class="text-xl font-bold text-amber-400 mb-6 flex items-center">
                <i class="fas fa-pencil-alt mr-3"></i> Edit Pengguna
            </h3>

            <form @submit.prevent="saveUserChanges">
                <div class="mb-4">
                    <label class="block text-sm font-medium text-slate-400 mb-1">Email (Read-only)</label>
                    <input type="email" :value="userToEdit.email" disabled class="form-input w-full bg-slate-700 cursor-not-allowed text-slate-400">
                </div>
                <div class="mb-6">
                    <label for="editFullName" class="block text-sm font-medium text-slate-300 mb-1">Nama Lengkap</label>
                    <input
                        type="text"
                        id="editFullName"
                        v-model="editableFullName"
                        placeholder="Nama lengkap pengguna"
                        class="form-input w-full"
                    />
                </div>
                <p v-if="editError" class="text-red-400 text-sm mb-4">{{ editError }}</p>

                <div class="flex justify-end space-x-3 mt-8">
                    <button type="button" @click="closeEditModal" class="py-2 px-4 bg-slate-600 hover:bg-slate-500 rounded-lg text-slate-200 font-medium transition text-sm">
                        Batal
                    </button>
                    <button type="submit" :disabled="editLoading" class="py-2 px-5 cta-button text-white rounded-lg font-medium transition text-sm disabled:opacity-70 disabled:cursor-not-allowed">
                        <i v-if="editLoading" class="fas fa-spinner fa-spin mr-2"></i>
                        {{ editLoading ? 'Menyimpan...' : 'Simpan Perubahan' }}
                    </button>
                </div>
            </form>
        </div>
    </div>

  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue';

// Definisikan tipe DetailedUser dan DebugInfo (sesuaikan jika perlu)
interface DetailedUser {
    id: string;
    email?: string;
    created_at?: string;
    email_confirmed_at?: string | null;
    profile: {
        full_name?: string | null; // Izinkan null
        current_organization_id?: number | null;
        organization?: {
            name?: string;
        } | null;
    } | null;
}
interface DebugInfo { /* ... Definisi DebugInfo ... */ }
interface ApiResponse { users: DetailedUser[]; debug: DebugInfo; }
interface ApiErrorResponse { error: { statusCode: number; statusMessage: string; data?: any }; debug: DebugInfo; }

// Meta Halaman & Middleware
definePageMeta({ layout: 'admin', middleware: 'admin-auth' });
useHead({ title: 'Manajemen Pengguna' });

// State Utama
const searchQuery = ref('');

// State untuk Modal Hapus
const userToSuspend = ref<DetailedUser | null>(null);
const suspending = ref(false);
const suspendError = ref<string | null>(null);

// State untuk Modal Edit
const showEditModal = ref(false);
const userToEdit = ref<DetailedUser | null>(null);
const editableFullName = ref(''); // State terpisah untuk v-model di modal
const editLoading = ref(false);
const editError = ref<string | null>(null);

// Data Fetching
const { data: response, pending, error: fetchError, refresh } = await useAsyncData<ApiResponse | ApiErrorResponse>(
  'adminUsers',
  () => $fetch<ApiResponse | ApiErrorResponse>('/api/admin/users'),
);

// Computed Properties untuk Data & Error
const usersData = computed(() => (response.value && !('error' in response.value) ? (response.value as ApiResponse).users : []));
const errorResponse = computed(() => {
    if (fetchError.value) {
        const statusCode = fetchError.value.statusCode || 500;
        const statusMessage = fetchError.value.statusMessage || fetchError.value.message || 'Error fetching data';
        const debugFallback = { errorMessage: statusMessage, step: 'useAsyncData fetch failed' };
        return { error: { statusCode, statusMessage, data: fetchError.value.data }, debug: (fetchError.value.data as any)?.debug || debugFallback } as ApiErrorResponse;
    }
    return response.value && 'error' in response.value ? response.value as ApiErrorResponse : null;
});
const debugData = computed(() => response.value && !('error' in response.value) ? (response.value as ApiResponse).debug : errorResponse.value?.debug || null);

// Computed Property untuk Filtering
const filteredUsers = computed((): DetailedUser[] => {
    const userList = usersData.value;
    if (!searchQuery.value) return userList;
    const lowerSearch = searchQuery.value.toLowerCase();
    return userList.filter(user =>
        (user.email && user.email.toLowerCase().includes(lowerSearch)) ||
        (user.profile?.full_name && user.profile.full_name.toLowerCase().includes(lowerSearch))
    );
});

// Watcher untuk mengisi form modal edit saat userToEdit berubah
watch(userToEdit, (newUser) => {
    if (newUser) {
        editableFullName.value = newUser.profile?.full_name || ''; // Isi form dari data user
    }
});

// Methods untuk Aksi Hapus
const confirmSuspend = (user: DetailedUser) => { userToSuspend.value = user; suspendError.value = null; };
const suspendUser = async () => {
   if (!userToSuspend.value) return;
    suspending.value = true;
    suspendError.value = null;
    try {
        const userIdToDelete = userToSuspend.value.id;
        const response = await $fetch(`/api/admin/users/${userIdToDelete}`, { method: 'DELETE' });
        // @ts-ignore - Asumsi response sukses punya property success
        if (response && response.success) {
            const deletedEmail = userToSuspend.value.email;
            userToSuspend.value = null;
            await refresh();
            alert(`Pengguna ${deletedEmail || userIdToDelete} berhasil dihapus.`);
        } else {
             // @ts-ignore
            throw new Error(response?.error?.statusMessage || response?.message || 'Gagal menghapus pengguna.');
        }
    } catch (err: any) {
        console.error("Error deleting user:", err);
        const message = err.data?.message || err.statusMessage || err.message || 'Terjadi kesalahan.';
        suspendError.value = message;
        // Jangan alert di sini karena error sudah ditampilkan di modal
    } finally {
        suspending.value = false;
    }
};

// Methods untuk Aksi Edit
const editUser = (user: DetailedUser) => {
    userToEdit.value = JSON.parse(JSON.stringify(user)); // Salin data user agar tidak terikat langsung
    editError.value = null;
    showEditModal.value = true;
};
const closeEditModal = () => {
    showEditModal.value = false;
    userToEdit.value = null;
    editableFullName.value = ''; // Reset form
};
const saveUserChanges = async () => {
    if (!userToEdit.value) return;
    editLoading.value = true;
    editError.value = null;
    try {
        const userIdToUpdate = userToEdit.value.id;
        const payload = {
            full_name: editableFullName.value.trim() || null // Kirim null jika kosong
            // Tambahkan field lain dari 'profiles' jika ada
        };

        // Panggil API PATCH baru yang akan kita buat
        const response = await $fetch(`/api/admin/users/${userIdToUpdate}`, {
            method: 'PATCH',
            body: payload
        });

         // @ts-ignore
         if (response && response.success) {
            closeEditModal();
            await refresh(); // Refresh daftar pengguna
            alert(`Profil pengguna ${userToEdit.value.email} berhasil diperbarui.`);
        } else {
             // @ts-ignore
            throw new Error(response?.error?.statusMessage || response?.message || 'Gagal menyimpan perubahan.');
        }
    } catch (err: any) {
        console.error("Error updating user:", err);
        editError.value = err.data?.message || err.statusMessage || err.message || 'Terjadi kesalahan saat menyimpan.';
    } finally {
        editLoading.value = false;
    }
};

// Utility Functions
const formatDate = (dateString?: string): string => {
    if (!dateString) return '-';
    try { return new Date(dateString).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' }); }
    catch (e) { console.error("Invalid date:", dateString, e); return '-'; }
};
const getStatusClasses = (confirmedAt?: string | null): string => {
    return confirmedAt ? 'bg-green-500/30 text-green-400' : 'bg-yellow-500/30 text-yellow-400';
};
</script>

<style scoped>
/* Scoped styles */
.error-panel { background-color: rgba(220, 38, 38, 0.2); border-color: rgba(239, 68, 68, 0.5); }
.text-red-400 { color: #f87171; }
.text-red-300 { color: #fca5a5; }
.text-red-500 { color: #ef4444; }
.bg-green-500\/30 { background-color: rgba(34, 197, 94, 0.3); }
.bg-yellow-500\/30 { background-color: rgba(245, 158, 11, 0.3); }
.text-green-400 { color: #4ade80; }
.text-yellow-400 { color: #facc15; }
.text-slate-400 { color: #94a3b8; }
/* Style untuk debug info */
details > summary { list-style: none; cursor: pointer;}
details > summary::-webkit-details-marker { display: none; }
pre { font-family: monospace; font-size: 0.75rem; line-height: 1.25; }

/* Style tambahan untuk input form di modal (ambil dari main.css jika perlu) */
.form-input {
    background-color: rgba(30, 41, 59, 0.7);
    border: 1px solid rgba(55, 65, 81, 0.8);
    color: #e2e8f0;
    border-radius: 0.5rem;
    padding: 0.75rem 1rem;
    transition: border-color 0.2s ease, box-shadow 0.2s ease;
}
.form-input:focus {
    outline: none;
    border-color: #f59e0b; /* amber-500 */
    box-shadow: 0 0 0 2px rgba(245, 158, 11, 0.3);
}
.form-input:disabled {
    opacity: 0.6;
}
</style>