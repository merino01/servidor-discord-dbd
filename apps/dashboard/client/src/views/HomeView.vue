<script setup lang="ts">
const crearClan = () => {
	fetch("http://localhost:3005/api/crear-clan", { method: "POST" })
		.then((res) => res.json())
		.then((data) => {
			console.log("API Health:", data)
		})
		.catch((err) => {
			console.error("Error fetching API health:", err)
		})
}
</script>

<template>
  <main>
    <h1>Home</h1>
    <button @click="crearClan">
      Crear Clan
    </button>
  </main>
</template>
