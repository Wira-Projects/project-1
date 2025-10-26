<template>
  <div class="py-20 md:py-32">
    <div class="container mx-auto px-6 max-w-md">
      <div class="card p-8 rounded-2xl">
        <h1 class="text-center text-3xl font-extrabold mb-6">
          Atur <span class="gradient-text">Password Baru</span>
        </h1>

        <div v-if="successMsg" class="success-banner">
          {{ successMsg }}
        </div>
        <div v-if="errorMsg" class="error-banner">
          {{ errorMsg }}
        </div>

        <form @submit.prevent="handleUpdatePassword" class="mt-4" v-if="!successMsg">
          <div class="mb-4">
            <label
              for="password"
              class="block text-sm font-medium text-slate-300 mb-2"
              >Password Baru</label
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
            {{ loading ? "Memperbarui..." : "Perbarui Password" }}
          </button>
        </form>

        <p class="text-center text-slate-400 mt-6">
          <NuxtLink to="/login" class="font-medium text-cyan-400 hover:text-cyan-300">
            Login Sekarang
          </NuxtLink>
        </p>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from "vue";

useHead({
  title: "Atur Password Baru",
});

const supabase = useSupabaseClient();
const password = ref("");
const confirmPassword = ref("");
const loading = ref(false);
const errorMsg = ref<string | null>(null);
const successMsg = ref<string | null>(null);

const handleUpdatePassword = async () => {
  if (password.value !== confirmPassword.value) {
    errorMsg.value = "Password dan Konfirmasi Password tidak cocok!";
    return;
  }

  loading.value = true;
  errorMsg.value = null;

  try {
    // Fungsi ini akan berfungsi karena pengguna sudah memiliki session sementara (melalui tautan reset)
    const { error } = await supabase.auth.updateUser({
      password: password.value,
    });

    if (error) throw error;

    successMsg.value = "Password Anda berhasil diperbarui! Silakan Login.";
    password.value = "";
    confirmPassword.value = "";
  } catch (error: any) {
    errorMsg.value = error.message;
  } finally {
    loading.value = false;
  }
};
</script>

<style scoped>
/* Gunakan style CSS yang sama dari halaman register/login */
.card { background-color: #1e293b; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1); border: 1px solid #334155; }
.form-input { /* style input kamu */ }
.cta-button { /* style tombol kamu */ }
.error-banner { background-color: #7f1d1d; color: #fecaca; padding: 0.75rem 1rem; border-radius: 0.5rem; margin-bottom: 1rem; text-align: center; }
.success-banner { background-color: #064e3b; color: #d1fae5; padding: 0.75rem 1rem; border-radius: 0.5rem; margin-bottom: 1rem; text-align: center; }
</style>