// https://nuxt.com/docs/api/configuration/nuxt-config
import tailwindcss from "@tailwindcss/vite";

export default defineNuxtConfig({
  compatibilityDate: '2025-07-15',
  css: ['~/assets/css/main.css'],
  devtools: { enabled: true },
  vite: {
    plugins: [
      tailwindcss(),
    ],
  },

  // Daftar modul sudah benar
  modules: [
    '@nuxtjs/supabase',
  ],
  
  // ✅ Properti 'supabase' yang menyebabkan error
  supabase: {
    redirectOptions: {
      login: '/login', // Halaman login
      callback: '/confirm', // Halaman callback (tidak perlu dikecualikan, tapi kita tambahkan untuk keamanan)

      home: '/dashboard',
      
      // ✅ PERBAIKAN: Tambahkan '/' ke daftar exclude
      exclude: ['/', '/register', '/confirm'], // Halaman yang TIDAK memerlukan autentikasi
    }
  }
})
