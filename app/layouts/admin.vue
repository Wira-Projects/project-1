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
        <button @click="signOut" class="flex items-center py-2 px-4 rounded-lg text-slate-300 hover:bg-slate-700 w-full">
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
  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted, computed } from 'vue';
const supabase = useSupabaseClient();
const router = useRouter();

// State untuk Sidebar
const isSidebarOpen = ref(true); // Default terbuka di desktop
const isMobile = ref(false); // State untuk mendeteksi mode mobile (lebar < 1024px)

// Deteksi lebar layar
const checkScreenSize = () => {
    // 1024px adalah breakpoint 'lg' Tailwind
    isMobile.value = window.innerWidth < 1024;
    // Di desktop, kita ingin sidebar selalu terbuka
    if (!isMobile.value) {
        isSidebarOpen.value = true;
    }
    // Jika di mobile, sidebar akan tertutup secara default saat pertama kali load
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

// Fungsi untuk logout DENGAN KONFIRMASI
const signOut = async () => {
    // Tampilkan dialog konfirmasi
    if (!confirm('Apakah Anda yakin ingin keluar dari Admin Panel?')) {
        // Jika pengguna menekan Cancel, hentikan proses
        return;
    }

    try {
        const { error } = await supabase.auth.signOut();
        if (error) throw error;
        
        // Redirect ke halaman login setelah berhasil logout
        await router.push('/login');
    } catch (error) {
        console.error('Error saat logout:', error.message);
        alert('Gagal keluar: ' + error.message);
    }
};
</script>

<style scoped>
/* Styling Tambahan untuk Layout */
.bg-slate-900 { background-color: #0f172a; }
.bg-slate-800 { border-color: #1e293b; }
.hover\:bg-slate-700:hover { background-color: #334155; }
.border-l-3 { border-left-width: 3px; }
.border-amber-500 { border-color: #f59e0b; }

/* Tambahkan style untuk tombol cta di mobile untuk membuka sidebar */
.cta-button {
    background: linear-gradient(to right, #22d3ee, #818cf8);
    transition: all 0.3s ease;
}
</style>