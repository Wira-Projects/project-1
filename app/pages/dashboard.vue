<template>
  <div class="py-20 md:py-32">
    <div class="container mx-auto px-6 max-w-xl text-center">
      <div class="card p-8 rounded-2xl">
        <div v-if="user">
          <h1 class="text-4xl font-extrabold mb-4">
            Selamat Datang, <span class="gradient-text">{{ displayName }}</span>! 🎉
          </h1>
          <p class="text-xl text-slate-300 mb-8">Anda berhasil login ke CortexDeploy.</p>

          <div class="bg-slate-800 p-6 rounded-lg text-left mb-8">
            <h2 class="text-xl font-semibold text-cyan-400 mb-3">Detail Akun Anda:</h2>
            <p class="text-slate-400 mb-2">
              <span class="font-medium text-slate-300">Nama:</span> {{ displayName }}
            </p>
            <p class="text-slate-400">
              <span class="font-medium text-slate-300">Email:</span> {{ user.email }}
            </p>
          </div>

          <button
            @click="handleLogout"
            :disabled="loading"
            class="logout-button font-bold text-lg py-3 px-6 rounded-lg w-full"
          >
            {{ loading ? "Memproses..." : "Logout" }}
          </button>
        </div>

        <div v-else>
          <h1 class="text-4xl font-extrabold mb-4">Akses Ditolak</h1>
          <p class="text-xl text-slate-400 mb-8">Silakan login untuk mengakses dashboard.</p>
          <NuxtLink to="/login" class="cta-button font-bold text-lg py-3 px-6 rounded-lg">
            Pergi ke Halaman Login
          </NuxtLink>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from "vue";

useHead({
  title: "Dashboard",
});

const supabase = useSupabaseClient();
const user = useSupabaseUser(); // Composable untuk mengambil user yang sedang aktif
const router = useRouter();

const loading = ref(false);

// Menghitung nama yang akan ditampilkan: 
// Ambil dari metadata (saat register) atau kembali ke email jika nama tidak ada
const displayName = computed(() => {
  const metaName = user.value?.user_metadata?.full_name;
  return metaName || user.value?.email || 'Pengguna';
});

// Fungsi untuk menangani Logout
const handleLogout = async () => {
  loading.value = true;
  try {
    const { error } = await supabase.auth.signOut();
    if (error) throw error;

    // Supabase module akan secara otomatis menghapus session dan user
    // Redirect ke halaman login setelah logout
    router.push("/login");
  } catch (error) {
    console.error("Gagal logout:", error);
    alert("Gagal logout. Coba lagi.");
  } finally {
    loading.value = false;
  }
};
</script>

<style scoped>
/* Tambahkan style untuk tombol logout */
.logout-button {
  background-color: #ef4444; /* red-500 */
  color: white;
  transition: background-color 0.2s;
}
.logout-button:hover {
  background-color: #dc2626; /* red-600 */
}
/* Style card (disalin dari file lain) */
.card {
  background-color: #1e293b; /* slate-800 */
  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
  border: 1px solid #334155; /* slate-700 */
}
</style>