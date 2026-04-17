<script setup lang="ts">
const route = useRoute()
const { guildId, id } = route.params
</script>

<template>
	<div>
		<h1>Clan ID: {{ id }}</h1>
	</div>
</template>
