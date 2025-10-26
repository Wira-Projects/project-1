<template>
  <div class="antialiased flex min-h-screen" :class="{ 'bg-slate-900 text-slate-200': true }">
    <aside class="w-64 bg-slate-900 flex flex-col justify-between p-4 border-r border-slate-800 fixed top-0 left-0 h-full z-10">
      <div>
        <div class="text-2xl font-bold mb-10 text-slate-100">
          <NuxtLink to="/admin/dashboard">
            <i class="fas fa-shield-halved text-amber-400"></i> Admin<span class="font-light text-slate-400">Panel</span>
          </NuxtLink>
        </div>

        <nav class="flex flex-col space-y-2 text-slate-300">
          <NuxtLink to="/admin/dashboard" class="sidebar-link flex items-center py-2 px-4 rounded-lg hover:bg-slate-700"
            :class="{ 'active bg-slate-700 text-slate-100 border-l-3 border-amber-500': $route.path.startsWith('/admin/dashboard') }">
            <i class="fas fa-chart-line w-6 text-center mr-3"></i> Dasbor
          </NuxtLink>

          <NuxtLink to="/admin/users" class="sidebar-link flex items-center py-2 px-4 rounded-lg hover:bg-slate-700"
            :class="{ 'active bg-slate-700 text-slate-100 border-l-3 border-amber-500': $route.path.startsWith('/admin/users') }">
            <i class="fas fa-users w-6 text-center mr-3"></i> Pengguna
          </NuxtLink>

          <NuxtLink to="/admin/marketplace" class="sidebar-link flex items-center py-2 px-4 rounded-lg hover:bg-slate-700"
            :class="{ 'active bg-slate-700 text-slate-100 border-l-3 border-amber-500': $route.path.startsWith('/admin/marketplace') }">
            <i class="fas fa-store w-6 text-center mr-3"></i> Marketplace AI
          </NuxtLink>

          <NuxtLink to="/admin/financials" class="sidebar-link flex items-center py-2 px-4 rounded-lg hover:bg-slate-700"
            :class="{ 'active bg-slate-700 text-slate-100 border-l-3 border-amber-500': $route.path.startsWith('/admin/financials') }">
            <i class="fas fa-money-bill-wave w-6 text-center mr-3"></i> Keuangan
          </NuxtLink>

          <NuxtLink to="/admin/plans" class="sidebar-link flex items-center py-2 px-4 rounded-lg hover:bg-slate-700"
            :class="{ 'active bg-slate-700 text-slate-100 border-l-3 border-amber-500': $route.path.startsWith('/admin/plans') }">
            <i class="fas fa-box-open w-6 text-center mr-3"></i> Paket Langganan
          </NuxtLink>
        </nav>
      </div>

      <div>
        <a href="#" @click.prevent="signOut" class="flex items-center py-2 px-4 rounded-lg text-slate-300 hover:bg-slate-700">
          <i class="fas fa-sign-out-alt w-6 text-center mr-3"></i> Logout
        </a>
      </div>
    </aside>

    <main class="flex-1 p-8 ml-64">
      <slot />
    </main>
  </div>
</template>

<script setup>
// Untuk menggunakan fungsi Supabase seperti signOut()
const supabase = useSupabaseClient();
const router = useRouter();

// Fungsi untuk logout
const signOut = async () => {
  try {
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
    
    // Alihkan pengguna ke halaman login setelah berhasil logout
    await router.push('/login');
  } catch (error) {
    console.error('Error saat logout:', error.message);
    // Tampilkan pesan error jika perlu
    alert('Gagal keluar: ' + error.message);
  }
};
</script>

<style scoped>
/* Styling Tambahan untuk Layout */
.bg-slate-900 { background-color: #0f172a; }
.bg-slate-800 { background-color: #1e293b; }
.border-slate-800 { border-color: #1e293b; }
.hover\:bg-slate-700:hover { background-color: #334155; }
.border-l-3 { border-left-width: 3px; }
.border-amber-500 { border-color: #f59e0b; }
</style>