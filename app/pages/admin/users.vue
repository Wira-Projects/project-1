<template>
  <div>
    <header class="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
      <h1 class="text-3xl font-bold text-slate-100">Manajemen Pengguna</h1>
      <div class="w-full md:w-auto">
        <input
          type="text"
          v-model="searchQuery"
          placeholder="Cari pengguna by email..."
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

      <details class="mt-4 text-left text-xs text-red-200 bg-red-800/30 p-3 rounded">
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
                <button @click="editUser(user.id)" class="text-amber-400 hover:text-amber-300 transition">
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

    <div v-if="userToSuspend" class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black bg-opacity-70">
       <div class="bg-slate-800 p-6 rounded-xl shadow-2xl z-50 max-w-sm w-full border border-slate-700">
            <h3 class="text-xl font-bold text-red-400 mb-4 flex items-center">
                <i class="fas fa-triangle-exclamation mr-3"></i> Konfirmasi Suspend
            </h3>
            <p class="text-slate-300 mb-6">
                Apakah Anda yakin ingin menghapus pengguna <strong class="text-white">{{ userToSuspend.email }}</strong> secara permanen? Tindakan ini tidak dapat dibatalkan.
            </p>
            <div class="flex justify-end space-x-3">
                <button @click="userToSuspend = null" class="py-2 px-4 bg-slate-700 hover:bg-slate-600 rounded-lg text-slate-300 font-medium transition">
                    Batal
                </button>
                <button @click="suspendUser()" :disabled="suspending" class="py-2 px-4 bg-red-600 hover:bg-red-700 rounded-lg text-white font-medium transition disabled:opacity-50">
                    <i v-if="suspending" class="fas fa-spinner fa-spin mr-2"></i>
                    <i v-else class="fas fa-ban mr-2"></i>
                    {{ suspending ? 'Memproses...' : 'Ya, Hapus Pengguna' }}
                </button>
            </div>
             <p v-if="suspendError" class="text-red-400 text-sm mt-4">{{ suspendError }}</p>
        </div>
    </div>

  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue';

// Definisikan tipe DetailedUser dan DebugInfo (bisa diimpor jika diletakkan di file terpisah)
interface DetailedUser {
    id: string;
    email?: string;
    created_at?: string;
    email_confirmed_at?: string | null;
    profile: {
        full_name?: string;
        current_organization_id?: number | null;
        organization?: {
            name?: string;
        } | null;
    } | null;
}

interface DebugInfo {
    invoked: boolean;
    expectedAdminEmail?: string | null;
    serviceKeyPresent?: boolean;
    serverUserEmail?: string | null;
    accessGranted?: boolean;
    errorMessage?: string;
    step?: string;
}

// Definisikan tipe untuk respons sukses dan error
interface ApiResponse {
    users: DetailedUser[];
    debug: DebugInfo;
}

interface ApiErrorResponse {
    error: {
      statusCode: number;
      statusMessage: string;
      data?: any;
    };
    debug: DebugInfo;
}

// Meta Halaman & Middleware
definePageMeta({
  layout: 'admin',
  middleware: 'admin-auth'
});

useHead({
  title: 'Manajemen Pengguna',
});

// State
const searchQuery = ref('');
const userToSuspend = ref<DetailedUser | null>(null);
const suspending = ref(false);
const suspendError = ref<string | null>(null);

// ----------------------------------------------------
// Data Fetching Menggunakan useAsyncData
// Tipe data sekarang adalah ApiResponse | ApiErrorResponse
// ----------------------------------------------------
const { data: response, pending, error: fetchError, refresh } = await useAsyncData<ApiResponse | ApiErrorResponse>(
  'adminUsers',
  () => $fetch<ApiResponse | ApiErrorResponse>('/api/admin/users'), // Tentukan tipe fetch
);

// Computed properties untuk memisahkan data sukses dan error
const usersData = computed(() => {
  // Cek jika response ada dan TIDAK memiliki properti 'error'
  if (response.value && !('error' in response.value)) {
    return (response.value as ApiResponse).users;
  }
  return []; // Default ke array kosong jika error atau data belum ada
});

