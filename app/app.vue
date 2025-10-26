<template>
  <NuxtLayout>
    <NuxtPage />
  </NuxtLayout>
</template>

<script setup>
// Menggunakan useHead untuk memasukkan tag <link> ke dalam <head>
useHead({
  link: [
    {
      rel: 'stylesheet',
      // Gunakan CDN Font Awesome
      href: 'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css',
      // Pastikan atribut ini ada agar browser dapat memuatnya
      crossorigin: 'anonymous', 
      // Tambahkan integrity untuk keamanan (opsional tapi disarankan)
      // integrity: 'sha512-xxxxxxxxx', 
    }
  ],
});
</script>