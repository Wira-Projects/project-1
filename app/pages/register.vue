<template>
  <div class="py-20 md:py-32">
    <div class="container mx-auto px-6 max-w-md">
      <div class="card p-8 rounded-2xl">
        <h1 class="text-center text-3xl font-extrabold mb-6">
          Buat Akun <span class="gradient-text">Baru</span>
        </h1>

        <button
          @click="handleGoogleRegister"
          :disabled="loading"
          class="google-button w-full mb-4"
        >
          <svg
            class="w-5 h-5 mr-3"
            xmlns="[http://www.w3.org/2000/svg](http://www.w3.org/2000/svg)"
            viewBox="0 0 48 48"
          >
            <path fill="#FFC107" d="M43.611,20.083H42V20H24v8h11.303c-1.649,4.657-6.08,8-11.303,8c-6.627,0-12-5.373-12-12c0-6.627,5.373-12,12-12c3.059,0,5.842,1.154,7.961,3.039l5.657-5.657C34.046,6.053,29.268,4,24,4C12.955,4,4,12.955,4,24c0,11.045,8.955,20,20,20c11.045,0,20-8.955,20-20C44,22.659,43.862,21.35,43.611,20.083z"/>
            <path fill="#FF3D00" d="M6.306,14.691l6.571,4.819C14.655,15.108,18.961,12,24,12c3.059,0,5.842,1.154,7.961,3.039l5.657-5.657C34.046,6.053,29.268,4,24,4C16.318,4,9.656,8.337,6.306,14.691z"/>
            <path fill="#4CAF50" d="M24,44c5.166,0,9.86-1.977,13.409-5.192l-6.19-5.238C29.211,35.091,26.715,36,24,36c-5.223,0-9.65-3.657-11.303-8H6.306C9.656,35.663,16.318,40,24,40z"/>
            <path fill="#1976D2" d="M43.611,20.083H42V20H24v8h11.303c-0.792,2.237-2.231,4.166-4.087,5.571l6.19,5.238C39.987,35.152,44,29.839,44,24C44,22.659,43.862,21.35,43.611,20.083z"/>
          </svg>
          Daftar dengan Google
        </button>

        <div class="separator">
          <span class="separator-text">atau</span>
        </div>

        <form @submit.prevent="handleRegister" class="mt-4">
          <div v-if="successMsg" class="success-banner">
            {{ successMsg }}
          </div>
          <div v-if="errorMsg" class="error-banner">
            {{ errorMsg }}
          </div>
          
          <div class="mb-4">
            <label
              for="name"
              class="block text-sm font-medium text-slate-300 mb-2"
              >Nama Lengkap</label
            >
            <input
              type="text"
              id="name"
              v-model="name"
              class="form-input w-full"
              placeholder="Nama Anda"
              required
            />
          </div>

          <div class="mb-4">
            <label
              for="email"
              class="block text-sm font-medium text-slate-300 mb-2"
              >Email</label
            >
            <input
              type="email"
              id="email"
              v-model="email"
              class="form-input w-full"
              placeholder="anda@email.com"
              required
            />
          </div>

          <div class="mb-4">
            <label
              for="password"
              class="block text-sm font-medium text-slate-300 mb-2"
              >Password</label
            >
            <input
              type="password"
              id="password"
              v-model="password"
              class="form-input w-full"
              placeholder="Minimal 8 karakter"
              required
            />
          </div>

          <div class="mb-6">
            <label
              for="confirmPassword"
              class="block text-sm font-medium text-slate-300 mb-2"
              >Konfirmasi Password</label
            >
            <input
              type="password"
              id="confirmPassword"
              v-model="confirmPassword"
              class="form-input w-full"
              placeholder="Ulangi password"
              required
            />
          </div>

          <button
            type="submit"
            :disabled="loading"
            class="cta-button text-white font-bold text-lg py-3 px-6 rounded-lg w-full"
          >
            {{ loading ? "Membuat akun..." : "Buat Akun" }}
          </button>
        </form>

        <p class="text-center text-slate-400 mt-6">
          Sudah punya akun?
          <NuxtLink
            to="/login"
            class="font-medium text-cyan-400 hover:text-cyan-300"
          >
            Login di sini
          </NuxtLink>
        </p>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from "vue";

useHead({
  title: "Daftar",
});

const supabase = useSupabaseClient();
const router = useRouter(); // Pastikan ini ada

const name = ref("");
const email = ref("");
const password = ref("");
const confirmPassword = ref("");
const loading = ref(false);
const errorMsg = ref<string | null>(null);
const successMsg = ref<string | null>(null);

// Fungsi Register Email/Password
const handleRegister = async () => {
  if (password.value !== confirmPassword.value) {
    errorMsg.value = "Password dan Konfirmasi Password tidak cocok!";
    return;
  }

  loading.value = true;
  errorMsg.value = null;
  successMsg.value = null;

  try {
    const { error } = await supabase.auth.signUp({
      email: email.value,
      password: password.value,
      options: {
        data: { full_name: name.value },
        // REDIRECT KE HALAMAN INSTRUKSI verifikasi email
        redirectTo: `${window.location.origin}/check-email`, 
      },
    });

    if (error) throw error;
    
    // Tampilkan pesan sukses secara fallback (jika redirect gagal)
    successMsg.value = "Pendaftaran berhasil! Silakan cek email Anda untuk verifikasi.";

  } catch (error: any) {
    errorMsg.value = error.message;
  } finally {
    loading.value = false;
  }
};

// Fungsi Register Google SSO
const handleGoogleRegister = async () => {
  loading.value = true;
  errorMsg.value = null;
  const origin = window.location.origin;

  try {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        // Menggunakan /confirm sebagai callback Supabase, Nuxt akan menangani redirect final ke /dashboard
        redirectTo: `${origin}/confirm`, 
      },
    });
    if (error) throw error;
  } catch (error: any) {
    errorMsg.value = error.message;
    loading.value = false;
  }
};
</script>

<style scoped>
/* Style tambahan yang diperlukan untuk tombol Google dan pemisah */
.google-button {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  background-color: #ffffff;
  color: #333;
  font-weight: 500;
  padding: 0.75rem 1rem;
  border-radius: 0.5rem;
  border: 1px solid #d1d5db;
  transition: background-color 0.2s;
}
.google-button:hover {
  background-color: #f9fafb;
}
.google-button:disabled {
  opacity: 0.7;
  cursor: not-allowed;
}
.separator {
  display: flex;
  align-items: center;
  text-align: center;
  color: #94a3b8; /* slate-400 */
  margin: 1rem 0;
}
.separator::before,
.separator::after {
  content: "";
  flex: 1;
  border-bottom: 1px solid #475569; /* slate-600 */
}
.separator-text {
  padding: 0 1rem;
  font-size: 0.875rem;
}
.error-banner {
  background-color: #7f1d1d; /* red-900 */
  color: #fecaca; /* red-200 */
  padding: 0.75rem 1rem;
  border-radius: 0.5rem;
  margin-bottom: 1rem;
  font-size: 0.875rem;
  text-align: center;
}
.success-banner {
  background-color: #064e3b; /* green-900 */
  color: #d1fae5; /* green-200 */
  padding: 0.75rem 1rem;
  border-radius: 0.5rem;
  margin-bottom: 1rem;
  font-size: 0.875rem;
  text-align: center;
}
</style>