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

    <div v-else-if="error" class="error-panel card p-6 rounded-lg text-center bg-red-900/30 border border-red-700">
      <h2 class="text-xl font-bold text-red-400 mb-2">Gagal Memuat Data Pengguna</h2>
      <p class="text-red-300">Terjadi kesalahan saat mengambil data. Silakan coba lagi.</p>
      <p v-if="error" class="text-sm text-red-500 mt-2">Detail Error: {{ error.statusMessage || error.message || error.toString() }}</p>
    </div>

    <div v-else class="card rounded-lg overflow-hidden">
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
                Apakah Anda yakin ingin men-suspend pengguna <strong class="text-white">{{ userToSuspend.email }}</strong>? Ini akan menghapus pengguna secara permanen.
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
// Auto-imports akan menangani useAsyncData, definePageMeta, useHead, useNuxtApp
// Import #imports hanya di dalam blok if (process.server)

// Tipe DetailedUser (tetap sama)
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

// Meta Halaman & Middleware (tetap sama)
definePageMeta({
  layout: 'admin',
  middleware: 'admin-auth'
});

useHead({
  title: 'Manajemen Pengguna',
});

// State (tetap sama)
const searchQuery = ref('');
const userToSuspend = ref<DetailedUser | null>(null);
const suspending = ref(false);
const suspendError = ref<string | null>(null);

// Data Fetching Menggunakan useAsyncData (PERBAIKAN DI SINI)
const { data: users, pending, error, refresh } = await useAsyncData<DetailedUser[]>('adminUsers', async () => {
    // Jalankan logika server HANYA jika process.server true
    if (process.server) {
        // Impor composables server secara eksplisit MENGGUNAKAN #imports
        const { useRequestEvent, useRuntimeConfig, createError, serverSupabaseUser, serverSupabaseClient } = await import('#imports');

        const event = useRequestEvent();
        const config = useRuntimeConfig();
        const adminEmail = config.public.adminEmail;
        const serviceKey = config.supabaseServiceKey;

        if (!event) throw createError({ statusCode: 500, statusMessage: 'Server context error.' });
        if (!serviceKey) throw createError({ statusCode: 500, statusMessage: 'Server configuration error: Service key missing.' });

        // Gunakan composables yang sudah diimpor
        const currentUser = await serverSupabaseUser(event);
        if (!currentUser || currentUser.email !== adminEmail) {
            throw createError({ statusCode: 403, statusMessage: 'Forbidden' });
        }

        const adminClient = await serverSupabaseClient(event, { supabaseKey: serviceKey });
        if (!adminClient) throw createError({ statusCode: 500, statusMessage: 'Failed to create Supabase admin client.' });

        // Fetch users (logika selanjutnya tetap sama)
        const { data: userData, error: listError } = await adminClient.auth.admin.listUsers({});
        if (listError) throw createError({ statusCode: 500, statusMessage: `Failed to list users: ${listError.message}` });
        if (!userData || !userData.users) return [];

        // Fetch profiles & organizations (logika join sama seperti sebelumnya)
        const userIds = userData.users.map(u => u.id);
        if (userIds.length === 0) return [];

        const { data: profiles, error: profileError } = await adminClient
            .from('profiles').select('user_id, full_name, current_organization_id').in('user_id', userIds);
        if (profileError) console.error("Server Error fetching profiles:", profileError);

        const organizationIds = profiles?.map(p => p.current_organization_id).filter(id => id != null) as number[] || [];
        let organizationsMap: Map<number, { name?: string }> = new Map();
        if (organizationIds.length > 0) {
            const { data: organizations, error: orgError } = await adminClient
                .from('organizations').select('id, name').in('id', organizationIds);
            if (orgError) console.error("Server Error fetching organizations:", orgError);
            else if (organizations) organizationsMap = new Map(organizations.map(org => [org.id, { name: org.name }]));
        }

        // Combine data (logika combine data tetap sama)
        const detailedUsers: DetailedUser[] = userData.users.map(user => {
            const profile = profiles?.find(p => p.user_id === user.id) || null;
            const organization = profile?.current_organization_id ? organizationsMap.get(profile.current_organization_id) || null : null;
            return {
                id: user.id, email: user.email, created_at: user.created_at, email_confirmed_at: user.email_confirmed_at,
                profile: profile ? { full_name: profile.full_name, current_organization_id: profile.current_organization_id, organization: organization } : null,
            };
        });

        // Pastikan return di akhir blok if
        return detailedUsers;

    } else {
        // Client-side: Logika fallback tetap sama
        // console.warn("useAsyncData factory running on client for adminUsers. Trying to use SSR payload."); // Bisa dihapus jika tidak perlu
        const nuxtApp = useNuxtApp();
        const ssrData = nuxtApp.payload.data['adminUsers'];
        return (ssrData || []) as DetailedUser[];
    }
}, {
    default: () => [], // Nilai default penting
});


// Filtering (Client-Side) (tetap sama)
const filteredUsers = computed((): DetailedUser[] => {
    const userList = Array.isArray(users.value) ? users.value : [];
    if (!searchQuery.value) return userList;
    const lowerSearch = searchQuery.value.toLowerCase();
    return userList.filter(user =>
        (user.email && user.email.toLowerCase().includes(lowerSearch)) ||
        (user.profile?.full_name && user.profile.full_name.toLowerCase().includes(lowerSearch))
    );
});

// Actions (Client-Side methods calling server logic via API/RPC needed) (tetap sama)
const editUser = (userId: string) => {
    alert(`TODO: Implement edit functionality for user ID: ${userId}`);
    // navigateTo(`/admin/users/${userId}/edit`);
};

const confirmSuspend = (user: DetailedUser) => {
    userToSuspend.value = user;
    suspendError.value = null;
};

// Placeholder - requires server route/RPC for actual delete (tetap sama)
const suspendUser = async () => {
    if (!userToSuspend.value) return;
    suspending.value = true;
    suspendError.value = null;
    try {
        console.warn("Delete action requires a server API route to call deleteUserServer securely.");

        // ---- PASTIKAN ANDA SUDAH MEMBUAT API ROUTE INI ----
        const userIdToDelete = userToSuspend.value.id;
        // Panggil API route (contoh, sesuaikan path jika perlu)
        const response = await $fetch(`/api/admin/users/${userIdToDelete}`, {
            method: 'DELETE',
        });
        // ---------------------------------------------------

        if (response.success) { // Sesuaikan dengan struktur respons API Anda
            console.log(`User ${userIdToDelete} successfully deleted.`);
            userToSuspend.value = null;
            await refresh(); // Refresh daftar pengguna
             alert(`Pengguna ${userIdToDelete} berhasil dihapus.`);
        } else {
            throw new Error(response.error || 'Gagal menghapus pengguna dari server.');
        }

    } catch (err: any) {
        console.error("Error deleting user:", err);
        const message = err.data?.message || err.message || 'Terjadi kesalahan saat menghapus pengguna.';
        suspendError.value = message;
        alert(`Gagal menghapus pengguna: ${message}`);
    } finally {
        suspending.value = false;
    }
};

// Utility Functions (Client-Side) (tetap sama)
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
/* Scoped styles (tetap sama) */
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
</style>