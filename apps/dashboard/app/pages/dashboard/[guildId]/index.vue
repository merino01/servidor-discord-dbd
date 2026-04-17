<script setup lang="ts">
const route = useRoute()
const guildsStore = useGuildStore()

const { guildId } = route.params
guildsStore.selectGuild(guildId as string)
const guild = computed(() => guildsStore.guilds.find((g) => g.id === guildId))
</script>

<template>
	<div>
		<ClientOnly>
			<h1>Guild seleccionada: {{ guild?.name }}</h1>
		</ClientOnly>
	</div>
</template>
