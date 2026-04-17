export const useGuildStore = defineStore("guild", () => {
	const guilds = ref<Guild[]>([])
	const selectedGuild = ref<Guild | null>(null)

	async function fetchGuilds () {
		const { data, status } = await useFetch("/api/discord/guilds")
		if (status.value === "success") {
			guilds.value = data?.value ?? []
		}
	}

	function selectGuild (guildId: string) {
		const guild = guilds.value.find((g) => g.id === guildId) || null
		selectedGuild.value = guild
	}

	return {
		guilds,
		selectedGuild,
		fetchGuilds,
		selectGuild
	}
})
