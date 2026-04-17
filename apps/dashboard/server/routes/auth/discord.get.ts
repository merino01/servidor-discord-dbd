export default defineOAuthDiscordEventHandler({
	config: {
		emailRequired: true,
		scope: ["identify", "guilds", "guilds.members.read"]
	},
	async onSuccess (event, { user, tokens }) {
		await setUserSession(event, {
			user: {
				discordId: user.id,
				username: user.username,
				avatar: user.avatar,
				email: user.email
			},
			secure: { accessToken: tokens.access_token }
		})

		return sendRedirect(event, "/")
	},
	// Optional, will return a json error and 401 status code by default
	onError (event, error) {
		console.error("Discord OAuth error:", error)
		return sendRedirect(event, "/")
	}
})
