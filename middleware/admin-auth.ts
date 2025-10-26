// middleware/admin-auth.ts

// Nuxt Route Middleware untuk memeriksa status admin
export default defineNuxtRouteMiddleware(async (to, from) => {
  // Gunakan useSupabaseUser() untuk mendapatkan data pengguna Supabase
  const user = useSupabaseUser();
  // Gunakan useRuntimeConfig() untuk mengakses variabel env saat runtime
  const config = useRuntimeConfig();
  
  // Ambil email admin dari variabel ENV (yang sudah dimuat di nuxt.config.ts)
  // Ganti 'ADMIN_EMAIL' dengan nama variabel yang benar di .env Anda jika berbeda
  const adminEmail = config.public.adminEmail; 

  // 1. Pastikan pengguna sudah login
  if (!user.value) {
    // Jika belum login, alihkan ke halaman login
    return navigateTo('/login'); 
  }

  // 2. Periksa apakah email pengguna cocok dengan email admin
  if (user.value.email !== adminEmail) {
    // Jika tidak cocok, pengguna bukan admin. Alihkan ke halaman non-admin atau tampilkan error.
    console.warn(`Akses ditolak: Pengguna ${user.value.email} bukan admin. Dialihkan ke dasbor.`);
    // Mengalihkan ke halaman dasbor umum, atau rute lain yang sesuai.
    return navigateTo('/dashboard'); 
  }

  // Jika user.value ada DAN email cocok dengan adminEmail, akses diizinkan.
  console.log(`Akses admin diizinkan untuk: ${user.value.email}`);
});