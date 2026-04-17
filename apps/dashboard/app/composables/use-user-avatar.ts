// const GUILD_MEMBER_AVATAR_URL = `https://cdn.discordapp.com/guilds/${guildId}/users/${member.user.id}/avatars/${member.avatar}.png`
// const MEMBER_AVATAR_URL = `https://cdn.discordapp.com/avatars/${member.user.id}/${member.user.avatar}.png`

export const useUserAvatar = () => {
	const userStore = useUserStore()
	const guildStore = useGuildStore()
	const session = useUserSession()
	const guildId = computed(() => guildStore.selectedGuild?.id)
	const member = computed(() => userStore.user)

	const avatarUrl = computed(() => {
		if (!member.value) {
			return `https://cdn.discordapp.com/avatars/${session.user.value?.discordId}/${session.user.value?.avatar}.png`
		}

		if (member.value.avatar) {
			return `https://cdn.discordapp.com/guilds/${guildId.value}/users/${member.value.user.id}/avatars/${member.value.avatar}.png`
		}

		if (member.value.user.avatar) {
			return `https://cdn.discordapp.com/avatars/${member.value.user.id}/${member.value.user.avatar}.png`
		}

		return ""
	})

	return {
		avatarUrl
	}
}
