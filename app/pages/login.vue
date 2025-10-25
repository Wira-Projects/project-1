<template>
  <div class="py-20 md:py-32">
    <div class="container mx-auto px-6 max-w-md">
      <div class="card p-8 rounded-2xl">
        <h1 class="text-center text-3xl font-extrabold mb-6">
          Login ke <span class="gradient-text">CortexDeploy</span>
        </h1>

        <form @submit.prevent="handleLogin">
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

          <div class="mb-6">
            <label for="password" class="block text-sm font-medium text-slate-300 mb-2">Password</label>
            <input 
              type="password" 
              id="password" 
              v-model="password"
              class="form-input w-full" 
              placeholder="••••••••"
              required
            >
          </div>

          <button 
            type="submit" 
            class="cta-button text-white font-bold text-lg py-3 px-6 rounded-lg w-full"
          >
            Login
          </button>
        </form>

        <p class="text-center text-slate-400 mt-6">
          Belum punya akun?
          <NuxtLink to="/register" class="font-medium text-cyan-400 hover:text-cyan-300">
            Daftar di sini
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
  title: 'Login' // Ini akan menjadi "Login - CortexDeploy"
})

// Variabel untuk menampung data form
const email = ref('');
const password = ref('');

// Fungsi placeholder untuk menangani login
const handleLogin = () => {
  console.log('Mencoba login dengan:', email.value, password.value);
  // Di sini Anda akan menambahkan logika login Anda (misalnya, memanggil API)
  alert('Logika login belum diimplementasikan.');
};
</script>