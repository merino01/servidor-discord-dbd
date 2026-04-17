<script setup lang="ts">
definePageMeta({ layout: false })

const clanName = ref("")

const toast = useToast()
const guildsStore = useGuildStore()

const handleCreateClan = () => {
	if (!guildsStore.selectedGuild) {
		toast.add({
			title: "Selecciona un servidor",
			description: "Debes seleccionar un servidor para crear un clan",
			color: "error"
		})
		return
	}

	$fetch("/api/clanes/create", {
		method: "POST",
		body: {
			name: clanName.value,
			guildId: guildsStore.selectedGuild.id
		}
	})
}

function login () {
	window.location.href = "/auth/discord"
}
</script>

<template>
	<div>
		<UInput v-model="clanName" placeholder="Nombre del clan" />
		<UButton variant="outline" color="primary" @click="handleCreateClan">
			Crear clan
		</UButton>

	  <button @click="login">Login con Discord</button>

		<UButton to="/dashboard">Entrar al dashboard</UButton>
	</div>
</template>
