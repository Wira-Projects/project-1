<template>
  <div class="py-20 md:py-32">
    <div class="container mx-auto px-6 max-w-md">
      <div class="card p-8 rounded-2xl">
        <h1 class="text-center text-3xl font-extrabold mb-6">
          Lupa <span class="gradient-text">Password</span>
        </h1>

        <div v-if="successMsg" class="success-banner">
          {{ successMsg }}
        </div>
        <div v-if="errorMsg" class="error-banner">
          {{ errorMsg }}
        </div>

        <p class="text-center text-slate-400 mb-6" v-if="!successMsg">
          Masukkan alamat email akun Anda. Kami akan mengirimkan tautan untuk mengatur ulang password.
        </p>

        <form @submit.prevent="handleForgotPassword" class="mt-4" v-if="!successMsg">
          <div class="mb-6">
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

          <button
            type="submit"
            :disabled="loading"
            class="cta-button text-white font-bold text-lg py-3 px-6 rounded-lg w-full"
          >
            {{ loading ? "Mengirim..." : "Kirim Tautan Reset" }}
          </button>
        </form>

        <p class="text-center text-slate-400 mt-6">
          <NuxtLink to="/login" class="font-medium text-cyan-400 hover:text-cyan-300">
            Kembali ke Login
          </NuxtLink>
        </p>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from "vue";

useHead({
  title: "Lupa Password",
});

const supabase = useSupabaseClient();

const email = ref("");
const loading = ref(false);
const errorMsg = ref<string | null>(null);
const successMsg = ref<string | null>(null);

const handleForgotPassword = async () => {
  loading.value = true;
  errorMsg.value = null;
  successMsg.value = null;

  // Dapatkan domain saat ini. Ini PENTING untuk tautan reset.
  const origin = window.location.origin;

  try {
    const { error } = await supabase.auth.resetPasswordForEmail(email.value, {
      // ✅ Arahkan pengguna ke halaman di mana mereka akan mengatur password baru
      redirectTo: `${origin}/update-password`,
    });

    if (error) throw error;

    successMsg.value = `Tautan reset password telah dikirim ke ${email.value}. Silakan cek kotak masuk Anda.`;
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