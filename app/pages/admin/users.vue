<template>
    <div>
        <header class="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
            <h1 class="text-3xl font-bold text-slate-100">Manajemen Pengguna</h1>
            <div class="w-full md:w-auto">
                <input type="text" v-model="searchQuery" placeholder="Cari pengguna by email..."
                    class="w-full md:w-64 px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg focus:ring-amber-500 focus:border-amber-500 text-slate-200" />
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
                        <tr v-if="filteredUsers.length === 0">
                            <td colspan="6" class="p-4 text-center text-slate-500">
                                {{ searchQuery ? 'Tidak ada pengguna yang cocok dengan pencarian.' : 'Tidak ada data
                                pengguna.' }}
                            </td>
                        </tr>
                        <tr v-for="user in filteredUsers" :key="user.id">
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
                                    <i class="fas fa-pencil-alt"></i> Edit
                                </button>
                                <button class="text-red-400 hover:text-red-300 transition">
                                    <i class="fas fa-ban"></i> Suspend
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

// ----------------------------------------------------
// Meta Halaman & Middleware
// ----------------------------------------------------
definePageMeta({
    layout: 'admin',
    middleware: 'admin-auth' // Pastikan file middleware/admin-auth.ts ada
});

useHead({
    title: 'Manajemen Pengguna', // Judul akan menjadi "Manajemen Pengguna | Admin" karena layout
});

// ----------------------------------------------------
// Supabase Client & Data Fetching
// ----------------------------------------------------
const supabase = useSupabaseClient();
const searchQuery = ref('');

// Fungsi untuk mengambil data pengguna dari auth.users dan profil terkait
const fetchUsers = async () => {
    // Query ke auth.users dan join dengan tabel profiles dan organizations
    // Asumsi:
    // 1. Ada tabel 'profiles' dengan foreign key 'user_id' ke 'auth.users.id'.
    // 2. Tabel 'profiles' memiliki kolom 'full_name' dan 'current_organization_id'.
    // 3. Tabel 'organizations' memiliki 'id' dan 'name'.
    const { data: users, error } = await supabase.auth.admin.listUsers({
        // Anda bisa menambahkan paginasi di sini jika diperlukan
        // page: 1,
        // perPage: 20,
    });

    if (error) throw error;

    // Ambil detail profil dan organisasi untuk setiap user
    // Ini mungkin kurang efisien untuk banyak user, pertimbangkan join di sisi DB atau RPC jika performa menjadi isu
    const detailedUsers = await Promise.all(
        (users?.users || []).map(async (user) => {
            // Ambil profile
            const { data: profileData, error: profileError } = await supabase
                .from('profiles') // Ganti 'profiles' jika nama tabel Anda berbeda
                .select('full_name, current_organization_id')
                .eq('user_id', user.id)
                .single(); // Asumsi user_id unik

            if (profileError && profileError.code !== 'PGRST116') { // Abaikan error jika profile tidak ditemukan
                console.error(`Error fetching profile for user ${user.id}:`, profileError);
            }

            let organizationData = null;
            if (profileData?.current_organization_id) {
                // Ambil nama organisasi
                const { data: orgData, error: orgError } = await supabase
                    .from('organizations') // Ganti jika nama tabel Anda berbeda
                    .select('name')
                    .eq('id', profileData.current_organization_id)
                    .single();

                if (orgError) {
                    console.error(`Error fetching organization ${profileData.current_organization_id}:`, orgError);
                } else {
                    organizationData = orgData;
                }
            }

            return {
                ...user, // Data dari auth.users (id, email, created_at, dll)
                profile: {
                    ...profileData,
                    organization: organizationData // Data organisasi (jika ada)
                }
            };
        })
    );

    return detailedUsers;
};

// Gunakan useAsyncData untuk fetch data
const { data: users, pending, error } = useAsyncData('adminUsers', fetchUsers);

// ----------------------------------------------------
// Filtering & Computed Properties
// ----------------------------------------------------
const filteredUsers = computed(() => {
    if (!users.value) return [];
    if (!searchQuery.value) {
        return users.value;
    }
    const lowerSearch = searchQuery.value.toLowerCase();
    return users.value.filter(user =>
        user.email?.toLowerCase().includes(lowerSearch) ||
        user.profile?.full_name?.toLowerCase().includes(lowerSearch)
    );
});

// ----------------------------------------------------
// Utility Functions
// ----------------------------------------------------
const formatDate = (dateString: string | undefined): string => {
    if (!dateString) return '-';
    return new Date(dateString).toLocaleDateString('id-ID', {
        day: '2-digit',
        month: 'short',
        year: 'numeric'
    });
};

const getStatusClasses = (confirmedAt: string | undefined): string => {
    if (confirmedAt) {
        // Aktif
        return 'bg-green-500/30 text-green-400';
    } else {
        // Pending atau Belum Konfirmasi
        return 'bg-yellow-500/30 text-yellow-400';
    }
    // Tambahkan logika untuk status 'Suspended' jika ada kolomnya
    // return 'bg-slate-500/30 text-slate-400';
};

</script>

<style scoped>
/* Scoped styles jika ada yang spesifik untuk halaman ini */
/* Menggunakan style dari dashboard sebagai contoh */
.error-panel {
    background-color: rgba(220, 38, 38, 0.2);
    border-color: rgba(239, 68, 68, 0.5);
}

.text-red-400 {
    color: #f87171;
}

.text-red-300 {
    color: #fca5a5;
}

.text-red-500 {
    color: #ef4444;
}

/* Status badge styles */
.bg-green-500\/30 {
    background-color: rgba(34, 197, 94, 0.3);
}

.bg-yellow-500\/30 {
    background-color: rgba(245, 158, 11, 0.3);
}

.bg-slate-500\/30 {
    background-color: rgba(100, 116, 139, 0.3);
}

/* Untuk Suspended */
.text-green-400 {
    color: #4ade80;
}

.text-yellow-400 {
    color: #facc15;
}

.text-slate-400 {
    color: #94a3b8;
}

/* Untuk Suspended */
</style>