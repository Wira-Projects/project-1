<template>
  <div class="antialiased flex min-h-screen" :class="{ 'bg-slate-900 text-slate-200': true }">
    
    <div
      v-if="isSidebarOpen"
      class="fixed inset-0 z-20 bg-black bg-opacity-50 lg:hidden"
      @click="isSidebarOpen = false"
    ></div>

    <aside 
      class="flex flex-col justify-between p-4 border-r border-slate-800 bg-slate-900 w-64 fixed top-0 left-0 h-full z-30 transition-transform duration-300"
      :class="{ 
        'translate-x-0': isSidebarOpen,
        '-translate-x-full': !isSidebarOpen,
        'lg:translate-x-0': true
      }"
    >
      <div>
        <div class="text-2xl font-bold mb-10 text-slate-100 flex justify-between items-center">
          <NuxtLink to="/admin/dashboard" class="flex-shrink-0">
            <i class="fas fa-shield-halved text-amber-400"></i> Admin<span class="font-light text-slate-400">Panel</span>
          </NuxtLink>
          
          <button @click="isSidebarOpen = false" class="lg:hidden p-2">
            <i class="fas fa-times text-slate-400 hover:text-white"></i>
          </button>
        </div>

        <nav class="flex flex-col space-y-2 text-slate-300">
          <NuxtLink 
            to="/admin/dashboard" 
            class="sidebar-link flex items-center py-2 px-4 rounded-lg hover:bg-slate-700"
            :class="{ 'active bg-slate-700 text-slate-100 border-l-3 border-amber-500': $route.path.startsWith('/admin/dashboard') }"
            @click="isSidebarOpen = !isMobile"
          >
            <i class="fas fa-chart-line w-6 text-center mr-3"></i> Dasbor
          </NuxtLink>

          <NuxtLink 
            to="/admin/users" 
            class="sidebar-link flex items-center py-2 px-4 rounded-lg hover:bg-slate-700"
            :class="{ 'active bg-slate-700 text-slate-100 border-l-3 border-amber-500': $route.path.startsWith('/admin/users') }"
            @click="isSidebarOpen = !isMobile"
          >
            <i class="fas fa-users w-6 text-center mr-3"></i> Pengguna
          </NuxtLink>

          <NuxtLink 
            to="/admin/marketplace" 
            class="sidebar-link flex items-center py-2 px-4 rounded-lg hover:bg-slate-700"
            :class="{ 'active bg-slate-700 text-slate-100 border-l-3 border-amber-500': $route.path.startsWith('/admin/marketplace') }"
            @click="isSidebarOpen = !isMobile"
          >
            <i class="fas fa-store w-6 text-center mr-3"></i> Marketplace AI
          </NuxtLink>

          <NuxtLink 
            to="/admin/financials" 
            class="sidebar-link flex items-center py-2 px-4 rounded-lg hover:bg-slate-700"
            :class="{ 'active bg-slate-700 text-slate-100 border-l-3 border-amber-500': $route.path.startsWith('/admin/financials') }"
            @click="isSidebarOpen = !isMobile"
          >
            <i class="fas fa-money-bill-wave w-6 text-center mr-3"></i> Keuangan
          </NuxtLink>

          <NuxtLink 
            to="/admin/plans" 
            class="sidebar-link flex items-center py-2 px-4 rounded-lg hover:bg-slate-700"
            :class="{ 'active bg-slate-700 text-slate-100 border-l-3 border-amber-500': $route.path.startsWith('/admin/plans') }"
            @click="isSidebarOpen = !isMobile"
          >
            <i class="fas fa-box-open w-6 text-center mr-3"></i> Paket Langganan
          </NuxtLink>
        </nav>
      </div>

      <div>
        <button @click="showConfirmModal = true" class="flex items-center py-2 px-4 rounded-lg text-slate-300 hover:bg-slate-700 w-full">
          <i class="fas fa-sign-out-alt w-6 text-center mr-3"></i> Logout
        </button>
      </div>
    </aside>

    <main 
      class="flex-1 p-8 transition-all duration-300" 
      :class="{ 'ml-0': !isSidebarOpen && !isMobile, 'lg:ml-64': isSidebarOpen && !isMobile }"
    >
        <button v-if="!isSidebarOpen" @click="isSidebarOpen = true" class="fixed top-4 left-4 p-3 z-40 lg:hidden cta-button rounded-full shadow-lg">
            <i class="fas fa-bars text-white"></i>
        </button>

        <slot />
    </main>
    
    <div v-if="showConfirmModal" class="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div class="absolute inset-0 bg-black opacity-70"></div>
        
        <div class="bg-slate-800 p-6 rounded-xl shadow-2xl z-50 max-w-sm w-full border border-slate-700">
            <h3 class="text-xl font-bold text-amber-400 mb-4 flex items-center">
                <i class="fas fa-triangle-exclamation mr-3"></i> Konfirmasi Logout
            </h3>
            <p class="text-slate-300 mb-6">
                Apakah Anda yakin ingin keluar dari Admin Panel? Anda harus login kembali untuk mengakses halaman ini.
            </p>
            
            <div class="flex justify-end space-x-3">
                <button 
                    @click="handleConfirm(false)" 
                    class="py-2 px-4 bg-slate-700 hover:bg-slate-600 rounded-lg text-slate-300 font-medium transition"
                >
                    Batal
                </button>
                <button 
                    @click="handleConfirm(true)" 
                    class="py-2 px-4 bg-red-600 hover:bg-red-700 rounded-lg text-white font-medium transition"
                >
                    <i class="fas fa-right-from-bracket mr-2"></i> Ya, Keluar
                </button>
            </div>
        </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted } from 'vue';
