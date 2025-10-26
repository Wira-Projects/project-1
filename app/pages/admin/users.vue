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
      <p v-if="error.message" class="text-sm text-red-500 mt-2">Detail Error: {{ error.message }}</p>
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
                <button class="text-amber-400 hover:text-amber-300 transition">
                  <i class="fas fa-pencil-alt mr-1"></i> Edit
                </button>
                <button class="text-red-400 hover:text-red-300 transition">
                  <i class="fas fa-ban mr-1"></i> Suspend
                </button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue';
// Import composable HANYA yang diperlukan di top-level (client & server)
// Composable server akan diimpor DI DALAM useAsyncData
import { useAsyncData, definePageMeta, useHead, useRuntimeConfig, createError, useRequestEvent } from '#app';

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

// ----------------------------------------------------
// Meta Halaman & Middleware
// ----------------------------------------------------
definePageMeta({
  layout: 'admin',
  middleware: 'admin-auth'
});

useHead({
  title: 'Manajemen Pengguna',
});

// ----------------------------------------------------
// State untuk Pencarian
// ----------------------------------------------------
const searchQuery = ref('');

// ----------------------------------------------------
// Data Fetching Menggunakan useAsyncData (Server-Side)
// ----------------------------------------------------
const { data: users, pending, error } = await useAsyncData<DetailedUser[]>('adminUsers', async () => {
    // PERBAIKAN: Import composable server DI DALAM factory function
    const { serverSupabaseClient, serverSupabaseUser } = await import('#supabase/server');

    const event = useRequestEvent();
    if (!event) {
        console.error("useRequestEvent returned undefined. Cannot run server-side logic.");
        throw createError({ statusCode: 500, statusMessage: 'Server context not available.' });
    }
    const config = useRuntimeConfig(event);
    const adminEmail = config.public.adminEmail;

    // 1. Verifikasi pengguna saat ini adalah admin
    const currentUser = await serverSupabaseUser(event);
    if (!currentUser || currentUser.email !== adminEmail) {
        throw createError({ statusCode: 403, statusMessage: 'Forbidden' });
    }

    // 2. Buat admin client Supabase MENGGUNAKAN SERVICE KEY
    const adminClient = await serverSupabaseClient(event, { supabaseKey: config.supabaseServiceKey });
    if (!adminClient) {
        throw createError({ statusCode: 500, statusMessage: 'Supabase admin client not initialized.' });
    }

    // 3. Ambil daftar pengguna
    const { data: userData, error: listError } = await adminClient.auth.admin.listUsers({ });

    if (listError) {
        console.error("Server-side Error listing users:", listError);
        throw createError({ statusCode: 500, statusMessage: `Failed to list users: ${listError.message}` });
    }
    if (!userData || !userData.users) return [];

    // --- Logika Join Profile & Organisasi ---
    const userIds = userData.users.map(u => u.id);
    if (userIds.length === 0) return [];

    const { data: profiles, error: profileError } = await adminClient
        .from('profiles')
        .select('user_id, full_name, current_organization_id')
        .in('user_id', userIds);

    if (profileError) console.error("Server-side Error fetching profiles:", profileError);

    const organizationIds = profiles?.map(p => p.current_organization_id).filter(id => id != null) as number[] || [];
    let organizationsMap: Map<number, { name?: string }> = new Map();

    if (organizationIds.length > 0) {
        const { data: organizations, error: orgError } = await adminClient
            .from('organizations')
            .select('id, name')
            .in('id', organizationIds);

        if (orgError) console.error("Server-side Error fetching organizations:", orgError);
        else if (organizations) organizationsMap = new Map(organizations.map(org => [org.id, { name: org.name }]));
    }

    // Gabungkan data
    const detailedUsers: DetailedUser[] = userData.users.map(user => {
        const profile = profiles?.find(p => p.user_id === user.id) || null;
        const organization = profile?.current_organization_id
            ? organizationsMap.get(profile.current_organization_id) || null
            : null;
        return {
            id: user.id, email: user.email, created_at: user.created_at, email_confirmed_at: user.email_confirmed_at,
            profile: profile ? { full_name: profile.full_name, current_organization_id: profile.current_organization_id, organization: organization } : null,
        };
    });
    // --- Akhir Logika Join ---

    return detailedUsers;
}, {
    default: () => [] // Nilai default
});

// ----------------------------------------------------
// Filtering (Client-Side) - Tetap sama
// ----------------------------------------------------
const filteredUsers = computed((): DetailedUser[] => {
    const userList = users.value || [];
    if (!searchQuery.value) return userList;
    const lowerSearch = searchQuery.value.toLowerCase();
    return userList.filter(user =>
        (user.email && user.email.toLowerCase().includes(lowerSearch)) ||
        (user.profile?.full_name && user.profile.full_name.toLowerCase().includes(lowerSearch))
    );
});

// ----------------------------------------------------
// Utility Functions (Client-Side) - Tetap sama
// ----------------------------------------------------
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
/* Scoped styles (sudah ada sebelumnya) */
.error-panel {
    background-color: rgba(220, 38, 38, 0.2);
    border-color: rgba(239, 68, 68, 0.5);
}
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