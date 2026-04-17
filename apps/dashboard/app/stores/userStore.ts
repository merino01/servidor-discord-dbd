interface GuildMember {
	avatar: string | null
	user: {
		id: string
		username: string
		avatar: string | null
	}
	nick: string | null
	roles: string[]
}

export const useUserStore = defineStore("user", () => {
	const guildStore = useGuildStore()
	const selectedGuild = computed(() => guildStore.selectedGuild)

	const session = useUserSession()

	watch(
		() => session.loggedIn,
		() => {
			if (!session.loggedIn.value) {
				user.value = null
			}
		}, { immediate: true }
	)

	const user = ref<GuildMember | null>(null)

	async function fetchUser () {
		if (!selectedGuild.value) {
			user.value = null
			return
		}

		const { data, status } = await useFetch(`/api/discord/guild/${selectedGuild.value.id}/me`)
		if (status.value !== "success") {
			return
		}

		user.value = data.value?.member ?? null
	}

	return {
		user,
		fetchUser
	}
})