// Menggunakan useHead untuk setting Title
const { useHead, useSupabaseClient, useRouter } = await import('#imports');

const supabase = useSupabaseClient();
const router = useRouter();

// ------------------------------------
// PENAMBAHAN JUDUL DI LAYOUT
// ------------------------------------
useHead({
  titleTemplate: (titleChunk) => {
    // Menambahkan suffix " | Admin" ke setiap judul halaman admin
    return titleChunk ? `${titleChunk} | Admin` : 'Admin Dashboard | CortexDeploy';
  },
  htmlAttrs: {
    lang: 'id'
  }
});
// ------------------------------------

// State Sidebar
const isSidebarOpen = ref(true);
const isMobile = ref(false);

// State Modal Konfirmasi
const showConfirmModal = ref(false);

// Deteksi lebar layar (Logika Responsif)
const checkScreenSize = () => {
    isMobile.value = window.innerWidth < 1024;
    if (!isMobile.value) {
        isSidebarOpen.value = true;
    }
    if (isMobile.value && typeof window !== 'undefined' && !sessionStorage.getItem('sidebar_closed')) {
        isSidebarOpen.value = false;
        sessionStorage.setItem('sidebar_closed', 'true');
    }
};

onMounted(() => {
    checkScreenSize();
    window.addEventListener('resize', checkScreenSize);
});

onUnmounted(() => {
    window.removeEventListener('resize', checkScreenSize);
});

// Fungsi yang dipanggil saat tombol di modal diklik
const handleConfirm = async (confirmed) => {
    showConfirmModal.value = false; // Tutup modal terlepas dari pilihan

    if (confirmed) {
        try {
            const { error } = await supabase.auth.signOut();
            if (error) throw error;
            
            await router.push('/login');
        } catch (error) {
            console.error('Error saat logout:', error.message);
            alert('Gagal keluar: ' + error.message);
        }
    }
};
</script>

<style scoped>
/* Styling Tambahan untuk Layout */
.bg-slate-900 { background-color: #0f172a; }
.bg-slate-800 { background-color: #1e293b; } /* Digunakan untuk modal background */
.border-slate-800 { border-color: #1e293b; }
.hover\:bg-slate-700:hover { background-color: #334155; }
.border-l-3 { border-left-width: 3px; }
.border-amber-500 { border-color: #f59e0b; }

/* Tambahkan style untuk tombol cta di mobile untuk membuka sidebar */
.cta-button {
    background: linear-gradient(to right, #22d3ee, #818cf8);
    transition: all 0.3s ease;
}
</style>