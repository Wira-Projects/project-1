<template>
  <div class="flex min-h-screen flex-col bg-slate-950 text-slate-200">
    
    <header class="bg-slate-900 bg-opacity-50 backdrop-blur-md sticky top-0 z-50 border-b border-slate-800">
      <nav class="container mx-auto px-6 py-4 flex justify-between items-center">
        <div class="text-2xl font-bold">
          <NuxtLink to="/"><i class="fas fa-brain text-cyan-400"></i> Cortex<span class="font-light text-violet-400">Deploy</span></NuxtLink>
        </div>
        <div class="hidden md:flex space-x-8 items-center text-slate-300">
          <a href="/#features" class="hover:text-cyan-400 transition">Fitur</a>
          <a href="/#tech" class="hover:text-cyan-400 transition">Teknologi</a>
          <a href="/#marketplace" class="hover:text-cyan-400 transition">Marketplace AI</a>
          <a href="/#pricing" class="hover:text-cyan-400 transition">Harga</a>
        </div>
        <div class="flex items-center space-x-4">
          <NuxtLink to="/login" class="hidden md:block text-slate-300 hover:text-cyan-400 transition">Login</NuxtLink>
          <NuxtLink to="/register" class="bg-cyan-500 text-white font-bold py-2 px-4 rounded-lg hover:bg-cyan-600 transition">Daftar Sekarang</NuxtLink>
        </div>
      </nav>
    </header>

    <main class="flex-grow">
      <slot />
    </main>

    <footer class="bg-slate-900 border-t border-slate-800">
      <div class="container mx-auto px-6 py-8 text-center text-slate-400">
        <p>&copy; 2025 CortexDeploy. Dibuat dengan <i class="fas fa-heart text-red-500"></i> untuk para Arsitek Digital.</p>
      </div>
    </footer>
  </div>
</template>

<script setup lang="ts">
// Bagian script ini sudah SEMPURNA. Tidak perlu diubah.
useHead({
  // title akan di-override oleh halaman individual jika diset
  titleTemplate: (titleChunk) => {
    return titleChunk ? `${titleChunk} - CortexDeploy` : 'CortexDeploy - Platform Cloud All-in-One';
  },
  meta: [
    { charset: 'UTF-8' },
    { name: 'viewport', content: 'width=device-width, initial-scale=1.0' }
  ],
  link: [
    {
      rel: 'stylesheet',
      href: 'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css'
    }
  ],
  bodyAttrs: {
    class: 'antialiased'
  },
  htmlAttrs: {
    lang: 'id'
  }
})
</script>

<style>
/* Style global sebaiknya ditaruh di file terpisah (mis: assets/css/main.css) 
   dan diimpor di nuxt.config.ts, tapi membiarkannya kosong di sini juga tidak masalah.
*/
</style>