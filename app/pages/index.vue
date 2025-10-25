<template>
  <div>
    <section class="py-20 md:py-32">
      <div class="container mx-auto text-center px-6">
        <h1 class="text-4xl md:text-6xl font-extrabold leading-tight mb-4 text-slate-100">
          Platform Cloud <span class="gradient-text">Fleksibel & Cerdas</span><br>untuk Para Inovator
        </h1>
        <p class="text-lg md:text-xl text-slate-400 max-w-3xl mx-auto mb-8">
          Deploy aplikasi dari Git, sewa infrastruktur IaaS, dan akses model AI terdepan melalui satu API. Dibangun dengan model prabayar yang adil dan transparan.
        </p>
        <NuxtLink to="/register" class="cta-button text-white font-bold text-lg py-4 px-8 rounded-lg inline-block">
          Mulai Deploy dalam 5 Menit
        </NuxtLink>
      </div>
    </section>

    <section id="features" class="py-20 bg-slate-900 bg-opacity-50">
      <div class="container mx-auto px-6">
        <div class="text-center mb-12">
          <h2 class="text-3xl md:text-4xl font-bold text-slate-100">Dirancang untuk Alur Kerja Modern</h2>
          <p class="text-slate-400 mt-2">Fokus pada kode, kami yang urus sisanya.</p>
        </div>
        <div class="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
          <div class="card p-6 rounded-xl"><i class="fa-solid fa-code-commit text-2xl text-cyan-400 mb-4"></i><h3 class="text-xl font-bold mb-2">Deploy dari Git</h3><p class="text-slate-400">Cukup `git push` dan aplikasi Anda live. Build & deploy otomatis.</p></div>
          <div class="card p-6 rounded-xl"><i class="fa-solid fa-server text-2xl text-cyan-400 mb-4"></i><h3 class="text-xl font-bold mb-2">Infrastruktur IaaS</h3><p class="text-slate-400">Sewa VPS & Database dengan kontrol penuh dan skalabilitas instan.</p></div>
          <div class="card p-6 rounded-xl"><i class="fa-solid fa-microchip text-2xl text-cyan-400 mb-4"></i><h3 class="text-xl font-bold mb-2">Gateway AI Terpadu</h3><p class="text-slate-400">Akses puluhan model AI dari provider terkemuka dengan satu API key.</p></div>
          <div class="card p-6 rounded-xl"><i class="fa-solid fa-bolt text-2xl text-cyan-400 mb-4"></i><h3 class="text-xl font-bold mb-2">Auto-Scaling</h3><p class="text-slate-400">Otomatis tangani lonjakan traffic tanpa intervensi manual.</p></div>
          <div class="card p-6 rounded-xl"><i class="fa-solid fa-globe text-2xl text-cyan-400 mb-4"></i><h3 class="text-xl font-bold mb-2">Domain Kustom & SSL</h3><p class="text-slate-400">Gunakan domain Anda sendiri dengan sertifikat SSL gratis yang terkelola.</p></div>
          <div class="card p-6 rounded-xl"><i class="fa-solid fa-wallet text-2xl text-cyan-400 mb-4"></i><h3 class="text-xl font-bold mb-2">Dompet Prabayar</h3><p class="text-slate-400">Kontrol penuh atas biaya. Top-up dan gunakan sesuai kebutuhan.</p></div>
        </div>
      </div>
    </section>

    <section id="tech" class="py-20">
      <div class="container mx-auto px-6 text-center">
           <h2 class="text-3xl md:text-4xl font-bold text-slate-100">Mendukung Teknologi Favorit Anda</h2>
           <p class="text-slate-400 mt-2 mb-10">Build dan optimasi otomatis untuk framework terpopuler.</p>
           <div class="flex flex-wrap justify-center items-center gap-x-12 gap-y-8">
             <i class="fa-brands fa-node-js text-6xl text-gray-500 hover:text-white transition" title="Node.js"></i>
             <i class="fa-brands fa-python text-6xl text-gray-500 hover:text-white transition" title="Python"></i>
             <i class="fa-brands fa-php text-6xl text-gray-500 hover:text-white transition" title="PHP"></i>
             <i class="fa-brands fa-laravel text-6xl text-gray-500 hover:text-white transition" title="Laravel"></i>
             <i class="fa-brands fa-react text-6xl text-gray-500 hover:text-white transition" title="Next.js / React"></i>
             <i class="fa-brands fa-vuejs text-6xl text-gray-500 hover:text-white transition" title="Vue.js"></i>
             <i class="fa-brands fa-docker text-6xl text-gray-500 hover:text-white transition" title="Docker"></i>
           </div>
      </div>
    </section>

    <section id="marketplace" class="py-20 bg-slate-900 bg-opacity-50">
      <div class="container mx-auto px-6">
        <div class="text-center mb-12">
          <h2 class="text-3xl md:text-4xl font-bold text-slate-100">Etalase <span class="gradient-text">Model AI</span> Terdepan</h2>
          <p class="text-slate-400 mt-2 max-w-2xl mx-auto">Akses model-model canggih melalui Gerbang API CortexDeploy. Cukup panggil, kami yang urus routing dan penagihannya.</p>
        </div>
        <div class="grid grid-cols-2 md:grid-cols-4 gap-6">
          <div class="card p-4 rounded-xl text-center"><h4 class="font-bold">Mixtral 8x7B</h4><p class="text-sm text-slate-400">Text Generation</p></div>
          <div class="card p-4 rounded-xl text-center"><h4 class="font-bold">Llama 3 70B</h4><p class="text-sm text-slate-400">Text Generation</p></div>
          <div class="card p-4 rounded-xl text-center"><h4 class="font-bold">Stable Diffusion 3</h4><p class="text-sm text-slate-400">Image Generation</p></div>
          <div class="card p-4 rounded-xl text-center"><h4 class="font-bold">Gemini Pro</h4><p class="text-sm text-slate-400">Multimodal</p></div>
        </div>
         <p class="text-center mt-8 text-slate-400">Dan puluhan model lainnya dari provider seperti OpenRouter, Groq, dan Together AI.</p>
      </div>
    </section>

    <section id="pricing" class="py-20">
      <div class="container mx-auto px-6 text-center">
        <h2 class="text-3xl md:text-4xl font-bold text-slate-100">Harga yang Tumbuh Bersama Anda</h2>
        <p class="text-slate-400 mt-2 max-w-2xl mx-auto">Pilih paket langganan dasar, lalu bayar sisanya sesuai pemakaian. Transparan dan dapat diprediksi.</p>
        
        <div class="grid lg:grid-cols-3 gap-8 max-w-5xl mx-auto mt-12 text-left">
          <div class="card p-8 rounded-2xl">
            <h3 class="text-2xl font-bold text-cyan-400">Hobby</h3>
            <p class="text-slate-400 mt-2">Untuk proyek pribadi dan eksperimen.</p>
            <p class="mt-6"><span class="text-4xl font-extrabold">Rp 0</span><span class="text-slate-400">/bulan</span></p>
            <ul class="mt-6 space-y-3 text-slate-300">
              <li><i class="fas fa-check-circle text-cyan-400 mr-2"></i><b>1</b> Aplikasi Terkelola</li>
              <li><i class="fas fa-check-circle text-cyan-400 mr-2"></i><b>100</b> Menit Build/bulan</li>
              <li><i class="fas fa-check-circle text-cyan-400 mr-2"></i><b>500,000</b> Token API Gateway</li>
              <li><i class="fas fa-check-circle text-cyan-400 mr-2"></i>Akses Marketplace AI</li>
            </ul>
            <NuxtLink to="/register" class="block w-full text-center mt-8 bg-slate-700 text-white font-bold py-3 px-4 rounded-lg hover:bg-slate-600 transition">Mulai Gratis</NuxtLink>
          </div>
          <div class="card p-8 rounded-2xl relative pricing-card-popular">
              <p class="absolute top-0 -translate-y-1/2 left-1/2 -translate-x-1/2 bg-violet-500 text-white text-xs font-bold px-3 py-1 rounded-full">PALING POPULER</p>
            <h3 class="text-2xl font-bold text-violet-400">Pro</h3>
            <p class="text-slate-400 mt-2">Untuk startup, freelancer, dan tim kecil.</p>
            <p class="mt-6"><span class="text-4xl font-extrabold">Rp 150rb</span><span class="text-slate-400">/bulan</span></p>
            <ul class="mt-6 space-y-3 text-slate-300">
              <li><i class="fas fa-check-circle text-violet-400 mr-2"></i><b>5</b> Aplikasi Terkelola</li>
              <li><i class="fas fa-check-circle text-violet-400 mr-2"></i><b>1,000</b> Menit Build/bulan</li>
              <li><i class="fas fa-check-circle text-violet-400 mr-2"></i><b>600</b> Detik Training AI</li>
              <li><i class="fas fa-check-circle text-violet-400 mr-2"></i><b>10 Juta</b> Token API Gateway</li>
              <li><i class="fas fa-check-circle text-violet-400 mr-2"></i>Dukungan Prioritas</li>
            </ul>
            <NuxtLink to="/register" class="block w-full text-center mt-8 cta-button text-white font-bold py-3 px-4 rounded-lg">Pilih Pro</NuxtLink>
          </div>
          <div class="card p-8 rounded-2xl">
            <h3 class="text-2xl font-bold text-slate-100">Enterprise</h3>
            <p class="text-slate-400 mt-2">Untuk skala besar dan kebutuhan khusus.</p>
            <p class="mt-6"><span class="text-4xl font-extrabold">Kustom</span></p>
            <ul class="mt-6 space-y-3 text-slate-300">
              <li><i class="fas fa-check-circle text-slate-300 mr-2"></i>Aplikasi & Jatah Kustom</li>
              <li><i class="fas fa-check-circle text-slate-300 mr-2"></i>Infrastruktur Terisolasi</li>
              <li><i class="fas fa-check-circle text-slate-300 mr-2"></i>SLA & Dukungan Khusus</li>
              <li><i class="fas fa-check-circle text-slate-300 mr-2"></i>Single Sign-On (SSO)</li>
            </ul>
            <a href="#" class="block w-full text-center mt-8 bg-slate-700 text-white font-bold py-3 px-4 rounded-lg hover:bg-slate-600 transition">Hubungi Kami</a>
          </div>
        </div>

        <div class="mt-16 pt-8 border-t border-slate-800 max-w-3xl mx-auto">
          <h3 class="text-2xl font-bold">Harga Pemakaian Tambahan (Pay-as-you-go)</h3>
          <p class="text-slate-400 mt-2">Jika Anda melebihi jatah paket, kami hanya menagih apa yang Anda pakai.</p>
          <div class="grid grid-cols-2 md:grid-cols-4 gap-6 mt-6 text-left">
            <div><p class="font-bold">Build</p><p class="text-slate-400">Rp 150 / menit</p></div>
            <div><p class="font-bold">Training AI</p><p class="text-slate-400">Rp 500 / detik-GPU</p></div>
            <div><p class="font-bold">Token Input</p><p class="text-slate-400">Mulai dari Rp 5 / 1k token</p></div>
            <div><p class="font-bold">Token Output</p><p class="text-slate-400">Mulai dari Rp 15 / 1k token</p></div>
          </div>
        </div>
      </div>
    </section>

    <section class="py-20">
      <div class="container mx-auto px-6 text-center">
        <h2 class="text-3xl md:text-4xl font-bold mb-4 text-slate-100">Siap Meluncurkan Ide Brilian Anda?</h2>
        <p class="text-lg md:text-xl text-slate-400 max-w-3xl mx-auto mb-8">
          Buat akun, isi dompet prabayar Anda, dan mulailah membangun masa depan.
        </p>
        <NuxtLink to="/register" class="cta-button text-white font-bold text-lg py-4 px-8 rounded-lg inline-block">
          Daftar dan Mulai Gratis
        </NuxtLink>
      </div>
    </section>
  </div>
</template>

<script setup lang="ts">
// Setel judul khusus untuk halaman ini
useHead({
  title: 'Platform Cloud All-in-One' // Ini akan menjadi "Platform Cloud All-in-One - CortexDeploy"
})
</script>

<style>
.gradient-text {
  background: linear-gradient(to right, #22d3ee, #a78bfa);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
}
.cta-button {
  background: linear-gradient(to right, #22d3ee, #818cf8);
  transition: all 0.3s ease;
}
.cta-button:hover {
  transform: translateY(-2px);
  box-shadow: 0 10px 15px -3px rgba(34, 211, 238, 0.2), 0 4px 6px -2px rgba(167, 139, 250, 0.1);
}
.card {
  background-color: rgba(17, 24, 39, 0.5);
  border: 1px solid rgba(55, 65, 81, 0.5);
  backdrop-filter: blur(10px);
}
.pricing-card-popular {
  border-color: #a78bfa;
  transform: scale(1.05);
}
</style>