const errorResponse = computed(() => {
  // Jika fetchError (dari useAsyncData) ada, gunakan itu
  if (fetchError.value) {
     console.error("fetchError from useAsyncData:", fetchError.value);
     // Buat struktur error palsu jika perlu, atau coba ekstrak dari fetchError.value.data
     const statusCode = fetchError.value.statusCode || 500;
     const statusMessage = fetchError.value.statusMessage || fetchError.value.message || 'Error fetching data';
     const debugFallback = { errorMessage: statusMessage, step: 'useAsyncData fetch failed' };
     return {
         error: { statusCode, statusMessage, data: fetchError.value.data },
         debug: (fetchError.value.data as any)?.debug || debugFallback // Coba ambil debug dari data error
     } as ApiErrorResponse;
  }
  // Jika response dari API memiliki properti 'error'
  if (response.value && 'error' in response.value) {
    return response.value as ApiErrorResponse;
  }
  return null; // Tidak ada error
});

const debugData = computed(() => {
    if (response.value && !('error' in response.value)) {
        return (response.value as ApiResponse).debug;
    }
    // Debug info juga ada di errorResponse
    return errorResponse.value?.debug || null;
});


// Filtering (Client-Side) - Menggunakan usersData
const filteredUsers = computed((): DetailedUser[] => {
    const userList = usersData.value; // Gunakan computed property usersData
    if (!searchQuery.value) return userList;
    const lowerSearch = searchQuery.value.toLowerCase();
    return userList.filter(user =>
        (user.email && user.email.toLowerCase().includes(lowerSearch)) ||
        (user.profile?.full_name && user.profile.full_name.toLowerCase().includes(lowerSearch))
    );
});

// Actions (Client-Side methods) - Tidak berubah
const editUser = (userId: string) => {
    alert(`TODO: Implement edit functionality for user ID: ${userId}`);
};

const confirmSuspend = (user: DetailedUser) => {
    userToSuspend.value = user;
    suspendError.value = null;
};

// Fungsi suspendUser (memanggil API DELETE) - Tidak berubah
const suspendUser = async () => {
   if (!userToSuspend.value) return;
    suspending.value = true;
    suspendError.value = null;
    try {
        const userIdToDelete = userToSuspend.value.id;
        // Panggil API route DELETE
        const response = await $fetch(`/api/admin/users/${userIdToDelete}`, {
            method: 'DELETE',
        });

        // @ts-ignore
        if (response && response.success) {
            const deletedEmail = userToSuspend.value.email; // Simpan email sebelum null
            userToSuspend.value = null;
            await refresh(); // Refresh daftar pengguna
            alert(`Pengguna ${deletedEmail || userIdToDelete} berhasil dihapus.`);
        } else {
             // @ts-ignore
            throw new Error(response?.error || 'Gagal menghapus pengguna dari server.');
        }

    } catch (err: any) {
        console.error("Error deleting user:", err);
        const message = err.data?.message || err.statusMessage || err.message || 'Terjadi kesalahan saat menghapus pengguna.';
        suspendError.value = message;
        alert(`Gagal menghapus pengguna: ${message}`);
    } finally {
        suspending.value = false;
    }
};

// Utility Functions (Client-Side) - Tidak berubah
const formatDate = (dateString: string | undefined): string => {
    if (!dateString) return '-';
    try { return new Date(dateString).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' }); }
    catch (e) { console.error("Invalid date format:", dateString, e); return '-'; }
};

const getStatusClasses = (confirmedAt: string | null | undefined): string => {
    return confirmedAt ? 'bg-green-500/30 text-green-400' : 'bg-yellow-500/30 text-yellow-400';
};
</script>

<style scoped>
/* Scoped styles (sama seperti sebelumnya) */
.error-panel { background-color: rgba(220, 38, 38, 0.2); border-color: rgba(239, 68, 68, 0.5); }
.text-red-400 { color: #f87171; }
.text-red-300 { color: #fca5a5; }
.text-red-500 { color: #ef4444; }
.bg-green-500\/30 { background-color: rgba(34, 197, 94, 0.3); }
.bg-yellow-500\/30 { background-color: rgba(245, 158, 11, 0.3); }
.bg-slate-500\/30 { background-color: rgba(100, 116, 139, 0.3); }
.text-green-400 { color: #4ade80; }
.text-yellow-400 { color: #facc15; }
.text-slate-400 { color: #94a3b8; }
/* Style untuk debug info */
details > summary {
    list-style: none;
}
details > summary::-webkit-details-marker {
    display: none;
}
pre {
    font-family: monospace;
    font-size: 0.75rem; /* text-xs */
    line-height: 1.25;
}
</style>