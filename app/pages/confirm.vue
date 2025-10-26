<template>
  <div class="flex items-center justify-center min-h-screen">
    <div class="text-center">
      <h1 class="text-2xl font-bold text-white">Memproses Otentikasi...</h1>
      <p class="text-slate-400">Anda akan diarahkan ke dashboard sebentar lagi.</p>
    </div>
  </div>
</template>

<script setup lang="ts">
import { useSupabaseUser } from '#imports';

// Kita tambahkan logika opsional ini untuk memastikan redirect manual jika Supabase terlambat.
const user = useSupabaseUser();
const router = useRouter();

watch(user, () => {
  // Jika session user sudah ada, redirect ke dashboard
  if (user.value) {
    router.push('/dashboard');
  }
}, { immediate: true });
</script>

<style scoped>
/* Style sederhana untuk mengisi halaman saat loading */
.min-h-screen {
  min-height: 100vh;
}
/* Style tambahan jika diperlukan untuk mode gelap/latar belakang */
body {
  background-color: #0f172a; /* Contoh slate-900 */
}
</style>