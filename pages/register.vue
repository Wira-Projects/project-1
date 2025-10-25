<template>
  <div class="py-20 md:py-32">
    <div class="container mx-auto px-6 max-w-md">
      <div class="card p-8 rounded-2xl">
        <h1 class="text-center text-3xl font-extrabold mb-6">
          Buat Akun <span class="gradient-text">Baru</span>
        </h1>

        <form @submit.prevent="handleRegister">
          <div class="mb-4">
            <label for="name" class="block text-sm font-medium text-slate-300 mb-2">Nama Lengkap</label>
            <input 
              type="text" 
              id="name" 
              v-model="name"
              class="form-input w-full" 
              placeholder="Nama Anda"
              required
            >
          </div>
          
          <div class="mb-4">
            <label for="email" class="block text-sm font-medium text-slate-300 mb-2">Email</label>
            <input 
              type="email" 
              id="email" 
              v-model="email"
              class="form-input w-full" 
              placeholder="anda@email.com"
              required
            >
          </div>

          <div class="mb-4">
            <label for="password" class="block text-sm font-medium text-slate-300 mb-2">Password</label>
            <input 
              type="password" 
              id="password" 
              v-model="password"
              class="form-input w-full" 
              placeholder="Minimal 8 karakter"
              required
            >
          </div>
          
          <div class="mb-6">
            <label for="confirmPassword" class="block text-sm font-medium text-slate-300 mb-2">Konfirmasi Password</label>
            <input 
              type="password" 
              id="confirmPassword" 
              v-model="confirmPassword"
              class="form-input w-full" 
              placeholder="Ulangi password"
              required
            >
          </div>

          <button 
            type="submit" 
            class="cta-button text-white font-bold text-lg py-3 px-6 rounded-lg w-full"
          >
            Buat Akun
          </button>
        </form>

        <p class="text-center text-slate-400 mt-6">
          Sudah punya akun?
          <NuxtLink to="/login" class="font-medium text-cyan-400 hover:text-cyan-300">
            Login di sini
          </NuxtLink>
        </p>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';

// Setel judul halaman
useHead({
  title: 'Daftar' // Ini akan menjadi "Daftar - CortexDeploy"
})

// Variabel untuk menampung data form
const name = ref('');
const email = ref('');
const password = ref('');
const confirmPassword = ref('');

// Fungsi placeholder untuk menangani registrasi
const handleRegister = () => {
  if (password.value !== confirmPassword.value) {
    alert('Password dan Konfirmasi Password tidak cocok!');
    return;
  }
  console.log('Mencoba mendaftar dengan:', name.value, email.value);
  // Di sini Anda akan menambahkan logika registrasi Anda
  alert('Logika registrasi belum diimplementasikan.');
};
</script>