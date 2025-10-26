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
      callback: '/confirm', // Halaman callback setelah login (penting untuk SSO)
      exclude: ['/register'], // Halaman yang tidak perlu autentikasi
    }
  }
})
