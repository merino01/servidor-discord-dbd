export default defineNuxtRouteMiddleware((to) => {
	if (!to.path.startsWith("/dashboard")) { return }

	const { loggedIn } = useUserSession()

	if (!loggedIn.value) {
		return navigateTo("/")
	}
})
