<template>
  <div class="flex items-center justify-center min-h-screen bg-slate-900">
    <div class="text-center">
      <h1 class="text-2xl font-bold text-white">Memproses Otentikasi...</h1>
      <p class="text-slate-400">Anda akan diarahkan sebentar lagi.</p>
      <i class="fas fa-spinner fa-spin text-amber-400 text-3xl mt-4"></i>
    </div>
  </div>
</template>

<script setup lang="ts">
// Gunakan composables Nuxt/Supabase
const user = useSupabaseUser();
const router = useRouter();
// Akses Runtime Config untuk mengambil ADMIN_EMAIL
const config = useRuntimeConfig();

// Ambil nilai adminEmail, pastikan namanya sesuai dengan di nuxt.config.ts
const adminEmail = config.public.adminEmail;

// Gunakan watchEffect agar eksekusi terjadi segera dan bereaksi terhadap perubahan user
watchEffect(() => {
  // Hanya jalankan logika redirect jika user.value sudah terisi
  if (user.value) {
    let redirectPath = '/dashboard'; // Default untuk pengguna biasa

    // Periksa apakah email pengguna yang masuk adalah Admin
    if (user.value.email === adminEmail) {
      // Jika Admin, redirect ke Admin Dashboard
      redirectPath = '/admin/dashboard';
    }

    // Lakukan redirect
    router.push(redirectPath);
  } else if (user.value === null) {
    // Opsional: Jika user tiba-tiba menjadi null (misalnya, sesi kedaluwarsa saat berada di halaman ini), 
    // alihkan ke login.
    // router.push('/login');
  }
});

// Anda mungkin perlu menonaktifkan layout default jika halaman ini digunakan sebagai loading screen
// definePageMeta({
//   layout: false 
// });
</script>

<style scoped>
/* Style tambahan */
.bg-slate-900 {
  background-color: #0f172a;
}
.min-h-screen {
  min-height: 100vh;
}
</style>