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
      exclude: ['/', '/register', '/confirm', '/forgot-password', '/update-password'], // Halaman yang TIDAK memerlukan autentikasi
    }
  },

  runtimeConfig: {
    // Kunci Service Role HANYA akan tersedia di sisi server
    supabaseServiceKey: process.env.SUPABASE_SERVICE_KEY, // <-- Pastikan baris ini ada
    openrouterProvisioningKey: process.env.OPENROUTER_PROVISIONING_KEY,
    
    public: {
      adminEmail: process.env.ADMIN_EMAIL || 'admin@example.com' // Default fallback jika tidak ada
    }
  },
})
